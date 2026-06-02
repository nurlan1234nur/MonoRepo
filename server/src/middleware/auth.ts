import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

// req.userId-г баталгаажуулсан route-уудад нэмнэ.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Нэвтрэх шаардлагатай' });
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Token хүчингүй байна' });
  }
}
