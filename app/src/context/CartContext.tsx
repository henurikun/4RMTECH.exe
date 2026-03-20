import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { allProducts, type Product } from '../data/products';
import { allComponents } from '../data/pcComponents';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const GUEST_STORAGE_KEY = '4rmtech_cart_guest';

export interface CartItem {
  // Present when user is logged in (DB cart item id)
  id?: string;
  productId: string;
  quantity: number;
  productData?: Product;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (productId: string, quantity?: number, productData?: Product) => void;
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

function mapApiProductToProduct(apiProduct: any): Product {
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    category: apiProduct.category,
    price: Math.round((apiProduct.priceCents ?? 0) / 100),
    image: apiProduct.imageUrl ?? '/images/laptop_desk.jpg',
    specs: {},
    description: apiProduct.description ?? '',
    inStock: Boolean(apiProduct.inStock ?? true),
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => loadGuestCart());

  const resolveLocalProduct = useCallback((id: string): Product | undefined => {
    let p = allProducts.find((p) => p.id === id);
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
  }, []);

  const getProduct = useCallback(
    (id: string) => {
      const item = items.find((i) => i.productId === id);
      if (item?.productData) return item.productData;
      return resolveLocalProduct(id);
    },
    [items, resolveLocalProduct]
  );

  const syncAuthedCart = useCallback(async () => {
    const data = await api.cart.get();
    const mapped: CartItem[] = data.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      productData: mapApiProductToProduct(i.product),
    }));
    setItems(mapped);
  }, []);

  useEffect(() => {
    if (!user) {
      setItems(loadGuestCart());
      return;
    }
    syncAuthedCart().catch(() => setItems([]));
  }, [syncAuthedCart, user]);

  const addItem = useCallback(
    (productId: string, quantity = 1, productData?: Product) => {
      if (user) {
        const resolved = productData ?? resolveLocalProduct(productId);
        api.cart
          .add({
            productId,
            quantity,
            product: resolved
              ? {
                  name: resolved.name,
                  category: resolved.category,
                  price: resolved.price,
                  image: resolved.image,
                  description: resolved.description,
                }
              : undefined,
          })
          .then(() => syncAuthedCart())
          .catch(() => {});
        return;
      }

      setItems((prev) => {
        const existing = prev.find((i) => i.productId === productId);
        let next: CartItem[];
        if (existing) {
          next = prev.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i
          );
        } else {
          next = [...prev, { productId, quantity, productData }];
        }
        saveGuestCart(next);
        return next;
      });
    },
    [resolveLocalProduct, syncAuthedCart, user]
  );

  const removeItem = useCallback(
    (productId: string) => {
      if (user) {
        const item = items.find((i) => i.productId === productId);
        if (!item?.id) return;
        api.cart
          .remove(item.id)
          .then(() => syncAuthedCart())
          .catch(() => {});
        return;
      }

      setItems((prev) => {
        const next = prev.filter((i) => i.productId !== productId);
        saveGuestCart(next);
        return next;
      });
    },
    [items, syncAuthedCart, user]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (user) {
        const item = items.find((i) => i.productId === productId);
        if (!item?.id) return;

        if (quantity < 1) {
          api.cart
            .remove(item.id)
            .then(() => syncAuthedCart())
            .catch(() => {});
          return;
        }

        api.cart
          .update(item.id, { quantity })
          .then(() => syncAuthedCart())
          .catch(() => {});
        return;
      }

      if (quantity < 1) {
        removeItem(productId);
        return;
      }

      setItems((prev) => {
        const next = prev.map((i) => (i.productId === productId ? { ...i, quantity } : i));
        saveGuestCart(next);
        return next;
      });
    },
    [items, removeItem, syncAuthedCart, user]
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
      api.cart
        .clear()
        .then(() => syncAuthedCart())
        .catch(() => setItems([]));
      return;
    }
    setItems([]);
    saveGuestCart([]);
  }, [syncAuthedCart, user]);

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
