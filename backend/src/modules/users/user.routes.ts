import { Router } from 'express';
import * as userController from './user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

export const userRoutes = Router();

userRoutes.use(authMiddleware);

userRoutes.get('/me', userController.getMe);
userRoutes.put('/me', userController.updateMe);
userRoutes.get('/me/bids', userController.getMyBids);
userRoutes.get('/me/auctions', userController.getMyAuctions);
userRoutes.get('/:id', userController.getUserById);
