import { Router } from 'express';
import * as bidController from './bid.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { placeBidSchema } from './bid.schema';

export const bidRoutes = Router();

bidRoutes.post('/', authMiddleware, validate(placeBidSchema), bidController.placeBid);
bidRoutes.get('/auction/:auctionId', bidController.getBidsByAuction);
