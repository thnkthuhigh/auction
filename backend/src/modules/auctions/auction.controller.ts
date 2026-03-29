import type { Response, NextFunction } from 'express';
import * as auctionService from './auction.service';
import { AppError } from '../../middlewares/error.middleware';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { getIO } from '../../socket/socket.server';

function requireUser(req: AuthenticatedRequest) {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
  }

  return req.user;
}

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

export async function getMyAuctions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const { status, page, limit } = req.query as Record<string, string>;

    const data = await auctionService.getMyAuctions(user.id, {
      status: status as never,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
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
    const user = requireUser(req);
    const data = await auctionService.createAuction(user.id, req.body);
    res.status(201).json({ success: true, data, message: 'Tao dau gia thanh cong' });
  } catch (error) {
    next(error);
  }
}

export async function updateAuction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const data = await auctionService.updateAuction(
      req.params.id,
      user.id,
      req.body,
      user.role === 'ADMIN',
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function deleteAuction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    await auctionService.deleteAuction(req.params.id, user.id, user.role === 'ADMIN');
    res.json({ success: true, message: 'Xoa dau gia thanh cong' });
  } catch (error) {
    next(error);
  }
}

export async function submitAuction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const data = await auctionService.submitAuctionForReview(req.params.id, user.id);
    res.json({ success: true, data, message: 'Gửi duyệt thành công' });
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

export async function getAdminSystemLogs(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { page, limit, level, source, search } = req.query as Record<string, string>;
    const data = await auctionService.getAdminSystemLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      level: level as never,
      source,
      search,
    });
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

export async function reviewAuction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const data = await auctionService.reviewAuction(req.params.id, user.id, req.body);
    res.json({ success: true, data, message: 'Cap nhat duyet san pham thanh cong' });
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
    try {
      const io = getIO();
      io.to(`auction:${req.params.id}`).emit('auction:updated', {
        auction: { id: req.params.id, status: 'CANCELLED' },
      });
    } catch {
      // ignore socket init errors in HTTP flow
    }
    res.json({ success: true, data, message: 'Huy phien dau gia thanh cong' });
  } catch (error) {
    next(error);
  }
}

export async function suspendAuctionSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await auctionService.suspendAuctionSession(req.params.id, req.body);
    try {
      const io = getIO();
      io.to(`auction:${req.params.id}`).emit('auction:updated', {
        auction: { id: req.params.id, status: 'SUSPENDED' },
      });
    } catch {
      // ignore socket init errors in HTTP flow
    }
    res.json({ success: true, data, message: 'Tam dung phien dau gia thanh cong' });
  } catch (error) {
    next(error);
  }
}
