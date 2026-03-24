import api from './api.service';

export const uploadService = {
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await api.post<{ success: boolean; data: { url: string } }>(
      '/upload/image',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );

    return res.data.data.url;
  },
};