import type { Response, NextFunction } from 'express';
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

export async function submitAuction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await auctionService.submitAuctionForReview(req.params.id, req.user!.id);
    res.json({ success: true, data, message: 'Gửi duyệt thành công' });
  } catch (error) {
    next(error);
  }
}

export async function getMyAuctions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status, page, limit } = req.query as Record<string, string>;
    const data = await auctionService.getMyAuctions(req.user!.id, {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, ...data });
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

export async function getReviewQueue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const data = await auctionService.getReviewQueue({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

export async function getAdminMonitoring(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { page, limit, search, status, reviewStatus, sortBy, sortOrder } = req.query as Record<
      string,
      string
    >;
    const data = await auctionService.getAdminMonitoring({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status: status as never,
      reviewStatus: reviewStatus as never,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

export async function reviewAuction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await auctionService.reviewAuction(req.params.id, req.user!.id, req.body);
    res.json({ success: true, data, message: 'Cập nhật duyệt sản phẩm thành công' });
  } catch (error) {
    next(error);
  }
}

export async function createAuctionSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await auctionService.createAuctionSession(req.params.id, req.body);
    res.json({ success: true, data, message: 'Tao phien dau gia thanh cong' });
  } catch (error) {
    next(error);
  }
}

export async function updateAuctionSessionConfig(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await auctionService.updateAuctionSessionConfig(req.params.id, req.body);
    res.json({ success: true, data, message: 'Cap nhat cau hinh phien thanh cong' });
  } catch (error) {
    next(error);
  }
}

export async function cancelAuctionSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await auctionService.cancelAuctionSession(req.params.id, req.body);
    res.json({ success: true, data, message: 'Huy phien dau gia thanh cong' });
  } catch (error) {
    next(error);
  }
}
