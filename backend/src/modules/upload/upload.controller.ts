import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middlewares/auth.middleware';
import { AppError } from '../../middlewares/error.middleware';

export function uploadImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError('Không có file nào được upload', 400);
    }

    const protocol = req.protocol;
    const host = req.get('host') ?? 'localhost:5000';
    const url = `${protocol}://${host}/uploads/${req.file.filename}`;

    res.status(201).json({ success: true, data: { url } });
  } catch (error) {
    next(error);
  }
}
