const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  try {
    return window.localStorage.getItem('4rmtech_api_token');
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
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
    me: () => request<{ id: string; name: string; email: string; role: string }>('/api/me'),
  },
  cart: {
    get: () =>
      request<{ items: { id: string; productId: string; quantity: number; product: any }[] }>(
        '/api/cart'
      ),
    add: (input: {
      productId: string;
      quantity?: number;
      product?: { name: string; category: string; price: number; image?: string; description?: string };
    }) =>
      request<{ id: string; productId: string; quantity: number; product: any }>(
        '/api/cart/items',
        {
        method: 'POST',
          body: JSON.stringify(input),
        }
      ),
    update: (id: string, input: { quantity: number }) =>
      request<{ id: string; productId: string; quantity: number; product: any }>(
        `/api/cart/items/${id}`,
        { method: 'PATCH', body: JSON.stringify(input) }
      ),
    remove: (id: string) => request<{ ok: true }>(`/api/cart/items/${id}`, { method: 'DELETE' }),
    clear: () => request<{ ok: true }>(`/api/cart`, { method: 'DELETE' }),
  },
  checkout: {
    placeOrder: (input: { customer: { name: string; email: string; phone: string; address: string } }) =>
      request<{ order: any }>('/api/checkout/place-order', { method: 'POST', body: JSON.stringify(input) }),
    createPayment: (orderId: string, input: { provider: 'COD' | 'GCASH' | 'CARD'; reference?: string }) =>
      request<{ payment: any }>(`/api/orders/${orderId}/payment`, { method: 'POST', body: JSON.stringify(input) }),
  },
  orders: {
    list: () => request<any[]>('/api/orders'),
  },
};

