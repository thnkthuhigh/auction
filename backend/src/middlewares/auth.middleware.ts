import { type Role } from '@prisma/client';
import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: Role;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res
      .status(500)
      .json({ success: false, message: 'Server misconfiguration: JWT secret missing' });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, role: true, isActive: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Forbidden: Account is locked' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
    });
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRoles('ADMIN');
export const requireUser = requireRoles('USER');
