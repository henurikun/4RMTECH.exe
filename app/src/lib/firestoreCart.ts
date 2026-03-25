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

export type ProductSnapshot = {
  name: string;
  category: string;
  price: number;
  image?: string;
  description?: string;
};

function cartItemsCollection(uid: string) {
  return collection(db, FIRESTORE_USERS, uid, FIRESTORE_CART_ITEMS);
}

function mapDocToCartItem(productId: string, data: Record<string, unknown>): CartItem {
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
        inStock: true,
      }
    : undefined;

  return {
    id: productId,
    productId,
    quantity: Number(data.quantity ?? 0),
    productData,
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
  product?: Product
) {
  const ref = doc(db, FIRESTORE_USERS, uid, FIRESTORE_CART_ITEMS, productId);
  const snapshot: ProductSnapshot | undefined = product
    ? {
        name: product.name,
        category: product.category,
        price: product.price,
        image: product.image,
        description: product.description,
      }
    : undefined;

  await runTransaction(db, async (transaction) => {
    const cur = await transaction.get(ref);
    if (cur.exists()) return;
    const prevSnap = cur.exists() ? (cur.data().productSnapshot as ProductSnapshot | undefined) : undefined;
    transaction.set(ref, {
      productId,
      quantity,
      productSnapshot: snapshot ?? prevSnap ?? null,
    });
  });
}

export async function removeCartItem(uid: string, productId: string) {
  await deleteDoc(doc(db, FIRESTORE_USERS, uid, FIRESTORE_CART_ITEMS, productId));
}

export async function updateCartQuantity(uid: string, productId: string, quantity: number) {
  if (quantity < 1) {
    await removeCartItem(uid, productId);
    return;
  }
  const ref = doc(db, FIRESTORE_USERS, uid, FIRESTORE_CART_ITEMS, productId);
  await runTransaction(db, async (transaction) => {
    const cur = await transaction.get(ref);
    if (!cur.exists()) return;
    transaction.update(ref, { quantity });
  });
}

export async function clearCartItems(uid: string) {
  const snap = await getDocs(cartItemsCollection(uid));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
