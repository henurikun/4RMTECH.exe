import type { Product } from '../data/products';

/** Shape returned by GET /api/products (Firestore-backed API). */
export type ApiProductRow = {
  id: string;
  kind?: 'product' | 'group';
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
  groupType?: 'variant' | 'set' | null;
  groupItems?: Array<{
    productId: string;
    qtyPerSet?: number;
    sortOrder?: number;
    name?: string;
    image?: string;
    description?: string;
    price?: number;
  }>;
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
    kind: row.kind ?? 'product',
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
    groupType: row.groupType ?? undefined,
    groupItems: row.groupItems ?? undefined,
  };
}
