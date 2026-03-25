import { Link } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { getStockQuantity, isPurchasable } from '../lib/productAvailability';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);

export default function CartPage() {
  const { items, getProduct, updateQuantity, removeItem, subtotal, totalItems, clearCart } = useCart();
  const { products: catalogProducts } = useCatalog();
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-[#F4F6FA]">Cart disabled for admin</h1>
          <p className="text-[#A8ACB8]">Administrator accounts cannot place customer orders.</p>
          <Link to="/admin" className="inline-flex px-6 py-3 rounded-full bg-[#FFD700] text-[#070A15] font-semibold">
            Open inventory
          </Link>
        </div>
      </div>
    );
  }

  const stockIssues = items
    .map((item) => {
      const cartProduct = getProduct(item.productId);
      const live = catalogProducts.find((p) => p.id === item.productId);
      const product = live ?? cartProduct;
      if (!product) {
        return { productId: item.productId, message: `Item "${item.productId}" is no longer available.` };
      }
      if (!isPurchasable(product)) {
        return { productId: item.productId, message: `${product.name} is out of stock.` };
      }
      const stock = getStockQuantity(product);
      if (item.quantity > stock) {
        return {
          productId: item.productId,
          message: `${product.name} has only ${stock} in stock, but ${item.quantity} is in your cart.`,
        };
      }
      return null;
    })
    .filter(Boolean) as { productId: string; message: string }[];

  const canCheckout = stockIssues.length === 0;

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-50 bg-[#070A15]/85 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between px-6 lg:px-12 py-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </Link>
            <h1 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">Cart</h1>
          </div>
        </header>
        <main className="px-6 lg:px-12 py-24 text-center">
          <p className="text-[#A8ACB8] text-lg mb-6">Your cart is empty.</p>
          <Link
            to="/category/devices"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFD700] text-[#070A15] font-medium rounded-full hover:bg-[#ffe44d] transition-colors"
          >
            Shop products
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-[#070A15]/85 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-6 lg:px-12 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <h1 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">
            Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </h1>
          <button
            type="button"
            onClick={clearCart}
            className="text-sm text-[#A8ACB8] hover:text-red-400 transition-colors"
          >
            Clear All
          </button>
        </div>
      </header>

      <main className="px-6 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {items.map((item) => {
            const product = getProduct(item.productId);
            if (!product) return null;
            return (
              <div
                key={item.productId}
                className="flex gap-4 lg:gap-6 p-4 rounded-2xl bg-[#111318] border border-white/5"
              >
                <div className="flex-shrink-0 w-24 h-24 lg:w-28 lg:h-28 rounded-xl overflow-hidden bg-white/5">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-['Space_Grotesk'] font-semibold text-[#F4F6FA] truncate">
                    {product.name}
                  </h3>
                  <p className="text-sm text-[#A8ACB8] mt-0.5">{product.category}</p>
                  {!isPurchasable(catalogProducts.find((p) => p.id === item.productId) ?? product) && (
                    <p className="text-xs text-red-400 mt-1">Out of stock</p>
                  )}
                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#F4F6FA] flex items-center justify-center"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-mono text-sm text-[#F4F6FA] w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#F4F6FA] flex items-center justify-center"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-['Space_Grotesk'] font-bold text-[#FFD700]">
                        {formatCurrency(product.price * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="p-2 rounded-full text-[#A8ACB8] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-4xl mx-auto mt-10 pt-6 border-t border-white/10">
          {stockIssues.length > 0 && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm font-semibold text-red-300 mb-2">Please fix these stock issues before checkout:</p>
              <ul className="space-y-1">
                {stockIssues.map((issue) => (
                  <li key={issue.productId} className="text-sm text-red-200">
                    - {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <p className="text-[#A8ACB8]">
              Subtotal: <span className="font-['Space_Grotesk'] text-xl font-bold text-[#FFD700]">{formatCurrency(subtotal)}</span>
            </p>
            {canCheckout ? (
              <Link
                to="/checkout"
                className="inline-flex justify-center items-center px-8 py-4 bg-[#FFD700] text-[#070A15] font-semibold rounded-full hover:bg-[#ffe44d] transition-colors"
              >
                Proceed to checkout
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex justify-center items-center px-8 py-4 bg-white/10 text-[#A8ACB8] font-semibold rounded-full cursor-not-allowed"
              >
                Resolve stock issues
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
