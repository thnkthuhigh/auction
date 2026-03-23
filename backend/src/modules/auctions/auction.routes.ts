import { Router } from 'express';
import * as auctionController from './auction.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createAuctionSchema, updateAuctionSchema } from './auction.schema';

export const auctionRoutes = Router();

// Public routes
auctionRoutes.get('/', auctionController.getAuctions);
auctionRoutes.get('/categories', auctionController.getCategories);

// Protected routes — must be before /:id to avoid express matching 'my' as an id
auctionRoutes.get('/my', authMiddleware, auctionController.getMyAuctions);
auctionRoutes.get('/:id', auctionController.getAuctionById);
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
