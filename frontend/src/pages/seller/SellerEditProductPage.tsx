import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileEdit, Save, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { auctionService } from '@/services/auction.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ImageUpload from '@/components/common/ImageUpload';
import { useAuthStore } from '@/store/auth.store';

const schema = z
  .object({
    title: z.string().min(3, 'Tiêu đề tối thiểu 3 ký tự').max(200),
    description: z.string().min(10, 'Mô tả tối thiểu 10 ký tự').max(5000),
    imageUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
    startTime: z.string().min(1, 'Chọn thời gian bắt đầu'),
    endTime: z.string().min(1, 'Chọn thời gian kết thúc'),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
    path: ['endTime'],
  });

type EditForm = z.infer<typeof schema>;

function toDatetimeLocal(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function canEditAuction(status?: string, reviewStatus?: string, isAdmin = false): boolean {
  if (isAdmin) {
    return status === 'PENDING' || status === 'REVIEW';
  }
  return status === 'REVIEW' || (status === 'PENDING' && reviewStatus === 'CHANGES_REQUESTED');
}

export default function SellerEditProductPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const returnPath = isAdmin ? '/admin/reviews' : '/seller/products';

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      startTime: '',
      endTime: '',
    },
  });

  const imageUrl = useWatch({ control, name: 'imageUrl' });

  const { data: auction, isLoading } = useQuery({
    queryKey: ['seller-edit-auction', id],
    queryFn: () => auctionService.getAuctionById(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!auction) return;
    reset({
      title: auction.title,
      description: auction.description,
      imageUrl: auction.imageUrl ?? '',
      startTime: toDatetimeLocal(auction.startTime),
      endTime: toDatetimeLocal(auction.endTime),
    });
  }, [auction, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: EditForm) =>
      auctionService.updateAuction(id, {
        title: values.title,
        description: values.description,
        imageUrl: values.imageUrl || undefined,
        startTime: new Date(values.startTime).toISOString(),
        endTime: new Date(values.endTime).toISOString(),
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật thông tin sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['seller-products-management'] });
      queryClient.invalidateQueries({ queryKey: ['seller-tracking-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['my-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
      queryClient.invalidateQueries({ queryKey: ['seller-edit-auction', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-review-management'] });
      queryClient.invalidateQueries({ queryKey: ['admin-session-list'] });
      navigate(returnPath);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể cập nhật sản phẩm');
    },
  });

  const submitForReviewMutation = useMutation({
    mutationFn: () => auctionService.submitForReview(id),
    onSuccess: () => {
      toast.success('Đã gửi duyệt lại sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['seller-products-management'] });
      queryClient.invalidateQueries({ queryKey: ['seller-tracking-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['my-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-review-management'] });
      navigate(returnPath);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể gửi duyệt lại');
    },
  });

  const minDatetime = new Date().toISOString().slice(0, 16);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <LoadingSpinner size="lg" text="Đang tải dữ liệu sản phẩm..." />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Không tìm thấy sản phẩm cần chỉnh sửa.</p>
        <Link
          to={returnPath}
          className="mt-3 inline-flex text-sm font-semibold text-[#7A1F2B] hover:underline"
        >
          Quay lại
        </Link>
      </div>
    );
  }

  const canEdit = canEditAuction(auction.status, auction.reviewStatus, isAdmin);

  if (!canEdit) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">
          Sản phẩm không ở trạng thái cho phép chỉnh sửa
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Chỉ sản phẩm ở trạng thái chờ duyệt/yêu cầu chỉnh sửa (hoặc pending đối với admin) mới có
          thể sửa.
        </p>
        <Link
          to={returnPath}
          className="mt-3 inline-flex text-sm font-semibold text-[#7A1F2B] hover:underline"
        >
          Quay lại
        </Link>
      </div>
    );
  }

  const onSubmit = (values: EditForm) => {
    updateMutation.mutate(values);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#E7B8C1] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF1F3] text-[#7A1F2B]">
            <FileEdit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Chỉnh sửa sản phẩm</h1>
            <p className="mt-1 text-sm text-slate-600">
              Cập nhật nội dung trước khi sản phẩm được duyệt và mở phiên đấu giá.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tiêu đề *</label>
            <input
              {...register('title')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
            />
            {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả chi tiết *</label>
            <textarea
              {...register('description')}
              rows={5}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hình ảnh sản phẩm
            </label>
            <ImageUpload
              value={imageUrl || ''}
              onChange={(url) =>
                setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true })
              }
              onClear={() => setValue('imageUrl', '', { shouldValidate: true, shouldDirty: true })}
            />
            {errors.imageUrl && (
              <p className="mt-1 text-xs text-rose-600">{errors.imageUrl.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Thời gian bắt đầu *
              </label>
              <input
                {...register('startTime')}
                type="datetime-local"
                min={minDatetime}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
              />
              {errors.startTime && (
                <p className="mt-1 text-xs text-rose-600">{errors.startTime.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Thời gian kết thúc *
              </label>
              <input
                {...register('endTime')}
                type="datetime-local"
                min={minDatetime}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
              />
              {errors.endTime && (
                <p className="mt-1 text-xs text-rose-600">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          {auction.reviewStatus === 'CHANGES_REQUESTED' && auction.reviewNote && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">Góp ý từ Admin:</p>
              <p className="mt-1">{auction.reviewNote}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={updateMutation.isPending || !isDirty}
              className="inline-flex items-center gap-2 rounded-lg bg-[#7A1F2B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#611521] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu chỉnh sửa'}
            </button>

            {auction.reviewStatus === 'CHANGES_REQUESTED' && (
              <button
                type="button"
                onClick={() => submitForReviewMutation.mutate()}
                disabled={submitForReviewMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E7B8C1] bg-[#FFF1F3] px-4 py-2 text-sm font-semibold text-[#7A1F2B] hover:bg-[#FFE7EC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {submitForReviewMutation.isPending ? 'Đang gửi...' : 'Gửi duyệt lại'}
              </button>
            )}

            <Link
              to={returnPath}
              className="text-sm font-semibold text-slate-600 hover:text-[#7A1F2B]"
            >
              Hủy
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
