import { Router } from 'express';
import * as userController from './user.controller';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { updateUserLockSchema } from './user.schema';

export const userRoutes = Router();

userRoutes.use(authMiddleware);

userRoutes.get('/me', userController.getMe);
userRoutes.put('/me', userController.updateMe);
userRoutes.get('/me/bids', userController.getMyBids);
userRoutes.get('/me/auctions', userController.getMyAuctions);
userRoutes.get('/admin/list', requireAdmin, userController.getAdminUsers);
userRoutes.patch(
  '/admin/:id/status',
  requireAdmin,
  validate(updateUserLockSchema),
  userController.updateUserLockStatus,
);
userRoutes.get('/:id', userController.getUserById);
