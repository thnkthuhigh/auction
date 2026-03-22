import { z } from 'zod';

export const createAuctionSchema = z.object({
  title: z.string().min(3, 'Tiêu đề tối thiểu 3 ký tự').max(200),
  description: z.string().min(10, 'Mô tả tối thiểu 10 ký tự'),
  imageUrl: z.string().url('URL ảnh không hợp lệ').optional(),
  startPrice: z.number().min(1000, 'Giá khởi điểm tối thiểu 1,000 VNĐ'),
  minBidStep: z.number().min(1000).optional().default(1000),
  startTime: z.string().datetime('startTime phải là ISO datetime'),
  endTime: z.string().datetime('endTime phải là ISO datetime'),
  categoryId: z.string().uuid('categoryId không hợp lệ'),
});

export const updateAuctionSchema = z
  .object({
    title: z.string().min(3, 'Tiêu đề tối thiểu 3 ký tự').max(200).optional(),
    description: z.string().min(10, 'Mô tả tối thiểu 10 ký tự').max(5000).optional(),
    imageUrl: z.string().url('URL ảnh không hợp lệ').optional(),
    startTime: z.string().datetime('startTime phải là ISO datetime').optional(),
    endTime: z.string().datetime('endTime phải là ISO datetime').optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
      }
      return true;
    },
    { message: 'Thời gian kết thúc phải sau thời gian bắt đầu', path: ['endTime'] },
  );

export const reviewAuctionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
  note: z.string().max(1000).optional(),
});

export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
export type UpdateAuctionInput = z.infer<typeof updateAuctionSchema>;
export type ReviewAuctionInput = z.infer<typeof reviewAuctionSchema>;
