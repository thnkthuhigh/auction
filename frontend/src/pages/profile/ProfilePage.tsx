import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Mail, Save, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuthStore } from '@/store/auth.store';
import { userService } from '@/services/user.service';
import LoadingSpinner from '@/components/common/LoadingSpinner';

type ProfileForm = {
  username: string;
  avatar: string;
};

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => userService.getMe(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    defaultValues: {
      username: '',
      avatar: '',
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      username: profile.username ?? '',
      avatar: profile.avatar ?? '',
    });
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: (payload: ProfileForm) =>
      userService.updateMe({
        username: payload.username.trim(),
        avatar: payload.avatar.trim() || undefined,
      }),
    onSuccess: (updatedProfile) => {
      toast.success('Đã cập nhật thông tin tài khoản');
      updateUser({
        username: updatedProfile.username,
        avatar: updatedProfile.avatar,
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Không thể cập nhật thông tin');
    },
  });

  if (isLoading) {
    return (
      <div className="mt-20 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const onSubmit = (values: ProfileForm) => {
    updateMutation.mutate(values);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF1F3]">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-[#7A1F2B]" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile?.username}</h1>
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <Mail className="h-3.5 w-3.5" /> {profile?.email}
            </p>
            <p className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="h-3.5 w-3.5" />
              Tham gia {profile && format(new Date(profile.createdAt), 'MM/yyyy', { locale: vi })}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Cập nhật thông tin cá nhân</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Tên hiển thị</span>
            <input
              {...register('username', {
                required: 'Vui lòng nhập tên hiển thị',
                minLength: { value: 3, message: 'Tên tối thiểu 3 ký tự' },
                maxLength: { value: 50, message: 'Tên tối đa 50 ký tự' },
              })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
            />
            {errors.username && (
              <p className="mt-1 text-xs text-rose-600">{errors.username.message}</p>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Ảnh đại diện (URL)
            </span>
            <input
              {...register('avatar', {
                validate: (value) => {
                  if (!value.trim()) return true;
                  try {
                    new URL(value);
                    return true;
                  } catch {
                    return 'URL ảnh không hợp lệ';
                  }
                },
              })}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#CB5C72]"
            />
            {errors.avatar && <p className="mt-1 text-xs text-rose-600">{errors.avatar.message}</p>}
          </label>

          <button
            type="submit"
            disabled={updateMutation.isPending || !isDirty}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7A1F2B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#611521] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}
          </button>
        </form>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#E7B8C1] bg-[#FFF1F3] p-4 text-center">
          <p className="text-2xl font-bold text-[#7A1F2B]">{profile?.totalAuctions ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500">Đấu giá đã tạo</p>
        </div>
        <div className="rounded-xl border border-[#EDC7CF] bg-[#FFF7F8] p-4 text-center">
          <p className="text-2xl font-bold text-[#8F2A3E]">{profile?.totalBids ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500">Lượt đặt giá</p>
        </div>
        <div className="rounded-xl bg-yellow-50 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{profile?.wonAuctions ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500">Phiên thắng</p>
        </div>
      </section>
    </div>
  );
}
