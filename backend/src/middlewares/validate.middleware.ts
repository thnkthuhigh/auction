import { type Request, type Response, type NextFunction } from 'express';
import { type ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      result.error.errors.forEach((e) => {
        const key = e.path.join('.');
        errors[key] = errors[key] || [];
        errors[key].push(e.message);
      });
      res.status(400).json({ success: false, message: 'Validation error', errors });
      return;
    }
    req.body = result.data;
    next();
  };
}
