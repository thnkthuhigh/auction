import { z } from 'zod';

export const updateUserLockSchema = z
  .object({
    isActive: z.boolean(),
    reason: z.string().max(500).optional(),
  })
  .refine((data) => data.isActive || Boolean(data.reason?.trim()), {
    message: 'reason is required when locking account',
    path: ['reason'],
  });

export type UpdateUserLockInput = z.infer<typeof updateUserLockSchema>;
