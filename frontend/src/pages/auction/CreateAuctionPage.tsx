import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, FilePenLine, ImageIcon, ListChecks, PlusCircle } from 'lucide-react';
import type { CreateAuctionDTO } from '@auction/shared';
import { auctionService } from '@/services/auction.service';
import ImageUpload from '@/components/common/ImageUpload';

const schema = z
  .object({
    title: z.string().min(3, 'Tiêu đề tối thiểu 3 ký tự').max(200),
    description: z.string().min(10, 'Mô tả tối thiểu 10 ký tự').max(5000),
    imageUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
    startPrice: z.number({ invalid_type_error: 'Nhập số tiền' }).min(1000, 'Tối thiểu 1.000 VNĐ'),
    minBidStep: z.number().min(1000, 'Tối thiểu 1.000 VNĐ').optional().default(1000),
    startTime: z.string().min(1, 'Chọn thời gian bắt đầu'),
    endTime: z.string().min(1, 'Chọn thời gian kết thúc'),
    categoryId: z.string().uuid('Chọn danh mục'),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
    path: ['endTime'],
  });

type FormValues = z.infer<typeof schema>;

function StepCard({ index, title, done }: { index: number; title: string; done: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        done
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-600'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Bước {index}</p>
      <div className="mt-2 flex items-center gap-2">
        {done ? <CheckCircle2 className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
        <p className="text-sm font-semibold">{title}</p>
      </div>
    </div>
  );
}

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
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      startPrice: 1000,
      minBidStep: 1000,
      startTime: '',
      endTime: '',
      categoryId: '',
    },
  });

  const imageUrl = useWatch({ control, name: 'imageUrl' });
  const title = useWatch({ control, name: 'title' });
  const categoryId = useWatch({ control, name: 'categoryId' });
  const description = useWatch({ control, name: 'description' });
  const startPrice = useWatch({ control, name: 'startPrice' });
  const startTime = useWatch({ control, name: 'startTime' });
  const endTime = useWatch({ control, name: 'endTime' });
  const minDatetime = new Date().toISOString().slice(0, 16);

  const { stepOneDone, stepTwoDone, stepThreeDone } = useMemo(() => {
    const hasImage = Boolean(imageUrl?.trim());
    const hasCoreInfo =
      Boolean(title?.trim()) &&
      Boolean(categoryId) &&
      Number(startPrice) >= 1000 &&
      Boolean(startTime) &&
      Boolean(endTime);
    const hasDescription = (description ?? '').trim().length >= 10;

    return {
      stepOneDone: hasImage,
      stepTwoDone: hasCoreInfo,
      stepThreeDone: hasDescription,
    };
  }, [categoryId, description, endTime, imageUrl, startPrice, startTime, title]);

  const mutation = useMutation({
    mutationFn: auctionService.createAuction,
    onSuccess: () => {
      toast.success('Gửi sản phẩm thành công! Vui lòng chờ Admin duyệt.');
      queryClient.invalidateQueries({ queryKey: ['my-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['seller-products-management'] });
      navigate('/seller/products');
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Tạo sản phẩm thất bại');
    },
  });

  const onSubmit = (data: FormValues) => {
    const payload: CreateAuctionDTO = {
      ...data,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
      imageUrl: data.imageUrl || undefined,
    };

    mutation.mutate(payload);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <section className="rounded-2xl border border-[#E8C2C9] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-[#7A1F2B]" />
          <h1 className="text-xl font-bold text-slate-900">Đăng sản phẩm mới</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Gửi hồ sơ theo 3 bước để Admin xét duyệt và đưa sản phẩm của bạn lên sàn đấu giá.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StepCard index={1} title="Tải ảnh sản phẩm" done={stepOneDone} />
          <StepCard index={2} title="Thông tin cơ bản" done={stepTwoDone} />
          <StepCard index={3} title="Mô tả và nguồn gốc" done={stepThreeDone} />
        </div>
      </section>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <section className="rounded-2xl border border-[#E8C2C9] bg-[#FFF9FA] p-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#7A1F2B]" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7A1F2B]">
              Bước 1: Tải ảnh lên
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Kéo thả ảnh vào khung bên dưới hoặc bấm để tải lên.
          </p>

          <div className="mt-3">
            <ImageUpload
              value={imageUrl || ''}
              onChange={(url) =>
                setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true })
              }
              onClear={() => setValue('imageUrl', '', { shouldValidate: true, shouldDirty: true })}
            />
          </div>
          {errors.imageUrl && (
            <p className="mt-2 text-xs text-rose-600">{errors.imageUrl.message}</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <FilePenLine className="h-4 w-4 text-[#7A1F2B]" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7A1F2B]">
              Bước 2: Tên sản phẩm, danh mục và phiên
            </h2>
          </div>

          <div className="mt-3 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tên sản phẩm *
              </label>
              <input
                {...register('title')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
                placeholder="Ví dụ: Bình gốm men rạn đời Thanh"
              />
              {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Danh mục *</label>
                <select
                  {...register('categoryId')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-xs text-rose-600">{errors.categoryId.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Giá khởi điểm (VNĐ) *
                </label>
                <input
                  {...register('startPrice', { valueAsNumber: true })}
                  type="number"
                  min={1000}
                  step={1000}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
                />
                {errors.startPrice && (
                  <p className="mt-1 text-xs text-rose-600">{errors.startPrice.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Bước giá tối thiểu (VNĐ)
                </label>
                <input
                  {...register('minBidStep', { valueAsNumber: true })}
                  type="number"
                  min={1000}
                  step={1000}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
                />
                {errors.minBidStep && (
                  <p className="mt-1 text-xs text-rose-600">{errors.minBidStep.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mở phiên *</label>
                <input
                  {...register('startTime')}
                  type="datetime-local"
                  min={minDatetime}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
                />
                {errors.startTime && (
                  <p className="mt-1 text-xs text-rose-600">{errors.startTime.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Kết phiên *</label>
                <input
                  {...register('endTime')}
                  type="datetime-local"
                  min={minDatetime}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
                />
                {errors.endTime && (
                  <p className="mt-1 text-xs text-rose-600">{errors.endTime.message}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7A1F2B]">
            Bước 3: Mô tả chi tiết và nguồn gốc
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Nêu rõ tình trạng, giấy tờ kiểm định và điểm đặc biệt của sản phẩm.
          </p>
          <div className="mt-3">
            <textarea
              {...register('description')}
              rows={6}
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
              placeholder="Mô tả nguồn gốc, tình trạng hiện tại, chứng nhận đi kèm..."
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-600">{errors.description.message}</p>
            )}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#611521] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang gửi duyệt...' : 'Gửi duyệt'}
          </button>
        </div>
      </form>
    </div>
  );
}
