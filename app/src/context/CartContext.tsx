import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';
import { allProducts, type Product } from '../data/products';
import { allComponents } from '../data/pcComponents';
import { useCatalog } from './CatalogContext';
import { auth } from '../firebase';
import { ensureFirebaseUidMatchesApiUser } from '../lib/firebaseSession';
import { getStockQuantity, isPurchasable, maxAddable } from '../lib/productAvailability';
import {
  addCartItem as fsAddCartItem,
  clearCartItems,
  removeCartItem as fsRemoveCartItem,
  subscribeCartItems,
  updateCartQuantity as fsUpdateCartQuantity,
} from '../lib/firestoreCart';
import type { CartItem } from '../types/cart';
import { useAuth } from './AuthContext';

export type { CartItem };

const GUEST_STORAGE_KEY = '4rmtech_cart_guest';

interface CartContextValue {
  items: CartItem[];
  addItem: (
    productId: string,
    quantity?: number,
    productData?: Product,
    selection?: { selectedGroupItemId?: string; selectedGroupItemIds?: string[] }
  ) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  getProduct: (id: string) => Product | undefined;
  totalItems: number;
  subtotal: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadGuestCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items: CartItem[]) {
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAdminShopper = user?.role === 'ADMIN';
  const { products: catalogProducts } = useCatalog();
  const [items, setItems] = useState<CartItem[]>(() => loadGuestCart());
  const optimisticAddedRef = useRef<Map<string, { item: CartItem; ts: number }>>(new Map());
  const hasReceivedSnapshotRef = useRef(false);
  const OPTIMISTIC_TTL_MS = 30000; // keep optimistic items during transient auth/Firestore empty snapshots

  const resolveLocalProduct = useCallback((id: string): Product | undefined => {
    let p = catalogProducts.find((x) => x.id === id);
    if (p) return p;
    p = allProducts.find((x) => x.id === id);
    if (p) return p;

    for (const cat of Object.values(allComponents)) {
      const comp = cat.find((c) => c.id === id);
      if (comp) {
        return {
          id: comp.id,
          name: comp.name,
          category: comp.category,
          price: comp.price,
          image: comp.image,
          specs: comp.specs,
          description: comp.description,
          inStock: true,
        } as Product;
      }
    }
    return undefined;
  }, [catalogProducts]);

  const getProduct = useCallback(
    (id: string) => {
      const item = items.find((i) => i.productId === id);
      if (item?.productData) return item.productData;
      return resolveLocalProduct(id);
    },
    [items, resolveLocalProduct]
  );

  useEffect(() => {
    if (!user) {
      // Don't wipe cart while Firebase Auth is still present but the API user object is momentarily missing.
      // This prevents "cart cleared a few seconds after adding" during auth/session refresh.
      if (auth.currentUser) return;
      setItems(loadGuestCart());
      return;
    }

    let unsubCart: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      unsubCart?.();
      unsubCart = undefined;
      if (!fbUser || fbUser.uid !== user.id) {
        // Avoid clearing cart during transient auth refresh states.
        return;
      }
      unsubCart = subscribeCartItems(
        user.id,
        (next) => {
          const now = Date.now();
          const optimisticById = optimisticAddedRef.current;

          // Remove expired optimistic entries.
          optimisticById.forEach((v, pid) => {
            if (now - v.ts > OPTIMISTIC_TTL_MS) optimisticById.delete(pid);
          });

          setItems((prev) => {
            // After we've loaded at least once from Firestore, treat an empty snapshot as a likely transient state.
            // This prevents the cart from clearing in the next couple seconds while auth/session refresh completes.
            if (
              next.length === 0 &&
              hasReceivedSnapshotRef.current &&
              prev.length > 0 &&
              optimisticById.size > 0
            ) {
              const prevById = new Set(prev.map((i) => i.productId));
              const mergedFromPrev = [...prev];
              optimisticById.forEach((v, pid) => {
                if (prevById.has(pid)) optimisticById.delete(pid);
                else mergedFromPrev.push(v.item);
              });
              return mergedFromPrev;
            }

            hasReceivedSnapshotRef.current = true;

            const merged: CartItem[] = [...next];
            const mergedById = new Map(merged.map((i) => [i.productId, i] as const));

            // If Firestore snapshot doesn't include an item we optimistically added, re-inject it.
            // If the snapshot includes it, we trust Firestore and drop the optimistic entry.
            optimisticById.forEach((v, pid) => {
              if (mergedById.has(pid)) {
                optimisticById.delete(pid);
                return;
              }
              merged.push(v.item);
            });

            return merged;
          });
        },
        () => {}
      );
    });

    return () => {
      unsubAuth();
      unsubCart?.();
    };
  }, [user]);

  const addItem = useCallback(
    (
      productId: string,
      quantity = 1,
      productData?: Product,
      selection?: { selectedGroupItemId?: string; selectedGroupItemIds?: string[] }
    ) => {
      if (isAdminShopper) {
        toast.error('Administrator accounts cannot add items to the cart.');
        return;
      }

      const resolved = productData ?? resolveLocalProduct(productId);
      if (!resolved || !isPurchasable(resolved)) {
        toast.error('This item is out of stock.');
        return;
      }

      if (user) {
        const alreadyInCart = items.some((i) => i.productId === productId);
        if (alreadyInCart) {
          toast.message('Item is already in your cart.');
          return;
        }

        const qtyInCart = items.find((i) => i.productId === productId)?.quantity ?? 0;
        const maxA = maxAddable(resolved, qtyInCart);
        if (maxA <= 0) {
          toast.error('No more stock available for this item.');
          return;
        }

        const addQty = Math.min(quantity, maxA);
        if (addQty < quantity) {
          toast.message('Quantity limited by available stock.', {
            description: `Added ${addQty} instead of ${quantity}.`,
          });
        }

        // Optimistic UI update: update cart immediately so UI doesn't wait for Firestore snapshot.
        const optimisticItem: CartItem = {
          productId,
          quantity: addQty,
          productData: resolved,
          selectedGroupItemId: selection?.selectedGroupItemId,
          selectedGroupItemIds: selection?.selectedGroupItemIds,
        };
        optimisticAddedRef.current.set(productId, { item: optimisticItem, ts: Date.now() });
        setItems((prev) => {
          if (prev.some((i) => i.productId === productId)) return prev;
          return [
            ...prev,
            optimisticItem,
          ];
        });

        void (async () => {
          const ok = await ensureFirebaseUidMatchesApiUser(user.id);
          if (!ok) {
            optimisticAddedRef.current.delete(productId);
            setItems((prev) => prev.filter((i) => i.productId !== productId));
            toast.error('Cart sync not ready yet. Please try again.');
            return;
          }
          try {
            await fsAddCartItem(user.id, productId, addQty, resolved, selection);
          } catch (e) {
            optimisticAddedRef.current.delete(productId);
            setItems((prev) => prev.filter((i) => i.productId !== productId));
            // Bubble up the real Firestore error (permission, invalid doc id, offline, etc.)
            // eslint-disable-next-line no-console
            console.error('[cart] addCartItem failed', e);
            const msg =
              e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string'
                ? String((e as any).message)
                : 'Please try again.';
            toast.error(`Failed to add item to cart. ${msg}`);
          }
        })();
        return;
      }

      setItems((prev) => {
        const existing = prev.find((i) => i.productId === productId);
        if (existing) {
          toast.message('Item is already in your cart.');
          return prev;
        }
        const qtyInCart = prev.find((i) => i.productId === productId)?.quantity ?? 0;
        const maxA = maxAddable(resolved, qtyInCart);
        if (maxA <= 0) {
          toast.error('No more stock available for this item.');
          return prev;
        }
        const addQty = Math.min(quantity, maxA);
        if (addQty < quantity) {
          toast.message('Quantity limited by available stock.', {
            description: `Added ${addQty} instead of ${quantity}.`,
          });
        }
        const next: CartItem[] = [
          ...prev,
          {
            productId,
            quantity: addQty,
            productData: resolved,
            selectedGroupItemId: selection?.selectedGroupItemId,
            selectedGroupItemIds: selection?.selectedGroupItemIds,
          },
        ];
        saveGuestCart(next);
        return next;
      });
    },
    [isAdminShopper, items, resolveLocalProduct, user]
  );

  const removeItem = useCallback(
    (productId: string) => {
      if (user) {
        const removedItem = items.find((i) => i.productId === productId);
        if (!removedItem) return;

        // Optimistic UI removal; rollback if Firestore remove fails.
        optimisticAddedRef.current.delete(productId);
        setItems((prev) => prev.filter((i) => i.productId !== productId));

        void (async () => {
          const ok = await ensureFirebaseUidMatchesApiUser(user.id);
          if (!ok) {
            setItems((prev) => (prev.some((i) => i.productId === productId) ? prev : [...prev, removedItem]));
            toast.error('Cart sync not ready yet. Please try again.');
            return;
          }
          try {
            await fsRemoveCartItem(user.id, productId);
          } catch {
            setItems((prev) => (prev.some((i) => i.productId === productId) ? prev : [...prev, removedItem]));
            toast.error('Failed to remove item from cart. Please try again.');
          }
        })();
        return;
      }

      setItems((prev) => {
        const next = prev.filter((i) => i.productId !== productId);
        saveGuestCart(next);
        return next;
      });
    },
    [items, user]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      const resolved = resolveLocalProduct(productId) ?? getProduct(productId);
      const max = resolved ? getStockQuantity(resolved) : 999;
      const clamped = Math.min(quantity, max);

      if (quantity > max && max >= 0) {
        toast.message('Quantity adjusted to available stock.');
      }

      if (user) {
        void (async () => {
          const ok = await ensureFirebaseUidMatchesApiUser(user.id);
          if (!ok) return;
          try {
            if (clamped < 1) {
              await fsRemoveCartItem(user.id, productId);
            } else {
              await fsUpdateCartQuantity(user.id, productId, clamped);
            }
          } catch {
            // ignore
          }
        })();
        return;
      }

      if (clamped < 1) {
        removeItem(productId);
        return;
      }

      setItems((prev) => {
        const next = prev.map((i) => (i.productId === productId ? { ...i, quantity: clamped } : i));
        saveGuestCart(next);
        return next;
      });
    },
    [getProduct, removeItem, resolveLocalProduct, user]
  );

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, i) => {
      const p = getProduct(i.productId);
      return sum + (p ? p.price * i.quantity : 0);
    }, 0);
  }, [getProduct, items]);

  const clearCart = useCallback(() => {
    if (user) {
      void (async () => {
        const ok = await ensureFirebaseUidMatchesApiUser(user.id);
        if (!ok) {
          setItems([]);
          return;
        }
        try {
          await clearCartItems(user.id);
        } catch {
          setItems([]);
        }
      })();
      return;
    }
    setItems([]);
    saveGuestCart([]);
  }, [user]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      getProduct,
      totalItems,
      subtotal,
      clearCart,
    }),
    [addItem, clearCart, getProduct, items, removeItem, subtotal, totalItems, updateQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
