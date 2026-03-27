import { useEffect, useMemo, useState } from 'react';
import type { Product } from '../data/products';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Filter, MessageSquare, Plus, Pencil, Trash2, X, ArrowLeft, Package, Inbox, Upload, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { api, type ProductGroupRow, type RepairTicket } from '../lib/api';

type Mode = 'all' | string;
type Panel = 'products' | 'inbox';
type InboxTab = 'invoices' | 'repairs';

type RepairStatus = 'new' | 'quoted' | 'scheduled' | 'in_progress' | 'done';
type CsvProductRow = {
  itemName: string;
  /**
   * Optional unique identifier from CSV (e.g. `id`, `itemId`, `productId`, `sku`).
   * Used to make re-imports overwrite instead of creating duplicates.
   */
  itemId?: string;
  category: string;
  price: number;
  specialPrice: number | null;
  stockQuantity: number;
};

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

function mapTicketToRepairRequest(t: RepairTicket): RepairRequest {
  return {
    id: t.id,
    name: t.name,
    device: t.device,
    issue: t.issue,
    contact: t.contact,
    createdAt: Date.parse(t.createdAt),
  };
}

interface FormState {
  id: string;
  name: string;
  category: string;
  price: string;
  originalPrice: string;
  image: string;
  badge: string;
  stockQuantity: string;
  description: string;
  specsText: string;
}

interface GroupFormState {
  id: string;
  name: string;
  category: string;
  groupType: 'variant' | 'set';
  price: string;
  originalPrice: string;
  imageUrl: string;
  badge: string;
  description: string;
}

const emptyForm: FormState = {
  id: '',
  name: '',
  category: 'laptops',
  price: '',
  originalPrice: '',
  image: '',
  badge: '',
  stockQuantity: '0',
  description: '',
  specsText: '',
};

const emptyGroupForm: GroupFormState = {
  id: '',
  name: '',
  category: 'devices',
  groupType: 'variant',
  price: '0',
  originalPrice: '',
  imageUrl: '/images/laptop_desk.jpg',
  badge: '',
  description: '',
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
    stockQuantity: String(product.stockQuantity ?? 0),
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

  const stockQty = Math.max(0, Math.floor(Number(form.stockQuantity) || 0));
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
    inStock: stockQty > 0,
    stockQuantity: stockQty,
  };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function toMode(input: string): Mode {
  const s = input.trim().toLowerCase();
  if (s.includes('laptop')) return 'laptops';
  if (s.includes('wear')) return 'wearables';
  if (s.includes('audio') || s.includes('speaker') || s.includes('head')) return 'audio';
  if (s.includes('camera')) return 'cameras';
  if (s.includes('console') || s.includes('game')) return 'consoles';
  if (s.includes('device') || s.includes('phone') || s.includes('tablet')) return 'devices';
  if (!s) return 'devices';
  const normalized = s
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
  return normalized || 'devices';
}

function formatCategoryName(category: string) {
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseMoney(input: string): number {
  const cleaned = input.replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function makeStableProductId(itemName: string, category: string) {
  const base = `${category}:${itemName}`;
  const normalized = base
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return normalized.slice(0, 60) || 'product';
}

function parseCsvProducts(text: string): CsvProductRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const idxName = header.findIndex((h) => ['itemname', 'name', 'productname', 'title'].includes(h));
  const idxCategory = header.findIndex((h) => ['category', 'type', 'productcategory'].includes(h));
  const idxPrice = header.findIndex((h) => ['price', 'srp', 'regularprice'].includes(h));
  const idxSpecial = header.findIndex((h) => ['specialprice', 'saleprice', 'promo', 'promoprice'].includes(h));
  const idxStock = header.findIndex((h) => ['stock', 'stockquantity', 'qty', 'quantity'].includes(h));
  const idxItemId = header.findIndex((h) =>
    ['id', 'itemid', 'item_id', 'productid', 'product_id', 'sku'].includes(h)
  );
  if (idxName < 0 || idxPrice < 0) return [];

  const rows: CsvProductRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const itemName = (cols[idxName] ?? '').trim();
    if (!itemName) continue;
    const rawItemId = idxItemId >= 0 ? String(cols[idxItemId] ?? '').trim() : '';
    const itemId = rawItemId || undefined;
    const price = parseMoney(cols[idxPrice] ?? '');
    const specialRaw = idxSpecial >= 0 ? parseMoney(cols[idxSpecial] ?? '') : 0;
    const stockRaw = idxStock >= 0 ? Math.floor(Number(cols[idxStock] ?? '0')) : 10;
    rows.push({
      itemName,
      itemId,
      category: toMode(idxCategory >= 0 ? cols[idxCategory] ?? '' : ''),
      price,
      specialPrice: specialRaw > 0 ? specialRaw : null,
      stockQuantity: Number.isFinite(stockRaw) && stockRaw >= 0 ? stockRaw : 10,
    });
  }
  return rows;
}

export default function AdminPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { products, refetch } = useCatalog();
  const [mode, setMode] = useState<Mode>('all');
  const [panel, setPanel] = useState<Panel>('products');
  const [inboxTab, setInboxTab] = useState<InboxTab>('invoices');
  const [firestoreOrders, setFirestoreOrders] = useState<Record<string, unknown>[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [inventorySearch, setInventorySearch] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearingInventory, setClearingInventory] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [uploadSummary, setUploadSummary] = useState('');
  const [groups, setGroups] = useState<ProductGroupRow[]>([]);
  const [groupForm, setGroupForm] = useState<GroupFormState>(emptyGroupForm);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [draggingProductId, setDraggingProductId] = useState<string | null>(null);
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<{ name: string; x: number; y: number } | null>(null);

  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [repairResponses, setRepairResponses] = useState<Record<string, RepairResponse>>({});
  const [repairsLoading, setRepairsLoading] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  const [replyStatus, setReplyStatus] = useState<RepairStatus>('new');
  const [replyMessage, setReplyMessage] = useState('');
  const [replySaved, setReplySaved] = useState('');
  const categoryOptions = useMemo(() => {
    const defaults = ['laptops', 'wearables', 'audio', 'cameras', 'consoles', 'devices'];
    const dynamic = products.map((p) => p.category).filter(Boolean);
    return Array.from(new Set([...defaults, ...dynamic])).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const loadRepairsFromApi = async () => {
    setRepairsLoading(true);
    try {
      const rows = await api.admin.repairs();
      setRepairs(rows.map(mapTicketToRepairRequest));
      const mapped: Record<string, RepairResponse> = {};
      rows.forEach((r) => {
        mapped[r.id] = {
          repairId: r.id,
          status: r.status,
          message: r.message ?? '',
          updatedAt: Date.parse(r.updatedAt),
        };
      });
      setRepairResponses(mapped);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to load repairs');
    } finally {
      setRepairsLoading(false);
    }
  };

  const loadGroupsFromApi = async () => {
    try {
      const rows = await api.admin.groups();
      setGroups(rows);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to load groups');
      setGroups([]);
    }
  };

  useEffect(() => {
    if (panel !== 'products') return;
    void loadGroupsFromApi();
  }, [panel]);

  useEffect(() => {
    if (panel !== 'inbox' || inboxTab !== 'repairs') return;
    void loadRepairsFromApi();
  }, [panel, inboxTab]);

  useEffect(() => {
    if (panel !== 'inbox' || inboxTab !== 'invoices') return;
    let cancelled = false;
    setOrdersLoading(true);
    api.admin
      .firestoreOrders()
      .then((rows) => {
        if (!cancelled) setFirestoreOrders(rows);
      })
      .catch(() => {
        if (!cancelled) setFirestoreOrders([]);
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [panel, inboxTab]);

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
  const groupedMemberIds = useMemo(() => {
    const s = new Set<string>();
    groups.forEach((g) => g.groupItems.forEach((i) => s.add(i.productId)));
    return s;
  }, [groups]);
  const displayedProducts = useMemo(() => {
    const source = filteredProducts.filter((p) => p.kind === 'group' || !groupedMemberIds.has(p.id));
    const q = inventorySearch.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        String(p.price).includes(q)
    );
  }, [filteredProducts, inventorySearch, groupedMemberIds]);
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

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

  const handleDelete = async (id: string) => {
    const target = products.find((p) => p.id === id);
    const confirmed = window.confirm(
      `Delete "${target?.name ?? 'this product'}"? This removes it from the database.`
    );
    if (!confirmed) return;
    setSaving(true);
    setSaveError('');
    try {
      await api.admin.deleteProduct(id);
      await refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleGroupFormChange = (field: keyof GroupFormState, value: string) => {
    setGroupForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGroupSave = async () => {
    if (!groupForm.name.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        id: groupForm.id.trim() || undefined,
        name: groupForm.name.trim(),
        category: groupForm.category,
        groupType: groupForm.groupType,
        description: groupForm.description,
        imageUrl: groupForm.imageUrl,
        badge: groupForm.badge || null,
        price: Number(groupForm.price) || 0,
        originalPrice: groupForm.originalPrice ? Number(groupForm.originalPrice) : null,
        status: 'active' as const,
      };
      if (editingGroupId) await api.admin.updateGroup(editingGroupId, payload);
      else await api.admin.createGroup(payload);
      await loadGroupsFromApi();
      await refetch();
      setGroupForm(emptyGroupForm);
      setEditingGroupId(null);
      setShowGroupForm(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const startEditGroup = (group: ProductGroupRow) => {
    setEditingGroupId(group.id);
    setGroupForm({
      id: group.id,
      name: group.name,
      category: group.category,
      groupType: group.groupType,
      price: String(Math.round(group.priceCents) / 100),
      originalPrice: group.originalPriceCents != null ? String(Math.round(group.originalPriceCents) / 100) : '',
      imageUrl: group.imageUrl ?? '/images/laptop_desk.jpg',
      badge: group.badge ?? '',
      description: group.description,
    });
    setShowGroupForm(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Delete this group?')) return;
    setSaving(true);
    try {
      await api.admin.deleteGroup(groupId);
      await loadGroupsFromApi();
      await refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to delete group');
    } finally {
      setSaving(false);
    }
  };

  const addProductToGroup = async (groupId: string, productId: string) => {
    setSaving(true);
    try {
      await api.admin.addGroupItems(groupId, {
        items: [{ productId, qtyPerSet: 1, sortOrder: 999 }],
      });
      await loadGroupsFromApi();
      await refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to add product to group');
    } finally {
      setSaving(false);
      setDropTargetGroupId(null);
      setDraggingProductId(null);
    }
  };

  const beginCustomDrag = (event: React.MouseEvent, product: Product) => {
    if (product.kind === 'group') return;
    event.preventDefault();
    setDraggingProductId(product.id);
    setDragGhost({ name: product.name, x: event.clientX, y: event.clientY });
    document.body.style.userSelect = 'none';
    let activeGroupTarget: string | null = null;

    const onMove = (e: MouseEvent) => {
      setDragGhost((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev));
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const groupRow = el?.closest('tr[data-group-id]') as HTMLElement | null;
      const gid = groupRow?.dataset.groupId ?? null;
      activeGroupTarget = gid;
      setDropTargetGroupId(gid);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      if (activeGroupTarget && product.id !== activeGroupTarget) {
        void addProductToGroup(activeGroupTarget, product.id);
      }
      setDragGhost(null);
      setDraggingProductId(null);
      setDropTargetGroupId(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const removeProductFromGroup = async (groupId: string, productId: string) => {
    setSaving(true);
    try {
      await api.admin.removeGroupItems(groupId, { productIds: [productId] });
      await loadGroupsFromApi();
      await refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to remove product from group');
    } finally {
      setSaving(false);
    }
  };

  const saveRepairReply = () => {
    if (!selectedRepairId) return;
    void api.admin
      .updateRepair(selectedRepairId, { status: replyStatus, message: replyMessage.trim() })
      .then(async () => {
        await loadRepairsFromApi();
        setReplySaved('Saved.');
        setTimeout(() => setReplySaved(''), 1200);
      })
      .catch((e) => {
        setSaveError(e instanceof Error ? e.message : 'Failed to save reply');
      });
  };

  const handleChange = (field: keyof FormState, value: string) => {
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const product = formStateToProduct(formState);
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice ?? null,
        imageUrl: product.image,
        badge: product.badge ?? null,
        inStock: product.inStock,
        stockQuantity: product.stockQuantity ?? 0,
        specs: Object.keys(product.specs).length ? product.specs : undefined,
      };
      if (editingId) {
        await api.admin.updateProduct(editingId, payload);
      } else {
        const stableId = formState.id.trim() ? formState.id.trim() : makeStableProductId(product.name, product.category);
        await api.admin.createProduct({
          ...payload,
          id: stableId,
          sku: stableId,
        });
      }
      await refetch();
      setShowForm(false);
      setEditingId(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCsvUpload = async (file: File | null) => {
    if (!file) return;
    setSaveError('');
    setUploadSummary('');
    setUploadingCsv(true);
    try {
      const text = await file.text();
      const rows = parseCsvProducts(text);
      if (rows.length === 0) throw new Error('No valid rows found. Make sure CSV has item name and price columns.');
      let success = 0;
      let failed = 0;
      for (const row of rows) {
        try {
          const stableId = row.itemId ? row.itemId.trim() : makeStableProductId(row.itemName, row.category);
          await api.admin.createProduct({
            id: stableId,
            sku: stableId,
            name: row.itemName,
            category: row.category,
            price: row.price,
            originalPrice: row.specialPrice,
            stockQuantity: row.stockQuantity,
            description: '',
            imageUrl: '/images/laptop_desk.jpg',
          });
          success += 1;
        } catch {
          failed += 1;
        }
      }
      await refetch();
      setUploadSummary(`CSV import complete: ${success} added, ${failed} failed.`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'CSV upload failed');
    } finally {
      setUploadingCsv(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-[#F4F6FA]">Admin</h1>
          <p className="text-sm text-[#A8ACB8]">Sign in with an administrator account to manage products.</p>
          <Link
            to="/login"
            state={{ from: '/admin' }}
            className="inline-flex items-center justify-center px-6 py-3 bg-[#FFD700] text-[#070A15] font-semibold rounded-full hover:bg-[#ffe44d] transition-colors"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-[#F4F6FA]">Access denied</h1>
          <p className="text-sm text-[#A8ACB8]">This page is only available to admin accounts.</p>
          <Link
            to="/login"
            state={{ from: '/admin' }}
            className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-[#F4F6FA] font-medium rounded-full hover:bg-white/15 transition-colors"
          >
            Switch account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#070A15]/85 backdrop-blur-md border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 lg:px-12 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                void refreshUser();
                navigate('/');
              }}
              className="inline-flex items-center gap-2 text-sm text-[#A8ACB8] hover:text-[#F4F6FA] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to site
            </button>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] font-bold text-sm">
                ADM
              </div>
              <div>
                <h1 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">
                  Admin Product Manager
                </h1>
                <p className="text-xs text-[#A8ACB8]">
                  Products are stored in Firestore via the API.
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
                  ? 'bg-[#FFD700] text-[#070A15]'
                  : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
              }`}
            >
              <Package className="w-4 h-4" />
              Products
            </button>
            <button
              type="button"
              onClick={() => setPanel('inbox')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                panel === 'inbox'
                  ? 'bg-[#FFD700] text-[#070A15]'
                  : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Inbox
            </button>

            {panel === 'products' && (
              <button
                onClick={startAdd}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD700] text-[#070A15] text-sm font-semibold hover:bg-[#ffe44d] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            )}
            {panel === 'products' && (
              <button
                type="button"
                onClick={() => {
                  setEditingGroupId(null);
                  setGroupForm(emptyGroupForm);
                  setShowGroupForm(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-[#F4F6FA] text-sm font-semibold hover:bg-white/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Group
              </button>
            )}

            {panel === 'products' && (
              <button
                type="button"
                onClick={async () => {
                  const confirmed = window.confirm('Clear ALL inventory products stored in the database?');
                  if (!confirmed) return;
                  setClearingInventory(true);
                  setSaveError('');
                  try {
                    const beforeCount = (await api.products.list()).length;
                    const result = await api.admin.clearProducts();
                    await refetch();
                    const afterCount = (await api.products.list()).length;
                    const deletedCount =
                      typeof (result as any)?.deleted === 'number' ? (result as any).deleted : Math.max(0, beforeCount - afterCount);
                    const remaining =
                      typeof (result as any)?.remaining === 'number' ? (result as any).remaining : afterCount;
                    setUploadSummary(`Cleared inventory: deleted ${deletedCount} product(s). Remaining: ${remaining}.`);
                  } catch (e) {
                    setSaveError(e instanceof Error ? e.message : 'Failed to clear inventory');
                  } finally {
                    setClearingInventory(false);
                  }
                }}
                disabled={clearingInventory}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-300 text-sm font-semibold hover:bg-red-500/20 disabled:opacity-60 transition-colors"
              >
                Clear Inventory
              </button>
            )}
          </div>
        </div>
        {saveError && (
          <div className="px-6 lg:px-12 py-2 bg-red-500/10 border-t border-red-500/20 text-sm text-red-300">
            {saveError}
          </div>
        )}
      </header>

      {panel === 'products' ? (
        <div>
          {/* Filters */}
          <section className="px-6 lg:px-12 py-6 border-b border-white/5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#A8ACB8]" />
                <span className="text-sm text-[#A8ACB8]">Category:</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(['all', ...categoryOptions] as const).map(
                  cat => (
                    <button
                      key={cat}
                      onClick={() => setMode(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        mode === cat
                          ? 'bg-[#FFD700] text-[#070A15]'
                          : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
                      }`}
                    >
                      {cat === 'all' ? 'All' : formatCategoryName(cat)}
                    </button>
                  )
                )}
              </div>
              <input
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search inventory..."
                className="ml-auto px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-[#F4F6FA] placeholder:text-[#6B7280] focus:outline-none focus:border-[#FFD700]"
              />
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA] cursor-pointer">
                <Upload className="w-4 h-4" />
                {uploadingCsv ? 'Uploading CSV...' : 'Upload CSV'}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  disabled={uploadingCsv}
                  onChange={(e) => {
                    void handleCsvUpload(e.target.files?.[0] ?? null);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
            {uploadSummary && <p className="mt-3 text-sm text-green-400">{uploadSummary}</p>}
          </section>

          {/* Inventory table */}
          <main className="px-6 lg:px-12 py-10">
            {displayedProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#A8ACB8] text-lg">No products in this view.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#111318]">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-[#A8ACB8]">
                    <tr>
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3">Price</th>
                      <th className="text-left px-4 py-3">Category</th>
                      <th className="text-left px-4 py-3">Stock Quantity</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedProducts.map((product) => {
                      const isGroup = product.kind === 'group';
                      const groupMeta = isGroup ? groupsById.get(product.id) : undefined;
                      const isExpanded = expandedGroupIds.includes(product.id);
                      const lowStock = (product.stockQuantity ?? 0) > 0 && (product.stockQuantity ?? 0) <= 5;
                      const mainRow = (
                        <tr
                          key={`${product.id}-main`}
                          data-group-id={isGroup ? product.id : undefined}
                          className={`${lowStock ? 'bg-red-500/10' : ''} ${
                            dropTargetGroupId === product.id ? 'bg-green-500/20' : ''
                          } border-t border-white/5`}
                        >
                          <td className="px-4 py-3 text-[#F4F6FA]">
                            <div className="flex items-center gap-2">
                              {!isGroup ? (
                                <button
                                  type="button"
                                  onMouseDown={(e) => beginCustomDrag(e, product)}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded bg-white/5 ${
                                    draggingProductId === product.id ? 'opacity-50 scale-95' : 'hover:bg-white/10'
                                  } transition-all`}
                                  title="Drag item to group"
                                >
                                  <span className="text-xs">::</span>
                                </button>
                              ) : null}
                              {isGroup ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedGroupIds((prev) =>
                                      prev.includes(product.id)
                                        ? prev.filter((id) => id !== product.id)
                                        : [...prev, product.id]
                                    )
                                  }
                                  className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/5 hover:bg-white/10"
                                  aria-label={`Toggle ${product.name} group items`}
                                >
                                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              ) : null}
                              <span>{product.name}</span>
                              {isGroup ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFD700]/15 text-[#FFD700] uppercase">
                                  Group
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#FFD700] font-semibold">
                            ₱{product.price.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-3 text-[#A8ACB8] uppercase">{product.category}</td>
                          <td className={`px-4 py-3 ${lowStock ? 'text-red-300 font-semibold' : 'text-[#F4F6FA]'}`}>
                            {product.stockQuantity ?? 0}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => (isGroup && groupMeta ? startEditGroup(groupMeta) : startEdit(product))}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[#F4F6FA] transition-colors"
                                title={isGroup ? 'Edit group' : 'Edit product'}
                                aria-label={`Edit ${product.name}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  isGroup && groupMeta ? void handleDeleteGroup(groupMeta.id) : void handleDelete(product.id)
                                }
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                title={isGroup ? 'Delete group' : 'Delete product'}
                                aria-label={`Delete ${product.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                      const detailsRow = isGroup && isExpanded ? (
                          <tr key={`${product.id}-details`} className="border-t border-white/5 bg-white/[0.02]">
                            <td colSpan={5} className="px-6 py-4">
                              {!groupMeta || groupMeta.groupItems.length === 0 ? (
                                <p className="text-xs text-[#A8ACB8]">No items in this group yet. Drag products onto this row to add.</p>
                              ) : (
                                <div className="space-y-2">
                                  {groupMeta.groupItems.map((item) => (
                                    <div key={item.productId} className="flex items-center justify-between text-sm">
                                      <span className="text-[#F4F6FA]">
                                        {item.name ?? item.productId}
                                        {groupMeta.groupType === 'set' ? ` x${item.qtyPerSet ?? 1}` : ''}
                                        {groupMeta.groupType === 'variant' && typeof item.price === 'number'
                                          ? ` - ₱${item.price.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
                                          : ''}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => void removeProductFromGroup(groupMeta.id, item.productId)}
                                        className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ) : null;
                      return [
                        mainRow,
                        detailsRow,
                      ];
                      
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>

          {showGroupForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => {
                  setShowGroupForm(false);
                  setEditingGroupId(null);
                }}
              />
              <div className="relative w-full max-w-2xl bg-[#070A15]/95 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-3">
                <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA]">
                  {editingGroupId ? 'Edit Group' : 'Add Group'}
                </h2>
                <input
                  value={groupForm.name}
                  onChange={(e) => handleGroupFormChange('name', e.target.value)}
                  placeholder="Group name"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={groupForm.groupType}
                    onChange={(e) => handleGroupFormChange('groupType', e.target.value)}
                    aria-label="Group type"
                    title="Group type"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA]"
                  >
                    <option value="variant" className="text-[#111827]">Variant</option>
                    <option value="set" className="text-[#111827]">Set bundle</option>
                  </select>
                  <select
                    value={groupForm.category}
                    onChange={(e) => handleGroupFormChange('category', e.target.value)}
                    aria-label="Group category"
                    title="Group category"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA]"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat} className="text-[#111827]">{formatCategoryName(cat)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={groupForm.price}
                    onChange={(e) => handleGroupFormChange('price', e.target.value)}
                    placeholder="Price"
                    type="number"
                    min={0}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA]"
                  />
                  <input
                    value={groupForm.originalPrice}
                    onChange={(e) => handleGroupFormChange('originalPrice', e.target.value)}
                    placeholder="Original price"
                    type="number"
                    min={0}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA]"
                  />
                </div>
                <input
                  value={groupForm.imageUrl}
                  onChange={(e) => handleGroupFormChange('imageUrl', e.target.value)}
                  placeholder="Image URL"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA]"
                />
                <textarea
                  value={groupForm.description}
                  onChange={(e) => handleGroupFormChange('description', e.target.value)}
                  placeholder="Description"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupForm(false);
                      setEditingGroupId(null);
                    }}
                    className="px-4 py-2 rounded-full bg-white/5 text-[#A8ACB8] hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGroupSave()}
                    disabled={saving}
                    className="px-4 py-2 rounded-full bg-[#FFD700] text-[#070A15] font-semibold disabled:opacity-60"
                  >
                    {editingGroupId ? 'Save Group' : 'Create Group'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Slide-over form */}
          {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          />
          <div className="relative w-full max-w-3xl bg-[#070A15]/95 border border-white/10 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-['Space_Grotesk'] text-lg font-semibold text-[#F4F6FA]">
                  {editingId ? 'Edit Product' : 'Add Product'}
                </h2>
                <p className="text-xs text-[#A8ACB8]">Image preview is local until you save (URL stored in the database).</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
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
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
                  >
                    {categoryOptions.map(
                      cat => (
                        <option key={cat} value={cat} className="text-[#111827]">
                          {formatCategoryName(cat)}
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
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
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
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
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
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
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
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-[#A8ACB8] file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#F4F6FA] hover:file:bg-white/15 focus:outline-none focus:border-[#FFD700]"
                />
                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-[#6B7280]">
                    Paste a URL or use a data URL; the API stores the image field on the product.
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
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700] resize-none"
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
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700] resize-none"
                />
              </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A8ACB8]" htmlFor="admin-stock">
                  Stock quantity
                </label>
                <input
                  type="number"
                  id="admin-stock"
                  min={0}
                  value={formState.stockQuantity}
                  onChange={(e) => handleChange('stockQuantity', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('stockQuantity', String(Math.max(0, Number(formState.stockQuantity || 0) - 1)))}
                    className="px-3 py-1 rounded-lg bg-white/5 text-[#F4F6FA] hover:bg-white/10"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('stockQuantity', String(Math.max(0, Number(formState.stockQuantity || 0) + 1)))}
                    className="px-3 py-1 rounded-lg bg-white/5 text-[#F4F6FA] hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
                <p className="text-[11px] text-[#6B7280]">Listed as in stock when quantity is greater than zero.</p>
              </div>

              <div className="flex items-center justify-end pt-2">
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
                    disabled={saving}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-[#FFD700] text-[#070A15] hover:bg-[#ffe44d] disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
          )}
        </div>
      ) : (
        <main className="px-6 lg:px-12 py-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <button
                type="button"
                onClick={() => setInboxTab('invoices')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  inboxTab === 'invoices'
                    ? 'bg-[#FFD700] text-[#070A15]'
                    : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
                }`}
              >
                Invoices
              </button>
              <button
                type="button"
                onClick={() => setInboxTab('repairs')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  inboxTab === 'repairs'
                    ? 'bg-[#FFD700] text-[#070A15]'
                    : 'bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA]'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Repairs
              </button>
            </div>

            {inboxTab === 'invoices' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-['Space_Grotesk'] text-xl font-bold text-[#F4F6FA]">
                      Checkout orders
                    </h2>
                    <p className="text-sm text-[#A8ACB8]">
                      Firestore orders synced from customer checkout (read-only).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOrdersLoading(true);
                      api.admin
                        .firestoreOrders()
                        .then(setFirestoreOrders)
                        .catch(() => setFirestoreOrders([]))
                        .finally(() => setOrdersLoading(false));
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-[#A8ACB8] hover:bg-white/10 hover:text-[#F4F6FA] transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                {ordersLoading ? (
                  <p className="text-sm text-[#A8ACB8]">Loading orders…</p>
                ) : firestoreOrders.length === 0 ? (
                  <p className="text-sm text-[#A8ACB8]">No Firestore orders yet.</p>
                ) : (
                  <div className="space-y-3">
                    {firestoreOrders.map((o) => {
                      const id = String(o.id ?? '');
                      const num = String(o.orderNumber ?? id);
                      const total = o.total;
                      const cust = o.customer as { name?: string; email?: string } | undefined;
                      const created = o.createdAt ? String(o.createdAt) : '';
                      return (
                        <div
                          key={id}
                          className="rounded-2xl bg-[#111318] border border-white/5 p-4 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-mono text-sm text-[#FFD700]">{num}</p>
                            <p className="text-xs text-[#6B7280]">{created}</p>
                          </div>
                          <p className="text-sm text-[#F4F6FA]">
                            {cust?.name ?? '—'} · {cust?.email ?? '—'}
                          </p>
                          <p className="text-sm text-[#A8ACB8]">
                            Total:{' '}
                            <span className="text-[#F4F6FA]">
                              {typeof total === 'number'
                                ? `PHP ${total.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
                                : String(total ?? '—')}
                            </span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
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
                  void loadRepairsFromApi();
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
                    <ClipboardList className="w-4 h-4 text-[#FFD700]" />
                    Queue
                  </p>
                  <p className="text-xs text-[#A8ACB8]">
                    {repairsLoading ? 'Loading…' : `${repairs.length} total`}
                  </p>
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
                              <p className="text-[11px] text-[#6B7280]">
                                {new Date(r.createdAt).toLocaleString('en-PH')}
                              </p>
                            </div>
                            <span
                              className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${
                                resp?.status === 'done'
                                  ? 'bg-green-500/15 text-green-400'
                                  : resp
                                  ? 'bg-[#FFD700]/15 text-[#FFD700]'
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
                              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700]"
                            >
                              {(['new', 'quoted', 'scheduled', 'in_progress', 'done'] as const).map((s) => (
                                <option key={s} value={s} className="text-[#111827]">
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
                            className="w-full px-3 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-[#F4F6FA] focus:outline-none focus:border-[#FFD700] resize-none"
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
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD700] text-[#070A15] text-sm font-semibold hover:bg-[#ffe44d] transition-colors"
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
            )}
          </div>
        </main>
      )}
      {dragGhost && (
        <div
          className="fixed z-[80] pointer-events-none px-3 py-2 rounded-xl bg-[#111318] border border-[#FFD700]/40 shadow-lg text-sm text-[#F4F6FA] transition-transform"
          style={{ left: dragGhost.x + 14, top: dragGhost.y + 14, transform: 'translate3d(0,0,0)' }}
        >
          {dragGhost.name}
        </div>
      )}
    </div>
  );
}

