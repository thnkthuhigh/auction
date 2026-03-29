import { Router } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { uploadImage } from './upload.controller';
import type { Request } from 'express';

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

export const uploadRoutes = Router();

uploadRoutes.post('/image', authMiddleware, upload.single('image'), uploadImage);
