import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { requireAdmin, requireAuth, type AuthedRequest } from './middleware/authMiddleware';
import { getFirebaseAdmin } from './firebaseAdmin';
import { sendOrderNotifyEmail } from './orderEmail';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: false,
  })
);
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));

type ProductDoc = {
  sku?: string | null;
  name: string;
  description: string;
  category: string;
  imageUrl?: string | null;
  priceCents: number;
  originalPriceCents?: number | null;
  currency?: string;
  inStock: boolean;
  stockQuantity: number;
  badge?: string | null;
  specs?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type ProductRow = ReturnType<typeof mapProduct>;

type ProductCache = {
  byId: Map<string, ProductDoc>;
  rowById: Map<string, ProductRow>;
  rowsSorted: ProductRow[];
  loadedAt: string;
};

class AsyncMutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const unlock = await this.acquire();
    try {
      return await fn();
    } finally {
      unlock();
    }
  }

  private acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        this.locked = true;
        resolve(() => this.release());
      };

      if (!this.locked) tryAcquire();
      else this.queue.push(tryAcquire);
    });
  }

  private release() {
    const next = this.queue.shift();
    if (next) next();
    else this.locked = false;
  }
}

function db() {
  return getFirebaseAdmin().firestore();
}

function computeRole(email?: string, existingRole?: string): 'ADMIN' | 'USER' {
  const adminEmails = new Set(
    String(process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  if (email && adminEmails.has(email.toLowerCase())) return 'ADMIN';
  return String(existingRole ?? 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
}

function mapProduct(id: string, d: ProductDoc) {
  return {
    id,
    sku: d.sku ?? null,
    name: d.name,
    description: d.description ?? '',
    category: d.category,
    imageUrl: d.imageUrl ?? null,
    priceCents: Number(d.priceCents ?? 0),
    originalPriceCents: d.originalPriceCents ?? null,
    currency: d.currency ?? 'PHP',
    inStock: Boolean(d.inStock),
    stockQuantity: Number(d.stockQuantity ?? 0),
    badge: d.badge ?? null,
    specs: d.specs ?? {},
  };
}

let productCache: ProductCache | null = null;
const productCacheMutex = new AsyncMutex();

async function loadProductCatalogFromFirestore() {
  const snap = await db().collection('products').get();
  const byId = new Map<string, ProductDoc>();
  const rowById = new Map<string, ProductRow>();
  const rowsSorted: ProductRow[] = [];

  snap.docs.forEach((docSnap) => {
    const id = docSnap.id;
    const d = docSnap.data() as ProductDoc;
    byId.set(id, d);
    const row = mapProduct(id, d);
    rowById.set(id, row);
    rowsSorted.push(row);
  });

  rowsSorted.sort((a, b) => a.name.localeCompare(b.name));

  productCache = {
    byId,
    rowById,
    rowsSorted,
    loadedAt: new Date().toISOString(),
  };
}

async function ensureProductCacheLoaded() {
  if (productCache) return;
  await productCacheMutex.runExclusive(async () => {
    if (productCache) return;
    await loadProductCatalogFromFirestore();
  });
}

function upsertProductInCache(productId: string, doc: ProductDoc) {
  if (!productCache) return;

  const existingDoc = productCache.byId.get(productId);
  if (existingDoc) Object.assign(existingDoc, doc);
  else productCache.byId.set(productId, doc);

  const nextRow = mapProduct(productId, doc);
  const existingRow = productCache.rowById.get(productId);
  if (existingRow) Object.assign(existingRow, nextRow);
  else {
    productCache.rowById.set(productId, nextRow);
    productCache.rowsSorted.push(nextRow);
  }

  // If name/category changed, resort so `/api/products` stays sorted.
  productCache.rowsSorted.sort((a, b) => a.name.localeCompare(b.name));
}

function removeProductFromCache(productId: string) {
  if (!productCache) return;

  productCache.byId.delete(productId);
  const row = productCache.rowById.get(productId);
  productCache.rowById.delete(productId);
  if (!row) return;

  const idx = productCache.rowsSorted.indexOf(row);
  if (idx >= 0) productCache.rowsSorted.splice(idx, 1);
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return {
    year: Number(get('year') ?? 0),
    month: Number(get('month') ?? 1),
    day: Number(get('day') ?? 1),
    hour: Number(get('hour') ?? 0),
    minute: Number(get('minute') ?? 0),
  };
}

function startDailyProductCacheRefreshPT() {
  const ptZone = 'America/Los_Angeles';
  const now = new Date();
  const nowParts = getTimeZoneParts(now, ptZone);
  let lastReloadPTDateKey = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;

  // If we already passed today's 1:00 AM PT, prevent reloading again today.
  const passedTodayReset = nowParts.hour > 1 || (nowParts.hour === 1 && nowParts.minute >= 0);
  if (!passedTodayReset) lastReloadPTDateKey = '';

  setInterval(() => {
    const current = new Date();
    const parts = getTimeZoneParts(current, ptZone);
    if (parts.hour !== 1 || parts.minute !== 0) return;

    const key = `${parts.year}-${parts.month}-${parts.day}`;
    if (key === lastReloadPTDateKey) return;
    lastReloadPTDateKey = key;

    void productCacheMutex
      .runExclusive(async () => {
        await loadProductCatalogFromFirestore();
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('Daily product cache refresh failed:', e);
      });
  }, 20_000);
}

function makeStableProductId(name: string, category: string) {
  const base = `${category}:${name}`;
  const normalized = base
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return normalized.slice(0, 60) || 'product';
}

app.get('/api/me', requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.auth!.userId;
  const email = req.auth?.email ?? '';
  const ref = db().collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const role = computeRole(email, 'USER');
    await ref.set({
      uid,
      email,
      name: req.auth?.name ?? (req.auth?.email?.split('@')[0] ?? 'User'),
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    const cur = snap.data() as Record<string, unknown>;
    const effectiveEmail = email || String(cur.email ?? '');
    const nextRole = computeRole(effectiveEmail, String(cur.role ?? 'USER'));
    await ref.set(
      {
        email: effectiveEmail,
        role: nextRole,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
  const me = (await ref.get()).data() as Record<string, unknown>;
  return res.json({
    id: uid,
    name: String(me?.name ?? req.auth?.name ?? 'User'),
    email: String(me?.email ?? req.auth?.email ?? ''),
    role: String(me?.role ?? 'USER'),
  });
});

app.post('/api/auth/register', async (_req, res) =>
  res.status(410).json({ error: 'Use Firebase Auth client SDK for register.' })
);
app.post('/api/auth/login', async (_req, res) =>
  res.status(410).json({ error: 'Use Firebase Auth client SDK for login.' })
);
app.post('/api/auth/google', async (_req, res) =>
  res.status(410).json({ error: 'Use Firebase Auth client SDK for Google login.' })
);
app.get('/api/auth/firebase-custom-token', async (_req, res) =>
  res.status(410).json({ error: 'Deprecated: Firebase Auth is primary now.' })
);
app.post('/api/auth/change-password', async (_req, res) =>
  res.status(410).json({ error: 'Change password handled by Firebase Auth client flow.' })
);
app.post('/api/auth/forgot-password', async (_req, res) =>
  res.status(410).json({ error: 'Forgot password handled by Firebase Auth client flow.' })
);
app.post('/api/auth/reset-password', async (_req, res) =>
  res.status(410).json({ error: 'Reset password handled by Firebase Auth client flow.' })
);

app.get('/api/products', async (_req, res) => {
  await ensureProductCacheLoaded();
  if (!productCache) return res.status(503).json({ error: 'Product cache not ready' });
  return res.json(productCache.rowsSorted);
});

app.get('/api/products/:id', async (req, res) => {
  await ensureProductCacheLoaded();
  if (!productCache) return res.status(503).json({ error: 'Product cache not ready' });
  const id = String(req.params.id);
  const row = productCache.rowById.get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json(row);
});

app.post('/api/inventory/apply-order', requireAuth, async (req: AuthedRequest, res) => {
  const schema = z.object({
    items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) })),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  try {
    await productCacheMutex.runExclusive(async () => {
      await ensureProductCacheLoaded();
      if (!productCache) throw new Error('Product cache not ready');

      const qtyById = new Map<string, number>();
      for (const line of parsed.data.items) {
        qtyById.set(line.productId, (qtyById.get(line.productId) ?? 0) + line.quantity);
      }

      const updatedAt = new Date().toISOString();
      const nextById = new Map<string, number>();

      for (const [productId, qty] of qtyById.entries()) {
        const row = productCache.rowById.get(productId);
        if (!row) continue; // Product missing: match previous behavior

        const cur = Number(row.stockQuantity ?? 0);
        if (cur < qty) {
          throw new Error(`Insufficient stock for "${row.name}". Available: ${cur}.`);
        }

        const next = cur - qty;
        nextById.set(productId, next);
      }

      if (nextById.size > 0) {
        const updates = [...nextById.entries()];

        for (let i = 0; i < updates.length; i += 500) {
          const batch = db().batch();
          const slice = updates.slice(i, i + 500);
          for (const [productId, next] of slice) {
            batch.update(db().collection('products').doc(productId), {
              stockQuantity: next,
              inStock: next > 0,
              updatedAt,
            });
          }
          await batch.commit();
        }

        // Keep RAM cache coherent with Firestore writes.
        for (const [productId, next] of nextById.entries()) {
          const doc = productCache.byId.get(productId);
          if (doc) {
            doc.stockQuantity = next;
            doc.inStock = next > 0;
            doc.updatedAt = updatedAt;
          }

          const row = productCache.rowById.get(productId);
          if (row) {
            row.stockQuantity = next;
            row.inStock = next > 0;
          }
        }
      }
    });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(409).json({ error: e instanceof Error ? e.message : 'Stock update failed' });
  }
});

app.post('/api/inventory/rollback-order', requireAuth, async (req: AuthedRequest, res) => {
  const schema = z.object({
    items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) })),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  try {
    await productCacheMutex.runExclusive(async () => {
      await ensureProductCacheLoaded();
      if (!productCache) throw new Error('Product cache not ready');

      const qtyById = new Map<string, number>();
      for (const line of parsed.data.items) {
        qtyById.set(line.productId, (qtyById.get(line.productId) ?? 0) + line.quantity);
      }

      const updatedAt = new Date().toISOString();
      const nextById = new Map<string, number>();

      for (const [productId, qty] of qtyById.entries()) {
        const row = productCache.rowById.get(productId);
        if (!row) continue; // Product missing: match previous behavior

        const cur = Number(row.stockQuantity ?? 0);
        const next = cur + qty;
        nextById.set(productId, next);
      }

      if (nextById.size > 0) {
        const updates = [...nextById.entries()];
        for (let i = 0; i < updates.length; i += 500) {
          const batch = db().batch();
          const slice = updates.slice(i, i + 500);
          for (const [productId, next] of slice) {
            batch.update(db().collection('products').doc(productId), {
              stockQuantity: next,
              inStock: next > 0,
              updatedAt,
            });
          }
          await batch.commit();
        }

        for (const [productId, next] of nextById.entries()) {
          const doc = productCache.byId.get(productId);
          if (doc) {
            doc.stockQuantity = next;
            doc.inStock = next > 0;
            doc.updatedAt = updatedAt;
          }

          const row = productCache.rowById.get(productId);
          if (row) {
            row.stockQuantity = next;
            row.inStock = next > 0;
          }
        }
      }
    });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Rollback failed' });
  }
});

const productCreateSchema = z.object({
  id: z.string().min(1).optional(),
  sku: z.string().optional().nullable(),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().default(''),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().optional().nullable(),
  imageUrl: z.string().optional(),
  image: z.string().optional(),
  badge: z.string().optional().nullable(),
  stockQuantity: z.number().int().min(0).optional(),
  specs: z.record(z.string(), z.string()).optional(),
});
const productPatchSchema = productCreateSchema.partial();

app.post('/api/admin/products', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = productCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const input = parsed.data;
  const skuId = input.sku != null ? String(input.sku).trim() : '';
  const id =
    input.id ??
    (skuId
      ? skuId
      : makeStableProductId(
          String(input.name ?? ''),
          String(input.category ?? '')
        ));
  const stock = input.stockQuantity ?? 0;
  const row: ProductDoc = {
    sku: input.sku ?? null,
    name: input.name,
    category: input.category,
    description: input.description ?? '',
    imageUrl: input.imageUrl ?? input.image ?? null,
    priceCents: Math.round(input.price * 100),
    originalPriceCents: input.originalPrice != null ? Math.round(input.originalPrice * 100) : null,
    currency: 'PHP',
    stockQuantity: stock,
    inStock: stock > 0,
    badge: input.badge ?? null,
    specs: input.specs ?? {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db().collection('products').doc(id).set(row);
  const nextRow = mapProduct(id, row);
  await productCacheMutex.runExclusive(async () => {
    upsertProductInCache(id, row);
  });
  return res.json(nextRow);
});

app.patch('/api/admin/products/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = productPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const id = String(req.params.id);
  const ref = db().collection('products').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Not found' });
  const cur = snap.data() as ProductDoc;
  const d = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (d.name !== undefined) updates.name = d.name;
  if (d.category !== undefined) updates.category = d.category;
  if (d.description !== undefined) updates.description = d.description;
  if (d.sku !== undefined) updates.sku = d.sku;
  if (d.badge !== undefined) updates.badge = d.badge;
  if (d.specs !== undefined) updates.specs = d.specs;
  if (d.price !== undefined) updates.priceCents = Math.round(d.price * 100);
  if (d.originalPrice !== undefined) {
    updates.originalPriceCents = d.originalPrice != null ? Math.round(d.originalPrice * 100) : null;
  }
  if (d.imageUrl !== undefined || d.image !== undefined) updates.imageUrl = d.imageUrl ?? d.image ?? null;
  if (d.stockQuantity !== undefined) {
    updates.stockQuantity = d.stockQuantity;
    updates.inStock = d.stockQuantity > 0;
  }
  await ref.update(updates);
  const updatedDoc = { ...cur, ...updates } as ProductDoc;
  const nextRow = mapProduct(id, updatedDoc);
  await productCacheMutex.runExclusive(async () => {
    upsertProductInCache(id, updatedDoc);
  });
  return res.json(nextRow);
});

app.delete('/api/admin/products/clear', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
  try {
    const col = db().collection('products');
    const snap = await col.get();
    const docs = snap.docs;
    let deleted = 0;

    // Firestore allows up to 500 operations per batch.
    for (let i = 0; i < docs.length; i += 500) {
      const batch = db().batch();
      const slice = docs.slice(i, i + 500);
      slice.forEach((d) => {
        batch.delete(d.ref);
        deleted += 1;
      });
      await batch.commit();
    }

    await productCacheMutex.runExclusive(async () => {
      productCache = null;
    });

    const remaining = (await col.get()).size;
    return res.json({ ok: true, deleted, remaining });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to clear inventory' });
  }
});

app.delete('/api/admin/products/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const id = String(req.params.id);
  await db().collection('products').doc(id).delete();
  await productCacheMutex.runExclusive(async () => {
    removeProductFromCache(id);
  });
  return res.json({ ok: true });
});

const repairStatusSchema = z.enum(['new', 'quoted', 'scheduled', 'in_progress', 'done']);

app.post('/api/repairs', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    device: z.string().min(1),
    issue: z.string().min(1),
    contact: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const id = `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const row = {
    id,
    name: parsed.data.name.trim(),
    device: parsed.data.device.trim(),
    issue: parsed.data.issue.trim(),
    contact: parsed.data.contact.trim(),
    status: 'new',
    message: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db().collection('repairs').doc(id).set(row);
  try {
    await sendOrderNotifyEmail({
      subject: `[4RMTECH] New repair request ${id}`,
      text: [
        'New repair request (4RMTECH)',
        '',
        `Reference: ${id}`,
        `Date: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`,
        '',
        `Name: ${row.name}`,
        `Device: ${row.device}`,
        `Issue: ${row.issue}`,
        `Contact: ${row.contact}`,
      ].join('\n'),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('repair notify email failed', e);
  }
  return res.json({ id, status: row.status, createdAt: row.createdAt });
});

app.get('/api/repairs/:id/status', async (req, res) => {
  const id = String(req.params.id);
  const s = await db().collection('repairs').doc(id).get();
  if (!s.exists) return res.status(404).json({ error: 'Not found' });
  const d = s.data() as Record<string, unknown>;
  return res.json({
    id,
    status: String(d.status ?? 'new'),
    message: String(d.message ?? ''),
    createdAt: String(d.createdAt ?? ''),
    updatedAt: String(d.updatedAt ?? ''),
  });
});

app.post('/api/orders/notify-email', requireAuth, async (req: AuthedRequest, res) => {
  const schema = z.object({
    orderId: z.string(),
    orderNumber: z.string(),
    paymentFlow: z.enum(['cod', 'online']),
    onlineChannel: z.string().optional(),
    receiptUrl: z.string().url().optional().nullable(),
    bankTransfer: z
      .object({
        accountName: z.string().optional(),
        accountNumber: z.string().optional(),
        transactionReference: z.string().optional(),
      })
      .optional(),
    customer: z.object({
      name: z.string(),
      email: z.string(),
      phone: z.string(),
      address: z.string(),
    }),
    totalPhp: z.number(),
    items: z.array(z.object({ name: z.string(), quantity: z.number(), unitPrice: z.number() })),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const d = parsed.data;
  const when = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const payLine = d.paymentFlow === 'cod' ? 'Cash on delivery' : `Online — ${d.onlineChannel ?? 'unspecified'}`;
  const text = [
    'New order notification (4RMTECH)',
    '',
    `Date: ${when}`,
    `Order: ${d.orderNumber} (Firestore id: ${d.orderId})`,
    `Payment: ${payLine}`,
    `Total: PHP ${d.totalPhp.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`,
    '',
    'Items:',
    ...d.items.map((i) => `  - ${i.name} x${i.quantity} @ PHP ${i.unitPrice.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`),
    '',
    'Customer (shipping):',
    `  ${d.customer.name}`,
    `  ${d.customer.email}`,
    `  ${d.customer.phone}`,
    `  ${d.customer.address}`,
    '',
    `Account user: ${req.auth?.userId}`,
    ...(d.paymentFlow === 'online'
      ? [
          '',
          'Online payment verification details:',
          d.bankTransfer
            ? `  - Bank transfer account: ${d.bankTransfer.accountName ?? ''} ${d.bankTransfer.accountNumber ?? ''}`.trim()
            : '  - QR payment verification: no receipt uploaded',
          ...(d.bankTransfer ? [`  - Transaction reference: ${d.bankTransfer?.transactionReference ?? '(not provided)'}`] : []),
          `  - Receipt URL: ${d.receiptUrl ?? '(not provided)'}`,
          '  - Please verify and approve manually (customer will wait 1-2 hours).',
        ]
      : []),
  ].join('\n');
  try {
    await sendOrderNotifyEmail({
      subject: `[4RMTECH] Order ${d.orderNumber} — ${payLine}`,
      text,
      receiptUrl: d.receiptUrl ?? undefined,
    });
    return res.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

app.get('/api/admin/firestore-orders', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
  try {
    const snap = await db().collection('orders').limit(300).get();
    const rows: Array<Record<string, unknown> & { id: string }> = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
    }));
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(String(a.createdAt)).getTime() : 0;
      const tb = b.createdAt ? new Date(String(b.createdAt)).getTime() : 0;
      return tb - ta;
    });
    return res.json(rows);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: 'Failed to load Firestore orders' });
  }
});

app.get('/api/admin/repairs', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
  const snap = await db().collection('repairs').orderBy('createdAt', 'desc').limit(300).get();
  return res.json(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })));
});

app.patch('/api/admin/repairs/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const schema = z.object({ status: repairStatusSchema, message: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const id = String(req.params.id);
  const ref = db().collection('repairs').doc(id);
  const s = await ref.get();
  if (!s.exists) return res.status(404).json({ error: 'Not found' });
  await ref.set(
    {
      status: parsed.data.status,
      ...(parsed.data.message !== undefined ? { message: parsed.data.message.trim() } : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  const n = (await ref.get()).data() as Record<string, unknown>;
  return res.json({ id, status: String(n.status ?? 'new'), message: String(n.message ?? ''), updatedAt: String(n.updatedAt ?? '') });
});

const port = Number(process.env.PORT ?? 4000);
async function startServer() {
  // Warm the in-memory product cache once so browsing doesn't hit Firestore.
  await productCacheMutex.runExclusive(async () => {
    if (!productCache) await loadProductCatalogFromFirestore();
  });

  startDailyProductCacheRefreshPT();

  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
  app.listen(port, () => {});
}

void startServer().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', e);
  // Even if the cache warmup fails, still start the server; endpoints will load on-demand.
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port}`);
  });
});
