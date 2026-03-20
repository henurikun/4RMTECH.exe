import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { signAuthToken } from './auth';
import { requireAuth, type AuthedRequest } from './middleware/authMiddleware';

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

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});

