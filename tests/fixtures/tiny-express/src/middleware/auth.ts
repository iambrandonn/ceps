import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Simple token validation (not production-ready)
  if (!token.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Invalid token format' });
    return;
  }

  next();
}
