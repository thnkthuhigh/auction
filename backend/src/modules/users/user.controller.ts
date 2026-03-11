import { Response, NextFunction } from 'express';
import * as userService from './user.service';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await userService.getMe(req.user!.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await userService.getUserById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await userService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, data, message: 'Cập nhật thành công' });
  } catch (error) {
    next(error);
  }
}

export async function getMyBids(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await userService.getMyBids(req.user!.id, page, limit);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

export async function getMyAuctions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await userService.getMyAuctions(req.user!.id, page, limit);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}
