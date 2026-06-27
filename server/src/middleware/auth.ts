import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  id: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'supersecretjwtkeyforchat2026';
    const decoded = jwt.verify(token, secret) as DecodedToken;

    (req as AuthRequest).user = {
      id: decoded.id,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired authorization token' });
  }
};
