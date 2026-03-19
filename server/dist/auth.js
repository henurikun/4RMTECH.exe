import jwt from 'jsonwebtoken';
import { z } from 'zod';
const JwtPayloadSchema = z.object({
    userId: z.string().min(1),
    role: z.string().min(1),
});
function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error('JWT_SECRET is not set');
    return secret;
}
export function signAuthToken(payload) {
    return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
}
export function verifyAuthToken(token) {
    const decoded = jwt.verify(token, getSecret());
    return JwtPayloadSchema.parse(decoded);
}
