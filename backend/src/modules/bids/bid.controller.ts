import { type NextFunction, type Response } from 'express';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import * as bidService from './bid.service';

export async function placeBid(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { auctionId, amount, clientRequestId } = req.body;
    const data = await bidService.placeBid(req.user.id, auctionId, amount, clientRequestId);
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
