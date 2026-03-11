import { Response, NextFunction } from 'express';
import * as bidService from './bid.service';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export async function placeBid(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { auctionId, amount } = req.body;
    const data = await bidService.placeBid(req.user!.id, auctionId, amount);
    res.status(201).json({ success: true, data, message: 'Đặt giá thành công' });
  } catch (error) {
    next(error);
  }
}

export async function getBidsByAuction(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await bidService.getBidsByAuction(req.params.auctionId, page, limit);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}
