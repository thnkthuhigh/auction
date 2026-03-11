import { Router } from 'express';
import * as auctionController from './auction.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createAuctionSchema, updateAuctionSchema } from './auction.schema';

export const auctionRoutes = Router();

// Public routes
auctionRoutes.get('/', auctionController.getAuctions);
auctionRoutes.get('/categories', auctionController.getCategories);
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
