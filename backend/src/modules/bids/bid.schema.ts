import { z } from 'zod';

export const placeBidSchema = z.object({
  auctionId: z.string().uuid('ID phiên đấu giá không hợp lệ'),
  clientRequestId: z
    .string()
    .trim()
    .min(8, 'Mã yêu cầu không hợp lệ')
    .max(128, 'Mã yêu cầu không hợp lệ')
    .optional(),
  amount: z
    .number({ invalid_type_error: 'Số tiền phải là số' })
    .int('Số tiền đặt giá phải là số nguyên')
    .positive('Số tiền phải lớn hơn 0')
    .min(1000, 'Số tiền tối thiểu là 1,000 VND'),
});

export type PlaceBidInput = z.infer<typeof placeBidSchema>;
