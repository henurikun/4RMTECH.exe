import { useEffect, useMemo, useState } from 'react';
import { allProducts, type Product } from '../data/products';
import { Link } from 'react-router-dom';
import { ClipboardList, Filter, MessageSquare, Plus, Pencil, Trash2, X, ArrowLeft, Package } from 'lucide-react';
import { ADMIN_PASSWORD } from '../config/adminAuth';

type Mode = 'all' | 'laptops' | 'wearables' | 'audio' | 'cameras' | 'consoles' | 'devices';
type Panel = 'products' | 'repairs';

type RepairStatus = 'new' | 'quoted' | 'scheduled' | 'in_progress' | 'done';

interface RepairRequest {
  id: string;
  name: string;
  device: string;
  issue: string;
  contact: string;
  createdAt: number;
}

interface RepairResponse {
  repairId: string;
  status: RepairStatus;
  message: string;
  updatedAt: number;
}

const REPAIRS_STORAGE_KEY = '4rmtech_repairs';
const REPAIR_RESPONSES_STORAGE_KEY = '4rmtech_repair_responses';

function loadRepairs(): RepairRequest[] {
  try {
    const raw = window.localStorage.getItem(REPAIRS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as RepairRequest[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadRepairResponses(): Record<string, RepairResponse> {
  try {
    const raw = window.localStorage.getItem(REPAIR_RESPONSES_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, RepairResponse>) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveRepairResponse(response: RepairResponse) {
  try {
    const current = loadRepairResponses();
    current[response.repairId] = response;
    window.localStorage.setItem(REPAIR_RESPONSES_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

interface FormState {
  id: string;
  name: string;
  category: Mode;
  price: string;
  originalPrice: string;
  image: string;
  badge: string;
  inStock: boolean;
  description: string;
  specsText: string;
}

const emptyForm: FormState = {
  id: '',
  name: '',
  category: 'laptops',
  price: '',
  originalPrice: '',
  image: '',
  badge: '',
  inStock: true,
  description: '',
  specsText: '',
};

function productToFormState(product: Product): FormState {
  return {
    id: product.id,
    name: product.name,
    category: product.category as Mode,
    price: String(product.price),
    originalPrice: product.originalPrice ? String(product.originalPrice) : '',
    image: product.image,
    badge: product.badge ?? '',
    inStock: product.inStock,
    description: product.description,
    specsText: Object.entries(product.specs)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n'),
  };
}

function formStateToProduct(form: FormState): Product {
  const specs: Record<string, string> = {};

  form.specsText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .forEach(line => {
      const [key, ...rest] = line.split(':');
      const value = rest.join(':').trim();
      if (key && value) {
        specs[key.trim()] = value;
      }
    });

  return {
    id: form.id || crypto.randomUUID(),
    name: form.name,
    category: form.category,
    price: Number(form.price) || 0,
    originalPrice: form.originalPrice ? Number(form.originalPrice) || undefined : undefined,
    image: form.image || '/images/laptop_desk.jpg',
    specs,
    description: form.description,
    badge: form.badge || undefined,
    inStock: form.inStock,
  };
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>(() => [...allProducts]);
  const [mode, setMode] = useState<Mode>('all');
  const [panel, setPanel] = useState<Panel>('products');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [isAuthed, setIsAuthed] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [repairResponses, setRepairResponses] = useState<Record<string, RepairResponse>>({});
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  const [replyStatus, setReplyStatus] = useState<RepairStatus>('new');
  const [replyMessage, setReplyMessage] = useState('');
  const [replySaved, setReplySaved] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('4rmtech_admin');
    if (stored === 'true') {
      setIsAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const list = loadRepairs();
    setRepairs(list);
    setRepairResponses(loadRepairResponses());
  }, []);

  useEffect(() => {
    if (!selectedRepairId) return;
    const existing = repairResponses[selectedRepairId];
    if (existing) {
      setReplyStatus(existing.status);
      setReplyMessage(existing.message);
    } else {
      setReplyStatus('new');
      setReplyMessage('');
    }
    setReplySaved('');
  }, [selectedRepairId, repairResponses]);

  const filteredProducts = useMemo(
    () =>
      mode === 'all'
        ? products
        : products.filter(product => product.category === mode),
    [mode, products]
  );

  const startAdd = () => {
    setEditingId(null);
    setFormState(emptyForm);
    setShowForm(true);
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setFormState(productToFormState(product));
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const target = products.find(p => p.id === id);
    const confirmed = window.confirm(
      `Delete "${target?.name ?? 'this product'}"? This cannot be undone in this session.`
    );
    if (!confirmed) return;
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const saveRepairReply = () => {
    if (!selectedRepairId) return;
    const response: RepairResponse = {
      repairId: selectedRepairId,
      status: replyStatus,
      message: replyMessage.trim(),
      updatedAt: Date.now(),
    };
    saveRepairResponse(response);
    setRepairResponses(loadRepairResponses());
    setReplySaved('Saved.');
    setTimeout(() => setReplySaved(''), 1200);
  };

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        handleChange('image', result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const product = formStateToProduct(formState);

    setProducts(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) {
        return prev.map(p => (p.id === product.id ? product : p));
      }
      return [product, ...prev];
    });

    setShowForm(false);
    setEditingId(null);
  };

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthed(true);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('4rmtech_admin', 'true');
      }
      setShowLogin(false);
      setPassword('');
      setLoginError('');
    } else {
      setLoginError('Incorrect passcode.');
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#0B0C0F] relative">
        <div className="flex items-center justify-center h-screen px-6">
          <div className="max-w-md text-center">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#A8ACB8] mb-3">
              Restricted Area
            </p>
            <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-[#F4F6FA] mb-2">
              4RMTECH Control Panel
            </h1>
            <p className="text-sm text-[#6B7280]">
              If you are not part of the 4RMTECH team, you can safely ignore this page.
            </p>
          </div>
        </div>

        {/* Suspicious login dot in the footer */}
        <button
          type="button"
          onClick={() => setShowLogin(true)}
          aria-label="Admin login"
          className="fixed bottom-4 right-6 w-2 h-2 rounded-full bg-[#D7FF3B]/70 hover:bg-[#D7FF3B] transition-colors shadow-sm"
        />

        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-end justify-end pointer-events-none">
            <div className="pointer-events-auto m-4 w-full max-w-xs rounded-2xl bg-[#050609]/95 border border-white/10 p-4 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[#F4F6FA]">Admin Login</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogin(false);
                    setPassword('');
                    setLoginError('');
                  }}
                  className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-[#F4F6FA] flex items-center justify-center text-xs"
                  aria-label="Close admin login"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleLogin} className="space-y-2">
                <div className="space-y-1">
                  <label
                    htmlFor="admin-passcode"
                    className="text-[11px] font-medium text-[#A8ACB8]"
                  >
                    Passcode
                  </label>
                  <input
                    id="admin-passcode"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="off"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-[#F4F6FA] focus:outline-none focus:border-[#D7FF3B]"
                  />
                </div>
                {loginError && (
                  <p className="text-[11px] text-red-400">{loginError}</p>
                )}
                <button
                  type="submit"
                  className="w-full mt-1 px-3 py-2 rounded-full bg-[#D7FF3B] text-[#0B0C0F] text-xs font-semibold hover:bg-[#e0ff5c] transition-colors"
                >
                  Enter
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C0F]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0B0C0F]/95 backdrop-blur-md border-b border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 lg:px-12 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to site
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#D7FF3B]/10 flex items-center justify-center text-[#D7FF3B] font-bold text-sm">
                ADM
              </div>
              <div>
                <h1 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">
                  Admin Product Manager
                </h1>
                <p className="text-xs text-[#A8ACB8]">
                  Local-only CRUD for demo purposes (no database yet).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setPanel('products')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                panel === 'products'
                  ? 'bg-[#D7FF3B] text-[#0B0C0F]'
                  : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
              }`}
            >
              <Package className="w-4 h-4" />
              Products
            </button>
            <button
              type="button"
              onClick={() => setPanel('repairs')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                panel === 'repairs'
                  ? 'bg-[#D7FF3B] text-[#0B0C0F]'
                  : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Repairs
            </button>

            {panel === 'products' && (
              <button
                onClick={startAdd}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D7FF3B] text-[#0B0C0F] text-sm font-semibold hover:bg-[#e0ff5c] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            )}
          </div>
        </div>
      </header>

      {panel === 'products' ? (
        <>
          {/* Filters */}
          <section className="px-6 lg:px-12 py-6 border-b border-white/5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#A8ACB8]" />
                <span className="text-sm text-[#A8ACB8]">Category:</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(['all', 'laptops', 'wearables', 'audio', 'cameras', 'consoles', 'devices'] as const).map(
                  cat => (
                    <button
                      key={cat}
                      onClick={() => setMode(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        mode === cat
                          ? 'bg-[#D7FF3B] text-[#0B0C0F]'
                          : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>
          </section>

          {/* Products grid */}
          <main className="px-6 lg:px-12 py-10">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#A8ACB8] text-lg">No products in this view.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="group bg-[#111318] rounded-2xl overflow-hidden border border-white/5 hover:border-[#D7FF3B]/30 transition-all duration-300"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {product.badge && (
                        <div className="absolute top-4 left-4 px-3 py-1 bg-[#D7FF3B] text-[#0B0C0F] text-xs font-bold rounded-full">
                          {product.badge}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA] mb-1">
                          {product.name}
                        </h3>
                        <p className="text-xs uppercase tracking-wide text-[#A8ACB8]">
                          {product.category}
                        </p>
                      </div>

                      <p className="text-[#A8ACB8] text-sm line-clamp-2">{product.description}</p>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(product.specs)
                          .slice(0, 4)
                          .map(([key, value]) => (
                            <div key={key}>
                              <span className="text-[#A8ACB8]">{key}:</span>
                              <span className="text-[#F4F6FA] ml-1">{value}</span>
                            </div>
                          ))}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div>
                          <span className="font-['Space_Grotesk'] text-xl font-bold text-[#D7FF3B]">
                            ₱{product.price.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                          </span>
                          {product.originalPrice && (
                            <span className="ml-2 text-xs text-[#A8ACB8] line-through">
                              ₱
                              {product.originalPrice.toLocaleString('en-PH', {
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(product)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#F4F6FA] transition-colors"
                            title="Edit product"
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Delete product"
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* Slide-over form */}
          {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          />
          <div className="w-full max-w-md bg-[#0B0C0F] border-l border-white/10 shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA]">
                  {editingId ? 'Edit Product' : 'Add Product'}
                </h2>
                <p className="text-xs text-[#A8ACB8]">
                  Changes are kept in memory only for this session.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#F4F6FA] flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A8ACB8]" htmlFor="admin-name">
                  Name
                </label>
                <input
                  type="text"
                  id="admin-name"
                  value={formState.name}
                  onChange={e => handleChange('name', e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#D7FF3B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#A8ACB8]" htmlFor="admin-category">
                    Category
                  </label>
                  <select
                    id="admin-category"
                    value={formState.category}
                    onChange={e => handleChange('category', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#D7FF3B]"
                  >
                    {(['laptops', 'wearables', 'audio', 'cameras', 'consoles', 'devices'] as const).map(
                      cat => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#A8ACB8]">Badge (optional)</label>
                  <input
                    type="text"
                    value={formState.badge}
                    onChange={e => handleChange('badge', e.target.value)}
                    placeholder="New, Best Seller..."
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#D7FF3B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#A8ACB8]" htmlFor="admin-price">
                    Price (PHP)
                  </label>
                  <input
                    type="number"
                    id="admin-price"
                    min={0}
                    value={formState.price}
                    onChange={e => handleChange('price', e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#D7FF3B]"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-xs font-medium text-[#A8ACB8]"
                    htmlFor="admin-original-price"
                  >
                    Original Price (optional)
                  </label>
                  <input
                    type="number"
                    id="admin-original-price"
                    min={0}
                    value={formState.originalPrice}
                    onChange={e => handleChange('originalPrice', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#D7FF3B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A8ACB8]" htmlFor="admin-image-file">
                  Product image (attach file)
                </label>
                <input
                  type="file"
                  id="admin-image-file"
                  accept="image/*"
                  onChange={e => handleImageFile(e.target.files?.[0] ?? null)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-[#A8ACB8] file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#F4F6FA] hover:file:bg-white/15 focus:outline-none focus:border-[#D7FF3B]"
                />
                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-[#6B7280]">
                    Stored locally for this session (no upload/backend yet).
                  </p>
                  {formState.image && (
                    <button
                      type="button"
                      onClick={() => handleChange('image', '')}
                      className="text-[11px] text-[#A8ACB8] hover:text-[#F4F6FA] underline underline-offset-4"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {formState.image && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                    <div className="aspect-[16/9] w-full">
                      <img
                        src={formState.image}
                        alt="Selected product"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A8ACB8]" htmlFor="admin-description">
                  Description
                </label>
                <textarea
                  id="admin-description"
                  value={formState.description}
                  onChange={e => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#D7FF3B] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A8ACB8]" htmlFor="admin-specs">
                  Specs (one per line, `Key: Value`)
                </label>
                <textarea
                  id="admin-specs"
                  value={formState.specsText}
                  onChange={e => handleChange('specsText', e.target.value)}
                  rows={4}
                  placeholder={'Processor: Intel Core i7-13700H\nRAM: 16GB DDR5'}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#D7FF3B] resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-[#A8ACB8]">
                  <input
                    type="checkbox"
                    checked={formState.inStock}
                    onChange={e => handleChange('inStock', e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#D7FF3B]"
                  />
                  In stock
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 rounded-full text-xs font-medium bg-white/5 text-[#A8ACB8] hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-[#D7FF3B] text-[#0B0C0F] hover:bg-[#e0ff5c]"
                  >
                    {editingId ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
          )}
        </>
      ) : (
        <main className="px-6 lg:px-12 py-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">
                  Repair requests
                </h2>
                <p className="text-sm text-[#A8ACB8]">
                  View booked repairs and reply with quotes/status updates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRepairs(loadRepairs());
                  setRepairResponses(loadRepairResponses());
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA] transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <section className="lg:col-span-2 rounded-3xl bg-[#111318] border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#F4F6FA] flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#D7FF3B]" />
                    Inbox
                  </p>
                  <p className="text-xs text-[#A8ACB8]">{repairs.length} total</p>
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                  {repairs.length === 0 ? (
                    <div className="p-6">
                      <p className="text-sm text-[#A8ACB8]">No repair requests yet.</p>
                    </div>
                  ) : (
                    repairs.map((r) => {
                      const resp = repairResponses[r.id];
                      const isSelected = selectedRepairId === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRepairId(r.id)}
                          className={`w-full text-left px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                            isSelected ? 'bg-white/5' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#F4F6FA] truncate">
                                {r.name}
                              </p>
                              <p className="text-xs text-[#A8ACB8] truncate">
                                {r.id} • {r.device}
                              </p>
                            </div>
                            <span
                              className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${
                                resp?.status === 'done'
                                  ? 'bg-green-500/15 text-green-400'
                                  : resp
                                  ? 'bg-[#D7FF3B]/15 text-[#D7FF3B]'
                                  : 'bg-white/5 text-[#A8ACB8]'
                              }`}
                            >
                              {resp?.status ?? 'new'}
                            </span>
                          </div>
                          <p className="text-xs text-[#6B7280] mt-2 line-clamp-2">
                            {r.issue}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="lg:col-span-3 rounded-3xl bg-[#111318] border border-white/5 p-6">
                {!selectedRepairId ? (
                  <div className="text-center py-14">
                    <MessageSquare className="w-10 h-10 text-[#A8ACB8] mx-auto mb-3" />
                    <p className="text-[#A8ACB8]">Select a request to view details and reply.</p>
                  </div>
                ) : (
                  (() => {
                    const r = repairs.find((x) => x.id === selectedRepairId);
                    if (!r) {
                      return (
                        <p className="text-[#A8ACB8]">Request not found. Try refreshing.</p>
                      );
                    }
                    return (
                      <div className="space-y-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">
                              {r.name}
                            </h3>
                            <p className="text-sm text-[#A8ACB8]">
                              {r.id} • {r.device} • {r.contact}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                          <p className="text-xs font-medium text-[#A8ACB8] mb-2">Issue</p>
                          <p className="text-sm text-[#F4F6FA] whitespace-pre-wrap">{r.issue}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#A8ACB8]">
                              Status
                            </label>
                            <select
                              value={replyStatus}
                              onChange={(e) => setReplyStatus(e.target.value as RepairStatus)}
                              aria-label="Repair status"
                              title="Repair status"
                              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#D7FF3B]"
                            >
                              {(['new', 'quoted', 'scheduled', 'in_progress', 'done'] as const).map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-[#A8ACB8]">
                              Quick actions
                            </label>
                            <button
                              type="button"
                              onClick={() => setReplyMessage((m) => (m ? m : `Hi ${r.name},\\n\\nHere’s your quote: \\n• Parts: \\n• Labor: \\n• ETA: \\n\\nReply to confirm.`))}
                              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA] transition-colors"
                            >
                              Insert quote template
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium text-[#A8ACB8]">
                            Response message (customer will see this)
                          </label>
                          <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#D7FF3B] resize-none"
                            placeholder="Write your response, quote, schedule, or updates..."
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-[#6B7280]">
                              Saved to browser localStorage (demo).
                            </p>
                            <div className="flex items-center gap-3">
                              {replySaved && (
                                <span className="text-xs text-green-400">{replySaved}</span>
                              )}
                              <button
                                type="button"
                                onClick={saveRepairReply}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D7FF3B] text-[#0B0C0F] text-sm font-semibold hover:bg-[#e0ff5c] transition-colors"
                              >
                                Save reply
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </section>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

