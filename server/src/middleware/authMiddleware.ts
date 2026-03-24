import type { NextFunction, Request, Response } from 'express';
import { getFirebaseAdmin } from '../firebaseAdmin';

export type AuthedRequest = Request & {
  auth?: { userId: string; role: string; email?: string; name?: string };
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  void (async () => {
    try {
      const admin = getFirebaseAdmin();
      const decoded = await admin.auth().verifyIdToken(match[1]);
      const uid = decoded.uid;
      const userDoc = await admin.firestore().collection('users').doc(uid).get();
      const userDocEmail = String(userDoc.data()?.email ?? '').toLowerCase();
      const adminEmails = new Set(
        String(process.env.ADMIN_EMAILS ?? '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      );
      const tokenEmail = typeof decoded.email === 'string' ? decoded.email.toLowerCase() : '';
      const roleFromDoc = String(userDoc.data()?.role ?? 'USER').toUpperCase();
      const roleFromClaim = (decoded as { admin?: boolean }).admin ? 'ADMIN' : 'USER';
      const role =
        adminEmails.has(tokenEmail) || adminEmails.has(userDocEmail) || roleFromClaim === 'ADMIN'
          ? 'ADMIN'
          : roleFromDoc;
      req.auth = {
        userId: uid,
        role,
        email: typeof decoded.email === 'string' ? decoded.email : undefined,
        name: typeof decoded.name === 'string' ? decoded.name : undefined,
      };
      next();
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
    }
  })();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  next();
}

