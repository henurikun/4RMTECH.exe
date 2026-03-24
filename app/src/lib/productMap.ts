import type { Product } from '../data/products';

/** Shape returned by GET /api/products (Firestore-backed API). */
export type ApiProductRow = {
  id: string;
  sku: string | null;
  name: string;
  description: string;
  category: string;
  imageUrl: string | null;
  priceCents: number;
  originalPriceCents: number | null;
  currency: string;
  inStock: boolean;
  stockQuantity?: number;
  badge?: string | null;
  specs?: Record<string, unknown> | null;
};

export function mapApiProductToProduct(row: ApiProductRow): Product {
  const specsRaw = row.specs;
  const specs: Record<string, string> = {};
  if (specsRaw && typeof specsRaw === 'object' && !Array.isArray(specsRaw)) {
    for (const [k, v] of Object.entries(specsRaw)) {
      if (v != null) specs[k] = String(v);
    }
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Math.round(row.priceCents) / 100,
    originalPrice:
      row.originalPriceCents != null ? Math.round(row.originalPriceCents) / 100 : undefined,
    image: row.imageUrl ?? '/images/laptop_desk.jpg',
    specs,
    description: row.description,
    badge: row.badge ?? undefined,
    inStock: row.inStock,
    stockQuantity: row.stockQuantity ?? 0,
  };
}
