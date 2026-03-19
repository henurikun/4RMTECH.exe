import { verifyAuthToken } from '../auth';
export function requireAuth(req, res, next) {
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
    }
    catch {
        res.status(401).json({ error: 'Unauthorized' });
    }
}
