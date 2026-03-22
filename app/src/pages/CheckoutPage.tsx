import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CreditCard, Truck, ClipboardCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { placeOrderFirebase, createPaymentFirebase } from '../lib/firestoreCheckout';

type OnlineChannelId = 'GCASH' | 'MAYA' | 'GOTYME' | 'METROBANK' | 'BDO';

const ONLINE_CHANNELS: { id: OnlineChannelId; label: string }[] = [
  { id: 'GCASH', label: 'GCash' },
  { id: 'MAYA', label: 'Maya' },
  { id: 'GOTYME', label: 'GoTyme' },
  { id: 'METROBANK', label: 'MetroBank' },
  { id: 'BDO', label: 'BDO' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);

type PlacedLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getProduct, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState<'details' | 'place' | 'payment' | 'done'>('details');
  const [paymentChoice, setPaymentChoice] = useState<'cod' | 'online' | null>(null);
  const [onlineChannel, setOnlineChannel] = useState<OnlineChannelId | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [placedLines, setPlacedLines] = useState<PlacedLine[]>([]);
  const [placedTotal, setPlacedTotal] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const shipping = useMemo(() => (subtotal > 0 ? 99 : 0), [subtotal]);
  const total = useMemo(() => subtotal + shipping, [subtotal, shipping]);

  const summaryLines = useMemo(() => {
    if (placedLines.length > 0) return placedLines;
    return items.map((i) => {
      const p = getProduct(i.productId);
      return {
        productId: i.productId,
        name: p?.name ?? 'Item',
        quantity: i.quantity,
        unitPrice: p?.price ?? 0,
      };
    });
  }, [placedLines, items, getProduct]);

  const summarySubtotal = useMemo(() => {
    if (placedLines.length > 0) {
      return placedLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    }
    return subtotal;
  }, [placedLines, subtotal]);

  const summaryShipping = useMemo(() => (summarySubtotal > 0 ? 99 : 0), [summarySubtotal]);
  const summaryGrand = useMemo(() => summarySubtotal + summaryShipping, [summarySubtotal, summaryShipping]);

  if (!user) {
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
            <h1 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">Checkout</h1>
            <span />
          </div>
        </header>
        <main className="px-6 lg:px-12 py-24">
          <div className="max-w-xl mx-auto rounded-3xl bg-[#111318] border border-white/5 p-8 text-center">
            <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-[#F4F6FA] mb-2">
              Please login first
            </h2>
            <p className="text-[#A8ACB8] mb-6">
              Your orders and shopping cart will be saved under your account.
            </p>
            <Link
              to="/login"
              state={{ from: '/checkout' }}
              className="inline-flex items-center justify-center px-8 py-4 bg-[#FFD700] text-[#070A15] font-semibold rounded-full hover:bg-[#ffe44d] transition-colors"
            >
              Go to login
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (user.role === 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4 rounded-3xl bg-[#111318] border border-white/5 p-8">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-[#F4F6FA]">Checkout unavailable</h1>
          <p className="text-sm text-[#A8ACB8]">
            Administrator accounts cannot place customer orders. Use the admin dashboard to manage the store.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#FFD700] text-[#070A15] font-semibold rounded-full hover:bg-[#ffe44d] transition-colors"
          >
            Open admin
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !placedOrderId && step !== 'done') {
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

  const continueToPlaceOrder = (e: React.FormEvent) => {
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

    setStep('place');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const placeOrderNow = async () => {
    setError('');
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();

    if (!name || !email || !phone || !address) {
      setError('Please complete shipping details.');
      setStep('details');
      return;
    }

    if (!user) return;

    const invItems = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    const lineSnapshot: PlacedLine[] = items.map((i) => {
      const p = getProduct(i.productId);
      return {
        productId: i.productId,
        name: p?.name ?? 'Item',
        quantity: i.quantity,
        unitPrice: p?.price ?? 0,
      };
    });
    const snapSub = lineSnapshot.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const snapShip = snapSub > 0 ? 99 : 0;
    const snapGrand = snapSub + snapShip;

    let stockApplied = false;
    setPlacing(true);
    try {
      await api.inventory.applyOrder({ items: invItems });
      stockApplied = true;
      const res = await placeOrderFirebase(user.id, { customer: { name, email, phone, address } }, getProduct);
      const order = res.order;
      setPlacedOrderId(order.id);
      setOrderNumber(order.orderNumber);
      setPlacedLines(lineSnapshot);
      setPlacedTotal(snapGrand);
      clearCart();
      setPaymentChoice(null);
      setOnlineChannel(null);
      setStep('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      if (stockApplied) {
        try {
          await api.inventory.rollbackOrder({ items: invItems });
        } catch {
          // ignore rollback errors
        }
      }
      setError(e instanceof Error ? e.message : 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  const finalizePayment = async () => {
    if (!placedOrderId || !orderNumber || !user) return;
    if (paymentChoice === 'online' && !onlineChannel) {
      setError('Select a payment channel.');
      return;
    }
    if (!paymentChoice) {
      setError('Choose cash on delivery or online payment.');
      return;
    }

    setError('');
    setFinalizing(true);
    try {
      await createPaymentFirebase(
        placedOrderId,
        paymentChoice === 'cod' ? 'cod' : 'online',
        user.id,
        paymentChoice === 'online' ? onlineChannel ?? undefined : undefined
      );
      await api.orders.notifyEmail({
        orderId: placedOrderId,
        orderNumber,
        paymentFlow: paymentChoice === 'cod' ? 'cod' : 'online',
        onlineChannel: paymentChoice === 'online' ? onlineChannel ?? undefined : undefined,
        customer: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        },
        totalPhp: placedTotal || summaryGrand,
      });
      setSuccessOrderId(orderNumber);
      setStep('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => navigate('/'), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to confirm payment.');
    } finally {
      setFinalizing(false);
    }
  };

  if (step === 'done' && successOrderId) {
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
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  step === 'details' ? 'bg-[#FFD700] text-[#070A15]' : 'bg-white/5 text-[#A8ACB8]'
                }`}
              >
                1) Details
              </span>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  step === 'place' ? 'bg-[#FFD700] text-[#070A15]' : 'bg-white/5 text-[#A8ACB8]'
                }`}
              >
                2) Place order
              </span>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  step === 'payment' ? 'bg-[#FFD700] text-[#070A15]' : 'bg-white/5 text-[#A8ACB8]'
                }`}
              >
                3) Payment
              </span>
            </div>

            {step === 'details' && (
              <form onSubmit={continueToPlaceOrder} className="space-y-6">
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

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-[#FFD700] text-[#070A15] font-semibold rounded-full hover:bg-[#ffe44d] transition-colors"
                >
                  Continue
                </button>
              </form>
            )}

            {step === 'place' && (
              <section className="rounded-3xl bg-[#111318] border border-white/5 p-6 space-y-5">
                <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-[#FFD700]" />
                  Review & place order
                </h2>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-[#A8ACB8] mb-2">Ship to</p>
                  <p className="text-sm text-[#F4F6FA]">{form.name}</p>
                  <p className="text-sm text-[#A8ACB8]">
                    {form.phone} • {form.email}
                  </p>
                  <p className="text-sm text-[#A8ACB8] mt-2 whitespace-pre-wrap">{form.address}</p>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="px-8 py-4 rounded-full bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA] transition-colors"
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={() => void placeOrderNow()}
                    disabled={placing}
                    className="flex-1 px-8 py-4 rounded-full bg-[#FFD700] text-[#070A15] font-semibold hover:bg-[#ffe44d] transition-colors disabled:opacity-60"
                  >
                    {placing ? 'Placing…' : `Place order (${formatCurrency(total)})`}
                  </button>
                </div>
              </section>
            )}

            {step === 'payment' && placedOrderId && (
              <section className="rounded-3xl bg-[#111318] border border-white/5 p-6 space-y-5">
                <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#FFD700]" />
                  Payment method
                </h2>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-[#A8ACB8] mb-2">Order reference</p>
                  <p className="font-mono text-[#F4F6FA]">{orderNumber ?? placedOrderId}</p>
                  <p className="text-sm text-[#A8ACB8] mt-3">
                    Amount due:{' '}
                    <span className="text-[#FFD700] font-semibold">
                      {formatCurrency(placedTotal || summaryGrand)}
                    </span>
                  </p>
                </div>

                <p className="text-sm text-[#A8ACB8]">
                  Your order is recorded. Choose how you will pay. We will email the store with your details and this
                  payment choice.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentChoice('cod');
                      setOnlineChannel(null);
                    }}
                    className={`px-4 py-4 rounded-2xl text-sm font-semibold transition-colors border ${
                      paymentChoice === 'cod'
                        ? 'bg-[#FFD700] text-[#070A15] border-[#FFD700]'
                        : 'bg-white/5 text-[#A8ACB8] border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Cash on delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('online')}
                    className={`px-4 py-4 rounded-2xl text-sm font-semibold transition-colors border ${
                      paymentChoice === 'online'
                        ? 'bg-[#FFD700] text-[#070A15] border-[#FFD700]'
                        : 'bg-white/5 text-[#A8ACB8] border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Online payment
                  </button>
                </div>

                {paymentChoice === 'online' && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-[#A8ACB8]">Select channel</p>
                    <div className="flex flex-wrap gap-2">
                      {ONLINE_CHANNELS.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setOnlineChannel(ch.id)}
                          className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                            onlineChannel === ch.id
                              ? 'bg-[#FFD700] text-[#070A15]'
                              : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10'
                          }`}
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentChoice === 'online' && onlineChannel && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <p className="text-sm text-[#F4F6FA] font-medium">
                      Pay with {ONLINE_CHANNELS.find((c) => c.id === onlineChannel)?.label}
                    </p>
                    <p className="text-xs text-[#A8ACB8]">
                      Scan the QR placeholder below. This demo does not verify bank transfers automatically.
                    </p>
                    <div className="mx-auto max-w-[220px] aspect-square rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
                      <span className="text-[11px] text-[#A8ACB8] text-center px-4">
                        QR placeholder
                        <br />
                        {onlineChannel}
                      </span>
                    </div>
                  </div>
                )}

                {paymentChoice === 'cod' && (
                  <p className="text-sm text-[#A8ACB8]">
                    Pay the rider when your order arrives. We will notify the store by email with your shipping details
                    and this choice.
                  </p>
                )}

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="button"
                  onClick={() => void finalizePayment()}
                  disabled={
                    finalizing ||
                    !paymentChoice ||
                    (paymentChoice === 'online' && !onlineChannel)
                  }
                  className="w-full px-8 py-4 rounded-full bg-[#FFD700] text-[#070A15] font-semibold hover:bg-[#ffe44d] transition-colors disabled:opacity-50"
                >
                  {finalizing ? 'Confirming…' : 'Confirm payment & notify store'}
                </button>
              </section>
            )}
          </div>

          <aside className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl bg-[#111318] border border-white/5 p-6">
              <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] mb-4">
                Order summary
              </h2>
              <div className="space-y-3">
                {summaryLines.map((line) => (
                  <div key={line.productId} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-[#F4F6FA] truncate">{line.name}</p>
                      <p className="text-xs text-[#A8ACB8]">Qty: {line.quantity}</p>
                    </div>
                    <p className="text-sm text-[#A8ACB8] whitespace-nowrap">
                      {formatCurrency(line.unitPrice * line.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#A8ACB8]">Subtotal</span>
                  <span className="text-[#F4F6FA]">{formatCurrency(summarySubtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A8ACB8]">Shipping</span>
                  <span className="text-[#F4F6FA]">{formatCurrency(summaryShipping)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[#A8ACB8]">Total</span>
                  <span className="font-['Space_Grotesk'] text-lg font-bold text-[#FFD700]">
                    {formatCurrency(summaryGrand)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#6B7280]">
              Orders are stored in Firestore; inventory is updated from the product database when you place the order.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
