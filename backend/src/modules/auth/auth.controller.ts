import { type Request, type Response, type NextFunction } from 'express';
import * as authService from './auth.service';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result, message: 'Đăng ký thành công' });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result, message: 'Đăng nhập thành công' });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (error) {
    next(error);
  }
}

export function logout(_req: Request, res: Response) {
  // Client-side: discard tokens
  // Future: add token to Redis blacklist
  res.json({ success: true, message: 'Đăng xuất thành công' });
}
