import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { signAuthToken } from './auth';
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

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase(), passwordHash, role: 'USER', cart: { create: {} } },
  });

  const token = signAuthToken({ userId: user.id, role: user.role });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signAuthToken({ userId: user.id, role: user.role });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get('/api/me', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

/** Firebase Auth custom token: uid matches Prisma user id (used by Firestore rules + client SDK). */
app.get('/api/auth/firebase-custom-token', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  try {
    const token = await getFirebaseAdmin().auth().createCustomToken(userId);
    return res.json({ token });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('firebase createCustomToken failed', e);
    return res.status(500).json({ error: 'Firebase token unavailable' });
  }
});

/** Sign in / register via Firebase Google ID token; returns same JWT shape as password login. */
app.post('/api/auth/google', async (req, res) => {
  const schema = z.object({ idToken: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  let decoded: { email?: string; name?: string };
  try {
    decoded = await getFirebaseAdmin().auth().verifyIdToken(parsed.data.idToken);
  } catch {
    return res.status(401).json({ error: 'Invalid Google token' });
  }

  const emailRaw = decoded.email;
  if (!emailRaw) return res.status(400).json({ error: 'Google account has no email' });

  const email = emailRaw.toLowerCase();
  const name = (decoded.name as string | undefined)?.trim() || email.split('@')[0] || 'User';

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'USER',
        cart: { create: {} },
      },
    });
  }

  const token = signAuthToken({ userId: user.id, role: user.role });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// ---------- Products ----------
app.get('/api/products', async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  return res.json(products);
});

app.get('/api/products/:id', async (req, res) => {
  const p = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: 'Not found' });
  return res.json(p);
});

/** Decrement PostgreSQL stock after a Firestore checkout order (skips unknown product ids). */
app.post('/api/inventory/apply-order', requireAuth, async (req: AuthedRequest, res) => {
  const schema = z.object({
    items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) })),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  try {
    await prisma.$transaction(async (tx) => {
      for (const line of parsed.data.items) {
        const p = await tx.product.findUnique({ where: { id: line.productId } });
        if (!p) continue;
        if (p.stockQuantity < line.quantity) {
          throw new Error(`Insufficient stock for “${p.name}”. Available: ${p.stockQuantity}.`);
        }
        const next = p.stockQuantity - line.quantity;
        await tx.product.update({
          where: { id: p.id },
          data: {
            stockQuantity: next,
            inStock: next > 0,
          },
        });
      }
    });
    return res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Stock update failed';
    return res.status(409).json({ error: msg });
  }
});

app.post('/api/inventory/rollback-order', requireAuth, async (req: AuthedRequest, res) => {
  const schema = z.object({
    items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1) })),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  try {
    await prisma.$transaction(async (tx) => {
      for (const line of parsed.data.items) {
        const p = await tx.product.findUnique({ where: { id: line.productId } });
        if (!p) continue;
        const next = p.stockQuantity + line.quantity;
        await tx.product.update({
          where: { id: p.id },
          data: {
            stockQuantity: next,
            inStock: next > 0,
          },
        });
      }
    });
    return res.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
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
  inStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  specs: z.record(z.string(), z.string()).optional(),
});

const productPatchSchema = productCreateSchema.partial();

// ---------- Admin products (PostgreSQL) ----------
app.post('/api/admin/products', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = productCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const input = parsed.data;
  const img = input.imageUrl ?? input.image ?? null;
  const sq = input.stockQuantity ?? 0;

  try {
    const created = await prisma.product.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        sku: input.sku ?? undefined,
        name: input.name,
        category: input.category,
        description: input.description,
        imageUrl: img ?? undefined,
        priceCents: Math.round(input.price * 100),
        originalPriceCents:
          input.originalPrice != null ? Math.round(input.originalPrice * 100) : null,
        stockQuantity: sq,
        inStock: sq > 0,
        badge: input.badge ?? undefined,
        specs: input.specs ?? undefined,
        currency: 'PHP',
      },
    });
    return res.json(created);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(409).json({ error: 'Could not create product (duplicate id or sku?)' });
  }
});

app.patch('/api/admin/products/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = productPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const d = parsed.data;
  const id = String(req.params.id);

  const data: Record<string, unknown> = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.category !== undefined) data.category = d.category;
  if (d.description !== undefined) data.description = d.description;
  if (d.stockQuantity !== undefined) {
    data.stockQuantity = d.stockQuantity;
    data.inStock = d.stockQuantity > 0;
  } else if (d.inStock !== undefined) {
    data.inStock = d.inStock;
  }
  if (d.sku !== undefined) data.sku = d.sku;
  if (d.badge !== undefined) data.badge = d.badge;
  if (d.specs !== undefined) data.specs = d.specs;
  if (d.price !== undefined) data.priceCents = Math.round(d.price * 100);
  if (d.originalPrice !== undefined) {
    data.originalPriceCents = d.originalPrice != null ? Math.round(d.originalPrice * 100) : null;
  }
  if (d.imageUrl !== undefined || d.image !== undefined) {
    const img = d.imageUrl ?? d.image;
    data.imageUrl = img ?? null;
  }

  try {
    const updated = await prisma.product.update({ where: { id }, data: data as object });
    return res.json(updated);
  } catch {
    return res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/admin/products/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const id = String(req.params.id);
  const inOrders = await prisma.orderItem.count({ where: { productId: id } });
  if (inOrders > 0) {
    return res.status(409).json({ error: 'Product is referenced by orders; set out of stock instead.' });
  }

  try {
    await prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: 'Could not delete product' });
  }
});

// ---------- Cart ----------
app.get('/api/cart', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  if (!cart) return res.json({ items: [] });
  return res.json({
    items: cart.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      product: i.product,
    })),
  });
});

app.post('/api/cart/items', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  const schema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(999).default(1),
    // Optional product details so the frontend can add items even if the product
    // record isn't seeded yet (e.g., PC Builder "extras" or component carts).
    product: z
      .object({
        name: z.string().min(1),
        category: z.string().min(1),
        price: z.number().nonnegative(),
        image: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { productId, quantity, product: productInput } = parsed.data;

  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // Ensure the product exists (create it from optional input when needed).
  const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
  if (!existingProduct) {
    if (!productInput) {
      res.status(400).json({ error: 'Product not found and no product details provided.' });
      return;
    }

    await prisma.product.create({
      data: {
        id: productId,
        name: productInput.name,
        category: productInput.category,
        description: productInput.description ?? 'No description.',
        imageUrl: productInput.image,
        priceCents: Math.round(productInput.price * 100),
        inStock: true,
      },
    });
  }

  const item = await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity: { increment: quantity } },
    create: { cartId: cart.id, productId, quantity },
    include: { product: true },
  });

  return res.json({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    product: item.product,
  });
});

app.delete('/api/cart', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
  if (!cart) return res.json({ ok: true });

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return res.json({ ok: true });
});

app.patch('/api/cart/items/:id', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  const schema = z.object({ quantity: z.number().int().min(0).max(999) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return res.status(404).json({ error: 'Cart not found' });

  const item = await prisma.cartItem.findUnique({ where: { id: String(req.params.id) } });
  if (!item || item.cartId !== cart.id) return res.status(404).json({ error: 'Not found' });

  if (parsed.data.quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return res.json({ ok: true });
  }

  const updated = await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: parsed.data.quantity },
    include: { product: true },
  });
  return res.json({
    id: updated.id,
    productId: updated.productId,
    quantity: updated.quantity,
    product: updated.product,
  });
});

app.delete('/api/cart/items/:id', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return res.status(404).json({ error: 'Cart not found' });

  const item = await prisma.cartItem.findUnique({ where: { id: String(req.params.id) } });
  if (!item || item.cartId !== cart.id) return res.status(404).json({ error: 'Not found' });

  await prisma.cartItem.delete({ where: { id: item.id } });
  return res.json({ ok: true });
});

// ---------- Checkout / Orders ----------
app.post('/api/checkout/place-order', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  const schema = z.object({
    customer: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(1),
      address: z.string().min(1),
    }),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const subtotalCents = cart.items.reduce((sum, i) => sum + i.product.priceCents * i.quantity, 0);
  const shippingCents = subtotalCents > 0 ? 9900 : 0; // ₱99
  const totalCents = subtotalCents + shippingCents;
  const orderNumber = `ORD-${Date.now()}`;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        subtotalCents,
        shippingCents,
        totalCents,
        currency: 'PHP',
        customerName: parsed.data.customer.name,
        customerEmail: parsed.data.customer.email,
        customerPhone: parsed.data.customer.phone,
        shippingAddress: parsed.data.customer.address,
        status: 'PENDING',
        items: {
          create: cart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCents: i.product.priceCents,
            totalCents: i.product.priceCents * i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return created;
  });

  return res.json({ order });
});

app.post('/api/orders/:orderId/payment', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  const schema = z.object({
    provider: z.enum(['COD', 'GCASH', 'CARD']),
    reference: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const order = await prisma.order.findUnique({ where: { id: String(req.params.orderId) } });
  if (!order || order.userId !== userId) return res.status(404).json({ error: 'Not found' });

  const payment = await prisma.$transaction(async (tx) => {
    const paymentCreated = await tx.payment.create({
      data: {
        orderId: order.id,
        provider: parsed.data.provider,
        // Demo behavior: mark non-COD payments as PAID immediately.
        status: parsed.data.provider === 'COD' ? 'PENDING' : 'PAID',
        amountCents: order.totalCents,
        currency: order.currency,
        reference: parsed.data.reference,
      },
    });

    if (parsed.data.provider === 'COD') {
      return paymentCreated;
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID' },
    });

    return paymentCreated;
  });

  return res.json({ payment });
});

app.get('/api/orders', requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.auth!.userId;
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { product: true } }, payments: true },
  });
  return res.json(orders);
});

/** Email company inboxes when SMTP + NOTIFY_TO_EMAILS are configured (else logs to server console). */
app.post('/api/orders/notify-email', requireAuth, async (req: AuthedRequest, res) => {
  const schema = z.object({
    orderId: z.string(),
    orderNumber: z.string(),
    paymentFlow: z.enum(['cod', 'online']),
    onlineChannel: z.string().optional(),
    customer: z.object({
      name: z.string(),
      email: z.string(),
      phone: z.string(),
      address: z.string(),
    }),
    totalPhp: z.number(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const d = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  const who = user ? `${user.name} <${user.email}>` : req.auth!.userId;
  const when = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const payLine =
    d.paymentFlow === 'cod' ? 'Cash on delivery' : `Online — ${d.onlineChannel ?? 'unspecified'}`;
  const text = [
    'New order notification (4RMTECH)',
    '',
    `Date: ${when}`,
    `Order: ${d.orderNumber} (Firestore id: ${d.orderId})`,
    `Payment: ${payLine}`,
    `Total: PHP ${d.totalPhp.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`,
    '',
    'Customer (shipping):',
    `  ${d.customer.name}`,
    `  ${d.customer.email}`,
    `  ${d.customer.phone}`,
    `  ${d.customer.address}`,
    '',
    `Account user: ${who}`,
  ].join('\n');
  try {
    await sendOrderNotifyEmail({
      subject: `[4RMTECH] Order ${d.orderNumber} — ${payLine}`,
      text,
    });
    return res.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

/** Firestore checkout orders (invoices) for admin dashboard. */
app.get('/api/admin/firestore-orders', requireAuth, requireAdmin, async (_req: AuthedRequest, res) => {
  try {
    const db = getFirebaseAdmin().firestore();
    const snap = await db.collection('orders').limit(200).get();
    const rows = snap.docs.map((doc) => {
      const data = doc.data();
      const created = data.createdAt;
      let createdIso: string | null = null;
      if (created && typeof created.toDate === 'function') {
        createdIso = created.toDate().toISOString();
      }
      return {
        id: doc.id,
        ...data,
        createdAt: createdIso,
      };
    });
    rows.sort((a: { createdAt?: string | null }, b: { createdAt?: string | null }) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return res.json(rows);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: 'Failed to load Firestore orders' });
  }
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});

