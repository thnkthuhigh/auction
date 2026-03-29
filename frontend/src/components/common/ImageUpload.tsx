import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadService } from '@/services/upload.service';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onClear: () => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;

export default function ImageUpload({ value, onChange, onClear }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Ảnh tối đa ${MAX_SIZE_MB}MB`);
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadService.uploadImage(file);
      onChange(url);
      toast.success('Upload ảnh thành công');
    } catch {
      toast.error('Upload ảnh thất bại, thử lại sau');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  if (value) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        <img src={value} alt="Preview" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 shadow transition-colors hover:bg-white"
          aria-label="Xóa ảnh"
        >
          <X className="h-4 w-4 text-gray-700" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e: DragEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      disabled={isUploading}
      className={`flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors
        ${
          dragOver
            ? 'border-[#C05A70] bg-[#FFF1F3]'
            : 'border-gray-300 bg-gray-50 hover:border-[#C05A70] hover:bg-[#FFF1F3]/70'
        }
        disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {isUploading ? (
        <>
          <Upload className="h-8 w-8 animate-bounce text-[#8F2A3E]" />
          <span className="text-sm text-[#7A1F2B]">Đang upload...</span>
        </>
      ) : (
        <>
          <ImageIcon className="h-8 w-8 text-gray-400" />
          <span className="text-sm text-gray-600">
            Kéo thả hoặc <span className="font-medium text-[#7A1F2B]">chọn ảnh</span>
          </span>
          <span className="text-xs text-gray-400">
            JPEG, PNG, WebP, GIF - tối đa {MAX_SIZE_MB}MB
          </span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleInputChange}
      />
    </button>
  );
}
