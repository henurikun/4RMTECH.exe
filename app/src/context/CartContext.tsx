import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { allProducts, type Product } from '../data/products';
import { allComponents } from '../data/pcComponents';
import { useAuth } from './AuthContext';

const STORAGE_KEY = '4rmtech_cart';

export interface CartItem {
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `${STORAGE_KEY}_${user.id}` : `${STORAGE_KEY}_guest`;
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // When user changes (login/logout), reload cart from that user's storage.
  // This keeps "guest cart" separate from the signed-in user's cart.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  const addItem = useCallback((productId: string, quantity = 1, productData?: Product) => {
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
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [storageKey]);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.productId !== productId);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [storageKey]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }
    setItems((prev) => {
      const next = prev.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      );
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [removeItem, storageKey]);

  const getProduct = useCallback((id: string) => {
    const item = items.find((i) => i.productId === id);
    if (item?.productData) return item.productData;

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
          inStock: true
        } as Product;
      }
    }
    return undefined;
  }, [items]);

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const subtotal = useMemo(() => {
    return items.reduce((sum, i) => {
      const p = getProduct(i.productId);
      return sum + (p ? p.price * i.quantity : 0);
    }, 0);
  }, [items, getProduct]);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([]));
    } catch {
      // ignore
    }
  }, [storageKey]);

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
    [items, addItem, removeItem, updateQuantity, getProduct, totalItems, subtotal, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
