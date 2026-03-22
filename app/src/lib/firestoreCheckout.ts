import { collection, doc, getDocs, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../data/products';
import { ensureFirebaseUidMatchesApiUser } from './firebaseSession';
import { FIRESTORE_CART_ITEMS, FIRESTORE_ORDERS, FIRESTORE_USERS } from './firestorePaths';

export type PlaceOrderInput = {
  customer: { name: string; email: string; phone: string; address: string };
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
  batch.set(newOrderRef, {
    userId: uid,
    orderNumber,
    customer: input.customer,
    items: lineItems,
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

export type PaymentFlow = 'cod' | 'online';

/** Confirms payment path after the order exists (COD or online channel + QR). */
export async function createPaymentFirebase(
  orderId: string,
  paymentFlow: PaymentFlow,
  uid: string,
  onlineChannel?: string
) {
  const sessionOk = await ensureFirebaseUidMatchesApiUser(uid);
  if (!sessionOk) {
    throw new Error(
      'Firebase is not signed in with your account. Ensure the API can mint custom tokens (server env) and try logging in again.'
    );
  }

  const ref = doc(db, FIRESTORE_ORDERS, orderId);
  await updateDoc(ref, {
    paymentFlow,
    onlineChannel: paymentFlow === 'online' ? (onlineChannel ?? null) : null,
    paymentMethod: paymentFlow === 'cod' ? 'COD' : 'ONLINE',
    paymentStatus: 'PENDING',
    status: 'PENDING',
    updatedAt: serverTimestamp(),
  });
}
