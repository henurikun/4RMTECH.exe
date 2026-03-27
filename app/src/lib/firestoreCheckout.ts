import { collection, doc, getDocs, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../data/products';
import { ensureFirebaseUidMatchesApiUser } from './firebaseSession';
import { FIRESTORE_CART_ITEMS, FIRESTORE_ORDERS, FIRESTORE_USERS } from './firestorePaths';

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined) as unknown as T;
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out as unknown as T;
  }

  return value;
}

export type PlaceOrderInput = {
  customer: { name: string; email: string; phone: string; address: string };
};

type DirectOrderLine = {
  productId: string;
  quantity: number;
  unitPrice: number;
  name: string;
  image?: string;
  kind?: 'product' | 'group';
  groupType?: 'variant' | 'set';
  selectedGroupItemId?: string;
  selectedGroupItemName?: string;
  groupItems?: Array<{ productId: string; qtyPerSet?: number }>;
};

export async function placeOrderFirebase(
  uid: string,
  input: PlaceOrderInput,
  getProduct: (id: string) => Product | undefined
) {
  const sessionOk = await ensureFirebaseUidMatchesApiUser(uid);
  if (!sessionOk) {
    throw new Error(
      'Firebase is not signed in with your account. Ensure the API can mint custom tokens (server env) and try logging in again.'
    );
  }

  const itemsCol = collection(db, FIRESTORE_USERS, uid, FIRESTORE_CART_ITEMS);
  const cartSnap = await getDocs(itemsCol);
  if (cartSnap.empty) {
    throw new Error('Cart is empty');
  }

  const lineItems: {
    productId: string;
    quantity: number;
    unitPrice: number;
    name: string;
    image?: string;
    kind?: 'product' | 'group';
    groupType?: 'variant' | 'set';
    selectedGroupItemId?: string;
    selectedGroupItemName?: string;
    groupItems?: Array<{ productId: string; qtyPerSet?: number }>;
  }[] = [];

  let subtotal = 0;
  for (const d of cartSnap.docs) {
    const data = d.data() as { quantity?: number; productSnapshot?: { name?: string; price?: number; image?: string } };
    const productId = d.id;
    const quantity = Number(data.quantity ?? 0);
    if (quantity < 1) continue;

    const fromCart = getProduct(productId);
    const name = fromCart?.name ?? data.productSnapshot?.name ?? productId;
    const unitPrice = fromCart?.price ?? Number(data.productSnapshot?.price ?? 0);
    const image = fromCart?.image ?? data.productSnapshot?.image;

    subtotal += unitPrice * quantity;
    lineItems.push({
      productId,
      quantity,
      unitPrice,
      name,
      image,
      kind: fromCart?.kind ?? 'product',
      groupType: fromCart?.groupType,
      selectedGroupItemId: fromCart?.selectedGroupItemId,
      selectedGroupItemName:
        fromCart?.groupItems?.find((item) => item.productId === fromCart?.selectedGroupItemId)?.name,
      groupItems: fromCart?.groupItems?.map((item) => ({
        productId: item.productId,
        qtyPerSet: item.qtyPerSet ?? 1,
      })),
    });
  }

  if (lineItems.length === 0) {
    throw new Error('Cart is empty');
  }

  const shipping = subtotal > 0 ? 99 : 0;
  const total = subtotal + shipping;
  const orderNumber = `ORD-${Date.now()}`;
  const newOrderRef = doc(collection(db, FIRESTORE_ORDERS));

  const batch = writeBatch(db);
  const safeLineItems = stripUndefinedDeep(lineItems);
  batch.set(newOrderRef, {
    userId: uid,
    orderNumber,
    customer: input.customer,
    items: safeLineItems,
    subtotal,
    shipping,
    total,
    currency: 'PHP',
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    paymentFlow: null,
    onlineChannel: null,
    createdAt: serverTimestamp(),
  });
  cartSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return {
    order: {
      id: newOrderRef.id,
      orderNumber,
    },
  };
}

export async function placeOrderDirectFirebase(uid: string, input: PlaceOrderInput, lines: DirectOrderLine[]) {
  const sessionOk = await ensureFirebaseUidMatchesApiUser(uid);
  if (!sessionOk) {
    throw new Error(
      'Firebase is not signed in with your account. Ensure the API can mint custom tokens (server env) and try logging in again.'
    );
  }

  const lineItems = lines
    .map((line) => ({
      productId: line.productId,
      quantity: Math.max(1, Number(line.quantity ?? 1)),
      unitPrice: Math.max(0, Number(line.unitPrice ?? 0)),
      name: line.name || line.productId,
      image: line.image,
      kind: line.kind ?? 'product',
      groupType: line.groupType,
      selectedGroupItemId: line.selectedGroupItemId,
      selectedGroupItemName: line.selectedGroupItemName,
      groupItems: line.groupItems,
    }))
    .filter((line) => line.productId);

  if (lineItems.length === 0) {
    throw new Error('No items to order');
  }

  const subtotal = lineItems.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const shipping = subtotal > 0 ? 99 : 0;
  const total = subtotal + shipping;
  const orderNumber = `ORD-${Date.now()}`;
  const newOrderRef = doc(collection(db, FIRESTORE_ORDERS));

  await writeBatch(db)
    .set(newOrderRef, {
      userId: uid,
      orderNumber,
      customer: input.customer,
      items: stripUndefinedDeep(lineItems),
      subtotal,
      shipping,
      total,
      currency: 'PHP',
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      paymentFlow: null,
      onlineChannel: null,
      createdAt: serverTimestamp(),
    })
    .commit();

  return {
    order: {
      id: newOrderRef.id,
      orderNumber,
    },
  };
}

export type PaymentFlow = 'cod' | 'online';

/** Confirms payment path after the order exists (COD or online channel + QR). */
export async function createPaymentFirebase(
  orderId: string,
  paymentFlow: PaymentFlow,
  uid: string,
  onlineChannel?: string,
  receiptUrl?: string | null
) {
  const sessionOk = await ensureFirebaseUidMatchesApiUser(uid);
  if (!sessionOk) {
    throw new Error(
      'Firebase is not signed in with your account. Ensure the API can mint custom tokens (server env) and try logging in again.'
    );
  }

  const ref = doc(db, FIRESTORE_ORDERS, orderId);
  const isOnline = paymentFlow === 'online';
  await updateDoc(ref, {
    paymentFlow,
    onlineChannel: paymentFlow === 'online' ? (onlineChannel ?? null) : null,
    paymentMethod: paymentFlow === 'cod' ? 'COD' : 'ONLINE',
    paymentReceiptUrl: isOnline ? (receiptUrl ?? null) : null,
    // Online payments require manual verification (QR/bank transfer).
    paymentStatus: isOnline ? 'PENDING' : 'PENDING',
    paymentConfirmedAt: null,
    status: isOnline ? 'VERIFICATION_PENDING' : 'PENDING',
    updatedAt: serverTimestamp(),
  });
}
