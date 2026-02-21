import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../db/models/index.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Проверка JWT токена
 */
export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ success: false, error: 'Токен не предоставлен' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
      role: string;
    };

    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Пользователь не найден или отключён' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    res.status(403).json({ success: false, error: 'Недействительный токен' });
  }
}

/**
 * Проверка роли администратора
 */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    res.status(403).json({ success: false, error: 'Доступ запрещён' });
    return;
  }
  next();
}

/**
 * Проверка роли супер-администратора
 */
export function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'super_admin') {
    res.status(403).json({ success: false, error: 'Доступ запрещён' });
    return;
  }
  next();
}
