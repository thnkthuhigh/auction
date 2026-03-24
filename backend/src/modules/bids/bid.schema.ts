import { z } from 'zod';

export const placeBidSchema = z.object({
  auctionId: z.string().uuid('ID phiên đấu giá không hợp lệ'),
  amount: z
    .number({ invalid_type_error: 'Số tiền phải là số' })
    .int('Số tiền đặt giá phải là số nguyên')
    .positive('Số tiền phải lớn hơn 0')
    .min(1000, 'Số tiền tối thiểu là 1,000 VND'),
});

export type PlaceBidInput = z.infer<typeof placeBidSchema>;
