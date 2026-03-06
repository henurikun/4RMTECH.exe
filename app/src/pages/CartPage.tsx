import { Link } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);

export default function CartPage() {
  const { items, getProduct, updateQuantity, removeItem, subtotal, totalItems, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B0C0F]">
        <header className="sticky top-0 z-50 bg-[#0B0C0F]/95 backdrop-blur-md border-b border-white/5">
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#D7FF3B] text-[#0B0C0F] font-medium rounded-full hover:bg-[#e0ff5c] transition-colors"
          >
            Shop products
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C0F]">
      <header className="sticky top-0 z-50 bg-[#0B0C0F]/95 backdrop-blur-md border-b border-white/5">
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
            Clear cart
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
                      <span className="font-['Space_Grotesk'] font-bold text-[#D7FF3B]">
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <p className="text-[#A8ACB8]">
              Subtotal: <span className="font-['Space_Grotesk'] text-xl font-bold text-[#D7FF3B]">{formatCurrency(subtotal)}</span>
            </p>
            <Link
              to="/checkout"
              className="inline-flex justify-center items-center px-8 py-4 bg-[#D7FF3B] text-[#0B0C0F] font-semibold rounded-full hover:bg-[#e0ff5c] transition-colors"
            >
              Proceed to checkout
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
