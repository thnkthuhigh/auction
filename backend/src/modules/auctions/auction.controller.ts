import { Response, NextFunction } from 'express';
import * as auctionService from './auction.service';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware';

export async function getAuctions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status, categoryId, search, page, limit, sortBy, sortOrder } = req.query as Record<
      string,
      string
    >;
    const data = await auctionService.getAuctions({
      status: status as never,
      categoryId,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

export async function getAuctionById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await auctionService.getAuctionById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createAuction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await auctionService.createAuction(req.user!.id, req.body);
    res.status(201).json({ success: true, data, message: 'Tạo đấu giá thành công' });
  } catch (error) {
    next(error);
  }
}

export async function updateAuction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await auctionService.updateAuction(req.params.id, req.user!.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function deleteAuction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await auctionService.deleteAuction(req.params.id, req.user!.id, req.user!.role === 'ADMIN');
    res.json({ success: true, message: 'Xoá đấu giá thành công' });
  } catch (error) {
    next(error);
  }
}

export async function getCategories(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await auctionService.getCategories();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
