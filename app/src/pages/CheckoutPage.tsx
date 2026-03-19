import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CreditCard, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';

const ORDERS_STORAGE_KEY = '4rmtech_orders';

type PaymentMethod = 'cod' | 'gcash';

interface Order {
  id: string;
  createdAt: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  paymentMethod: PaymentMethod;
  items: { productId: string; quantity: number; price: number }[];
  subtotal: number;
  shipping: number;
  total: number;
  status: 'paid' | 'pending';
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);

function saveOrder(order: Order) {
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    const list: Order[] = raw ? JSON.parse(raw) : [];
    list.unshift(order);
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getProduct, subtotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const shipping = useMemo(() => (subtotal > 0 ? 99 : 0), [subtotal]);
  const total = useMemo(() => subtotal + shipping, [subtotal, shipping]);

  if (items.length === 0 && !successOrderId) {
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
              Checkout
            </h1>
          </div>
        </header>
        <main className="px-6 lg:px-12 py-24 text-center">
          <p className="text-[#A8ACB8] text-lg mb-6">
            Nothing to checkout — your cart is empty.
          </p>
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

  const placeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();

    if (!name || !email || !phone || !address) {
      setError('Please complete shipping details.');
      return;
    }

    const id = `ORD-${Date.now()}`;
    const order: Order = {
      id,
      createdAt: Date.now(),
      customer: { name, email, phone, address },
      paymentMethod,
      items: items
        .map((i) => {
          const p = getProduct(i.productId);
          if (!p) return null;
          return { productId: i.productId, quantity: i.quantity, price: p.price };
        })
        .filter(Boolean) as Order['items'],
      subtotal,
      shipping,
      total,
      status: 'pending',
    };

    saveOrder(order);
    clearCart();
    setSuccessOrderId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // optional: navigate user after a moment
    setTimeout(() => navigate('/'), 1200);
  };

  if (successOrderId) {
    return (
      <div className="min-h-screen">
        <main className="px-6 lg:px-12 py-24">
          <div className="max-w-xl mx-auto rounded-3xl bg-[#111318] border border-white/5 p-8 text-center">
            <div className="inline-flex w-16 h-16 rounded-full bg-[#FFD700]/20 items-center justify-center mb-4">
              <CheckCircle className="w-9 h-9 text-[#FFD700]" />
            </div>
            <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-[#F4F6FA] mb-2">
              Order placed
            </h1>
            <p className="text-[#A8ACB8] mb-6">
              Thanks! Your order reference is:
            </p>
            <p className="font-mono text-xl font-bold text-[#FFD700] mb-8">
              {successOrderId}
            </p>
            <Link
              to="/category/all"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#FFD700] text-[#070A15] font-semibold rounded-full hover:bg-[#ffe44d] transition-colors"
            >
              Continue shopping
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-[#070A15]/85 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-6 lg:px-12 py-4">
          <Link
            to="/cart"
            className="flex items-center gap-2 text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to cart
          </Link>
          <h1 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">
            Checkout
          </h1>
          <span />
        </div>
      </header>

      <main className="px-6 lg:px-12 py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
          <form onSubmit={placeOrder} className="lg:col-span-3 space-y-6">
            <section className="rounded-3xl bg-[#111318] border border-white/5 p-6">
              <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#FFD700]" />
                Shipping details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] placeholder:text-[#6b7280] focus:outline-none focus:border-[#FFD700]"
                />
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] placeholder:text-[#6b7280] focus:outline-none focus:border-[#FFD700]"
                />
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] placeholder:text-[#6b7280] focus:outline-none focus:border-[#FFD700] sm:col-span-2"
                />
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Delivery address"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[#F4F6FA] placeholder:text-[#6b7280] focus:outline-none focus:border-[#FFD700] sm:col-span-2 resize-none"
                />
              </div>
            </section>

            <section className="rounded-3xl bg-[#111318] border border-white/5 p-6">
              <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#FFD700]" />
                Payment
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    paymentMethod === 'cod'
                      ? 'bg-[#FFD700] text-[#070A15]'
                      : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
                  }`}
                >
                  Cash on delivery
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('gcash')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    paymentMethod === 'gcash'
                      ? 'bg-[#FFD700] text-[#070A15]'
                      : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
                  }`}
                >
                  GCash (QR)
                </button>
              </div>

              {paymentMethod === 'gcash' && (
                <div className="space-y-4">
                  <p className="text-sm text-[#A8ACB8]">
                    Scan this QR using your GCash app, then tap “Place order”. This is a demo
                    checkout – we don&apos;t verify the payment automatically.
                  </p>
                  <div className="flex items-center justify-center">
                    <div className="rounded-2xl bg-white p-3 shadow-lg max-w-xs w-full">
                      <img
                        src="/images/gcash-qr.png"
                        alt="GCash payment QR code"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
            className="w-full px-8 py-4 bg-[#FFD700] text-[#070A15] font-semibold rounded-full hover:bg-[#ffe44d] transition-colors"
            >
              Place order ({formatCurrency(total)})
            </button>
          </form>

          <aside className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl bg-[#111318] border border-white/5 p-6">
              <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] mb-4">
                Order summary
              </h2>
              <div className="space-y-3">
                {items.map((i) => {
                  const p = getProduct(i.productId);
                  if (!p) return null;
                  return (
                    <div key={i.productId} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-[#F4F6FA] truncate">{p.name}</p>
                        <p className="text-xs text-[#A8ACB8]">Qty: {i.quantity}</p>
                      </div>
                      <p className="text-sm text-[#A8ACB8] whitespace-nowrap">
                        {formatCurrency(p.price * i.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#A8ACB8]">Subtotal</span>
                  <span className="text-[#F4F6FA]">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A8ACB8]">Shipping</span>
                  <span className="text-[#F4F6FA]">{formatCurrency(shipping)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[#A8ACB8]">Total</span>
                  <span className="font-['Space_Grotesk'] text-lg font-bold text-[#FFD700]">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#6B7280]">
              Demo checkout: orders are stored in your browser localStorage.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

