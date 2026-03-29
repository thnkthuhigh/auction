import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { authRoutes } from './modules/auth/auth.routes';
import { userRoutes } from './modules/users/user.routes';
import { auctionRoutes } from './modules/auctions/auction.routes';
import { bidRoutes } from './modules/bids/bid.routes';
import { uploadRoutes } from './modules/upload/upload.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { logger } from './utils/logger';

const app = express();

function resolveAllowedOrigins(): string[] {
  const configured =
    process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:5173';

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

const allowedOrigins = resolveAllowedOrigins();

// Security middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow frontend to load uploaded images
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);

// Logging
const morganFormat =
  process.env.NODE_ENV === 'production'
    ? 'combined'
    : ':method :url :status :response-time ms - :res[content-length]';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        logger.http(message.trim());
      },
    },
  }),
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorMiddleware);

export default app;
