import { Router } from 'express';
import * as auctionController from './auction.controller';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createAuctionSchema,
  updateAuctionSchema,
  reviewAuctionSchema,
  createAuctionSessionSchema,
  updateAuctionSessionConfigSchema,
  cancelAuctionSessionSchema,
} from './auction.schema';

export const auctionRoutes = Router();

// ===== Public routes =====
auctionRoutes.get('/', auctionController.getAuctions);
auctionRoutes.get('/categories', auctionController.getCategories);

// ===== Protected routes (đặt trước /:id để tránh match sai) =====
auctionRoutes.get('/my', authMiddleware, auctionController.getMyAuctions);

// ===== Admin routes =====
auctionRoutes.get(
  '/admin/review-queue',
  authMiddleware,
  requireAdmin,
  auctionController.getReviewQueue,
);

auctionRoutes.get(
  '/admin/monitoring',
  authMiddleware,
  requireAdmin,
  auctionController.getAdminMonitoring,
);

auctionRoutes.get(
  '/admin/system-logs',
  authMiddleware,
  requireAdmin,
  auctionController.getAdminSystemLogs,
);

auctionRoutes.patch(
  '/:id/review',
  authMiddleware,
  requireAdmin,
  validate(reviewAuctionSchema),
  auctionController.reviewAuction,
);

auctionRoutes.patch(
  '/:id/session',
  authMiddleware,
  requireAdmin,
  validate(createAuctionSessionSchema),
  auctionController.createAuctionSession,
);

auctionRoutes.patch(
  '/:id/session-config',
  authMiddleware,
  requireAdmin,
  validate(updateAuctionSessionConfigSchema),
  auctionController.updateAuctionSessionConfig,
);

auctionRoutes.patch(
  '/:id/session/cancel',
  authMiddleware,
  requireAdmin,
  validate(cancelAuctionSessionSchema),
  auctionController.cancelAuctionSession,
);

auctionRoutes.patch(
  '/:id/session/suspend',
  authMiddleware,
  requireAdmin,
  validate(cancelAuctionSessionSchema),
  auctionController.suspendAuctionSession,
);

// ===== Public detail route =====
auctionRoutes.get('/:id', auctionController.getAuctionById);

// ===== CRUD =====
auctionRoutes.post(
  '/',
  authMiddleware,
  validate(createAuctionSchema),
  auctionController.createAuction,
);

auctionRoutes.put(
  '/:id',
  authMiddleware,
  validate(updateAuctionSchema),
  auctionController.updateAuction,
);

auctionRoutes.delete('/:id', authMiddleware, auctionController.deleteAuction);
auctionRoutes.post('/:id/submit', authMiddleware, auctionController.submitAuction);
