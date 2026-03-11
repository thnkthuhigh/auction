import { Router } from 'express';
import * as bidController from './bid.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.middleware';

const placeBidSchema = z.object({
  auctionId: z.string().uuid(),
  amount: z.number().min(1000),
});

export const bidRoutes = Router();

bidRoutes.post('/', authMiddleware, validate(placeBidSchema), bidController.placeBid);
bidRoutes.get('/auction/:auctionId', bidController.getBidsByAuction);
