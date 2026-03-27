import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../data/products';
import type { CartItem } from '../types/cart';
import { FIRESTORE_CART_ITEMS, FIRESTORE_USERS } from './firestorePaths';

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

export type ProductSnapshot = {
  name: string;
  category: string;
  price: number;
  image?: string;
  description?: string;
  kind?: 'product' | 'group';
  groupType?: 'variant' | 'set';
  groupItems?: Array<{
    productId: string;
    qtyPerSet?: number;
    sortOrder?: number;
    name?: string;
    image?: string;
    description?: string;
  }>;
  selectedGroupItemId?: string;
  selectedGroupItemIds?: string[];
};

function cartItemsCollection(uid: string) {
  return collection(db, FIRESTORE_USERS, uid, FIRESTORE_CART_ITEMS);
}

function cartDocId(productId: string) {
  // Firestore document IDs cannot contain '/' because it becomes a path separator.
  // Encode to keep cart functional for any product/group IDs.
  return encodeURIComponent(productId);
}

function cartDocRef(uid: string, productId: string) {
  return doc(db, FIRESTORE_USERS, uid, FIRESTORE_CART_ITEMS, cartDocId(productId));
}

function legacyCartDocRef(uid: string, productId: string) {
  // Backward compat: older carts used raw productId as the document id.
  return doc(db, FIRESTORE_USERS, uid, FIRESTORE_CART_ITEMS, productId);
}

function mapDocToCartItem(docId: string, data: Record<string, unknown>): CartItem {
  const productId =
    typeof data.productId === 'string'
      ? String(data.productId)
      : (() => {
          try {
            return decodeURIComponent(docId);
          } catch {
            return docId;
          }
        })();

  const snap = data.productSnapshot as ProductSnapshot | undefined;
  const productData: Product | undefined = snap
    ? {
        id: productId,
        name: snap.name,
        category: snap.category,
        price: snap.price,
        image: snap.image ?? '/images/laptop_desk.jpg',
        specs: {},
        description: snap.description ?? '',
        kind: snap.kind ?? 'product',
        groupType: snap.groupType,
        groupItems: snap.groupItems,
        selectedGroupItemId: snap.selectedGroupItemId,
        selectedGroupItemIds: snap.selectedGroupItemIds,
        inStock: true,
      }
    : undefined;

  return {
    id: productId,
    productId,
    quantity: Number(data.quantity ?? 0),
    productData,
    selectedGroupItemId:
      typeof data.selectedGroupItemId === 'string' ? (data.selectedGroupItemId as string) : undefined,
    selectedGroupItemIds: Array.isArray(data.selectedGroupItemIds)
      ? (data.selectedGroupItemIds as string[])
      : undefined,
  };
}

export function subscribeCartItems(
  uid: string,
  onItems: (items: CartItem[]) => void,
  onError?: (e: Error) => void
) {
  const col = cartItemsCollection(uid);
  return onSnapshot(
    col,
    (snapshot) => {
      const items: CartItem[] = snapshot.docs.map((d) => mapDocToCartItem(d.id, d.data() as Record<string, unknown>));
      onItems(items);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

export async function addCartItem(
  uid: string,
  productId: string,
  quantity: number,
  product?: Product,
  selection?: { selectedGroupItemId?: string; selectedGroupItemIds?: string[] }
) {
  const ref = cartDocRef(uid, productId);
  const legacyRef = legacyCartDocRef(uid, productId);
  const snapshot: ProductSnapshot | undefined = product
    ? {
        name: product.name,
        category: product.category,
        price: product.price,
        image: product.image,
        description: product.description,
        kind: product.kind ?? 'product',
        groupType: product.groupType,
        groupItems: product.groupItems,
        selectedGroupItemId: selection?.selectedGroupItemId,
        selectedGroupItemIds: selection?.selectedGroupItemIds,
      }
    : undefined;
  const safeSnapshot = snapshot ? stripUndefinedDeep(snapshot) : undefined;

  await runTransaction(db, async (transaction) => {
    const cur = await transaction.get(ref);
    const legacy = await transaction.get(legacyRef);
    if (cur.exists() || legacy.exists()) return;
    const prevSnap = cur.exists()
      ? (cur.data().productSnapshot as ProductSnapshot | undefined)
      : legacy.exists()
        ? (legacy.data().productSnapshot as ProductSnapshot | undefined)
        : undefined;
    transaction.set(ref, {
      productId,
      quantity,
      productSnapshot: safeSnapshot ?? prevSnap ?? null,
      selectedGroupItemId: selection?.selectedGroupItemId ?? null,
      selectedGroupItemIds: selection?.selectedGroupItemIds ?? null,
    });
  });
}

export async function removeCartItem(uid: string, productId: string) {
  // Try both encoded and legacy doc ids.
  await Promise.allSettled([deleteDoc(cartDocRef(uid, productId)), deleteDoc(legacyCartDocRef(uid, productId))]);
}

export async function updateCartQuantity(uid: string, productId: string, quantity: number) {
  if (quantity < 1) {
    await removeCartItem(uid, productId);
    return;
  }

  const ref = cartDocRef(uid, productId);
  const legacyRef = legacyCartDocRef(uid, productId);
  await runTransaction(db, async (transaction) => {
    const cur = await transaction.get(ref);
    if (cur.exists()) {
      transaction.update(ref, { quantity });
      return;
    }
    const legacy = await transaction.get(legacyRef);
    if (!legacy.exists()) return;
    transaction.update(legacyRef, { quantity });
  });
}

export async function clearCartItems(uid: string) {
  const snap = await getDocs(cartItemsCollection(uid));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
