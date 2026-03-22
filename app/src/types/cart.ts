import type { Product } from '../data/products';

export interface CartItem {
  id?: string;
  productId: string;
  quantity: number;
  productData?: Product;
}
