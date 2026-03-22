import type { NextFunction, Request, Response } from 'express';
import { verifyAuthToken } from '../auth';

export type AuthedRequest = Request & {
  auth?: { userId: string; role: string };
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyAuthToken(match[1]);
    req.auth = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  next();
}

