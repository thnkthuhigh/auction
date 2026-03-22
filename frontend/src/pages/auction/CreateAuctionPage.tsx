import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auctionService } from '@/services/auction.service';
import toast from 'react-hot-toast';
import { PlusCircle, ImageIcon } from 'lucide-react';
import type { CreateAuctionDTO } from '@auction/shared';

const schema = z.object({
  title: z.string().min(3, 'Tối thiểu 3 ký tự').max(200),
  description: z.string().min(10, 'Tối thiểu 10 ký tự'),
  imageUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
  startPrice: z.number({ invalid_type_error: 'Nhập số tiền' }).min(1000, 'Tối thiểu 1,000 ₫'),
  minBidStep: z.number().min(1000).optional().default(1000),
  startTime: z.string().min(1, 'Chọn thời gian bắt đầu'),
  endTime: z.string().min(1, 'Chọn thời gian kết thúc'),
  categoryId: z.string().uuid('Chọn danh mục'),
});

/**
 * TV4 phụ trách trang này
 */
export default function CreateAuctionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: auctionService.getCategories,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateAuctionDTO>({
    resolver: zodResolver(schema),
  });

  const imageUrlValue = useWatch({ control, name: 'imageUrl' });
  const minDatetime = new Date().toISOString().slice(0, 16);

  const mutation = useMutation({
    mutationFn: auctionService.createAuction,
    onSuccess: (auction) => {
      toast.success('Tạo đấu giá thành công!');
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      navigate(`/auctions/${auction.id}`);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Tạo đấu giá thất bại');
    },
  });

  const onSubmit = (data: CreateAuctionDTO) => {
    const payload = {
      ...data,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
      imageUrl: data.imageUrl || undefined,
    };
    mutation.mutate(payload);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Tạo đấu giá mới</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
            <input
              {...register('title')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tên sản phẩm đấu giá"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả *</label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Mô tả chi tiết sản phẩm..."
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL ảnh</label>
            <input
              {...register('imageUrl')}
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
            {errors.imageUrl && (
              <p className="text-red-500 text-xs mt-1">{errors.imageUrl.message}</p>
            )}
            {imageUrlValue && !errors.imageUrl ? (
              <img
                src={imageUrlValue}
                alt="Xem trước ảnh sản phẩm"
                className="mt-2 w-full h-40 object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="mt-2 w-full h-40 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                <ImageIcon className="h-8 w-8 mb-1" />
                <span className="text-xs">Nhập URL để xem trước ảnh</span>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
            <select
              {...register('categoryId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giá khởi điểm (₫) *
              </label>
              <input
                {...register('startPrice', { valueAsNumber: true })}
                type="number"
                min={1000}
                step={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1000000"
              />
              {errors.startPrice && (
                <p className="text-red-500 text-xs mt-1">{errors.startPrice.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bước giá tối thiểu (₫)
              </label>
              <input
                {...register('minBidStep', { valueAsNumber: true })}
                type="number"
                min={1000}
                step={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1000"
              />
              {errors.minBidStep && (
                <p className="text-red-500 text-xs mt-1">{errors.minBidStep.message}</p>
              )}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian bắt đầu *
              </label>
              <input
                {...register('startTime')}
                type="datetime-local"
                min={minDatetime}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.startTime && (
                <p className="text-red-500 text-xs mt-1">{errors.startTime.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian kết thúc *
              </label>
              <input
                {...register('endTime')}
                type="datetime-local"
                min={minDatetime}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.endTime && (
                <p className="text-red-500 text-xs mt-1">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? 'Đang tạo...' : 'Tạo đấu giá'}
          </button>
        </form>
      </div>
    </div>
  );
}
