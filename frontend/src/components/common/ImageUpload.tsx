import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { uploadService } from '@/services/upload.service';
import toast from 'react-hot-toast';

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
    if (file) handleFile(file);
    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (value) {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
        <img src={value} alt="Preview" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow transition-colors"
          aria-label="Xoá ảnh"
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
      onDragOver={(e: DragEvent<HTMLButtonElement>) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      disabled={isUploading}
      className={`w-full aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer
        ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'}
        disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {isUploading ? (
        <>
          <Upload className="h-8 w-8 text-blue-500 animate-bounce" />
          <span className="text-sm text-blue-600">Đang upload...</span>
        </>
      ) : (
        <>
          <ImageIcon className="h-8 w-8 text-gray-400" />
          <span className="text-sm text-gray-600">
            Kéo thả hoặc <span className="text-blue-600 font-medium">chọn ảnh</span>
          </span>
          <span className="text-xs text-gray-400">JPEG, PNG, WebP, GIF – tối đa {MAX_SIZE_MB}MB</span>
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
