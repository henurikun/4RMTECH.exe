import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { allProducts, type Product } from '../data/products';
import { api } from '../lib/api';
import { mapApiProductToProduct } from '../lib/productMap';

interface CatalogContextValue {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.products.list();
      const mapped = rows.map((r) => mapApiProductToProduct(r));
      // Empty DB → fall back to static `allProducts` in this provider.
      setRemote(mapped.length > 0 ? mapped : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalog');
      setRemote(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const products = useMemo(() => remote ?? [...allProducts], [remote]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      loading,
      error,
      refetch,
    }),
    [products, loading, error, refetch]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
