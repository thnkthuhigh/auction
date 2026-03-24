import { Router } from 'express';
import * as auctionController from './auction.controller';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createAuctionSchema,
  updateAuctionSchema,
  reviewAuctionSchema,
  createAuctionSessionSchema,
} from './auction.schema';

export const auctionRoutes = Router();

// Public routes
auctionRoutes.get('/', auctionController.getAuctions);
auctionRoutes.get('/categories', auctionController.getCategories);

// Admin routes
auctionRoutes.get(
  '/admin/review-queue',
  authMiddleware,
  requireAdmin,
  auctionController.getReviewQueue,
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

// Public detail route
auctionRoutes.get('/:id', auctionController.getAuctionById);

// Protected routes
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
