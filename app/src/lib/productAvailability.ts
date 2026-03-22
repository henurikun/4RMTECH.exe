import type { Product } from '../data/products';

/** Units available to sell (from DB). Static catalog items without the field are treated as in stock. */
export function getStockQuantity(p: Product): number {
  if (p.stockQuantity != null && p.stockQuantity >= 0) return p.stockQuantity;
  return p.inStock ? 999 : 0;
}

export function isPurchasable(p: Product): boolean {
  return getStockQuantity(p) > 0 && p.inStock;
}

/** Max units a user can add given current cart qty for this product. */
export function maxAddable(p: Product, alreadyInCart: number): number {
  return Math.max(0, getStockQuantity(p) - alreadyInCart);
}
