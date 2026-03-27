import type { ApiProductRow } from './productMap';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

let inMemoryToken: string | null = null;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  if (inMemoryToken) return inMemoryToken;
  try {
    return window.localStorage.getItem('4rmtech_api_token');
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  inMemoryToken = token;
  try {
    if (!token) window.localStorage.removeItem('4rmtech_api_token');
    else window.localStorage.setItem('4rmtech_api_token', token);
  } catch {
    // ignore
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data && typeof (data as any).error === 'string'
        ? (data as any).error
        : `Request failed (${res.status})`) as string;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

export type AdminProductPayload = {
  id?: string;
  sku?: string | null;
  name: string;
  category: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  imageUrl?: string;
  image?: string;
  badge?: string | null;
  inStock?: boolean;
  stockQuantity?: number;
  specs?: Record<string, string>;
};

export type ProductGroupType = 'variant' | 'set';

export type ProductGroupMember = {
  productId: string;
  qtyPerSet?: number;
  sortOrder?: number;
  name?: string;
  image?: string | null;
  description?: string;
  price?: number;
};

export type ProductGroupPayload = {
  id?: string;
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
  badge?: string | null;
  price?: number;
  originalPrice?: number | null;
  groupType: ProductGroupType;
  status?: 'active' | 'draft';
  items?: ProductGroupMember[];
};

export type ProductGroupRow = {
  id: string;
  kind: 'group';
  name: string;
  category: string;
  description: string;
  imageUrl: string | null;
  badge: string | null;
  priceCents: number;
  originalPriceCents: number | null;
  currency: string;
  groupType: ProductGroupType;
  status: 'active' | 'draft';
  inStock: boolean;
  stockQuantity: number;
  groupItems: ProductGroupMember[];
};

export type OrderNotifyPayload = {
  orderId: string;
  orderNumber: string;
  paymentFlow: 'cod' | 'online';
  onlineChannel?: string;
  customer: { name: string; email: string; phone: string; address: string };
  totalPhp: number;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    kind?: 'product' | 'group';
    groupType?: ProductGroupType;
    selectedGroupItemId?: string;
    selectedGroupItemName?: string;
  }[];
  /** Storage path for the uploaded receipt (preferred; avoids browser CORS). */
  receiptStoragePath?: string | null;
  /** Optional: legacy support (download URL). */
  receiptUrl?: string | null;
  /** Optional: attach receipt directly (no Firebase Storage needed). */
  receiptAttachment?: {
    filename: string;
    contentType: string;
    dataBase64: string;
  } | null;
  /** Optional: bank transfer details shown to the store/admin for verification. */
  bankTransfer?: {
    accountName?: string;
    accountNumber?: string;
    transactionReference?: string;
  };
};

export type RepairStatus = 'new' | 'quoted' | 'scheduled' | 'in_progress' | 'done';
export type InventoryOrderItem = {
  productId: string;
  quantity: number;
  kind?: 'product' | 'group';
  groupType?: ProductGroupType;
  selectedGroupItemId?: string;
  groupItems?: ProductGroupMember[];
};
export type RepairTicket = {
  id: string;
  name: string;
  device: string;
  issue: string;
  contact: string;
  status: RepairStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export const api = {
  auth: {
    register: (input: { name: string; email: string; password: string }) =>
      request<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
        '/api/auth/register',
        { method: 'POST', body: JSON.stringify(input) }
      ),
    login: (input: { email: string; password: string }) =>
      request<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify(input) }
      ),
    google: (input: { idToken: string }) =>
      request<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
        '/api/auth/google',
        { method: 'POST', body: JSON.stringify(input) }
      ),
    me: () => request<{ id: string; name: string; email: string; role: string }>('/api/me'),
    changePassword: (input: { currentPassword: string; newPassword: string }) =>
      request<{ ok: true }>('/api/auth/change-password', { method: 'POST', body: JSON.stringify(input) }),
    forgotPassword: (input: { email: string }) =>
      request<{ ok: true }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(input) }),
    resetPassword: (input: { token: string; newPassword: string }) =>
      request<{ ok: true }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(input) }),
    /** Mint Firebase Auth custom token (uid = API user id) for Firestore cart/checkout. */
    firebaseCustomToken: () => request<{ token: string }>('/api/auth/firebase-custom-token'),
  },
  products: {
    list: () => request<ApiProductRow[]>('/api/products'),
    groups: () => request<ProductGroupRow[]>('/api/product-groups'),
  },
  inventory: {
    applyOrder: (input: { items: InventoryOrderItem[] }) =>
      request<{ ok: true }>('/api/inventory/apply-order', { method: 'POST', body: JSON.stringify(input) }),
    rollbackOrder: (input: { items: InventoryOrderItem[] }) =>
      request<{ ok: true }>('/api/inventory/rollback-order', { method: 'POST', body: JSON.stringify(input) }),
  },
  orders: {
    notifyEmail: (input: OrderNotifyPayload) =>
      request<{ ok: true }>('/api/orders/notify-email', { method: 'POST', body: JSON.stringify(input) }),
  },
  repairs: {
    create: (input: { name: string; device: string; issue: string; contact: string }) =>
      request<{ id: string; status: RepairStatus; createdAt: string }>('/api/repairs', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getStatus: (id: string) =>
      request<{ id: string; status: RepairStatus; message: string; createdAt: string; updatedAt: string }>(
        `/api/repairs/${encodeURIComponent(id)}/status`
      ),
  },
  admin: {
    createProduct: (input: AdminProductPayload) =>
      request<ApiProductRow>('/api/admin/products', { method: 'POST', body: JSON.stringify(input) }),
    updateProduct: (id: string, input: Partial<AdminProductPayload>) =>
      request<ApiProductRow>(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteProduct: (id: string) => request<{ ok: true }>(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    clearProducts: () => request<{ ok: true; deleted: number }>('/api/admin/products/clear', { method: 'DELETE' }),
    groups: () => request<ProductGroupRow[]>('/api/admin/product-groups'),
    createGroup: (input: ProductGroupPayload) =>
      request<ProductGroupRow>('/api/admin/product-groups', { method: 'POST', body: JSON.stringify(input) }),
    updateGroup: (id: string, input: Partial<ProductGroupPayload>) =>
      request<ProductGroupRow>(`/api/admin/product-groups/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteGroup: (id: string) =>
      request<{ ok: true }>(`/api/admin/product-groups/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    addGroupItems: (groupId: string, input: { items: ProductGroupMember[] }) =>
      request<ProductGroupRow>(`/api/admin/product-groups/${encodeURIComponent(groupId)}/products:add`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    removeGroupItems: (groupId: string, input: { productIds: string[] }) =>
      request<ProductGroupRow>(`/api/admin/product-groups/${encodeURIComponent(groupId)}/products:remove`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    firestoreOrders: () => request<Record<string, unknown>[]>('/api/admin/firestore-orders'),
    repairs: () => request<RepairTicket[]>('/api/admin/repairs'),
    updateRepair: (id: string, input: { status: RepairStatus; message?: string }) =>
      request<{ id: string; status: RepairStatus; message: string; updatedAt: string }>(
        `/api/admin/repairs/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: JSON.stringify(input) }
      ),
  },
};

