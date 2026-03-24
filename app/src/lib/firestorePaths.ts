/**
 * Firestore layout (Console → Firestore Database):
 *
 * - Collection `users` — each **document id** is Firebase Auth `uid`.
 *   - Subcollection `cartItems` — document id = **product id** (line items).
 * - Collection `orders` — each document is one order; fields include `userId`, `orderNumber`, etc.
 *
 * There is no top-level “items” collection; cart lines live under `users/{userId}/cartItems`.
 */
export const FIRESTORE_USERS = 'users';
export const FIRESTORE_CART_ITEMS = 'cartItems';
export const FIRESTORE_ORDERS = 'orders';
