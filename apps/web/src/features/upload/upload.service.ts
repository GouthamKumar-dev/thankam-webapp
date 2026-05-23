import { apiClient } from '@/services/api-client';

export type UploadedAsset = {
  originalName: string;
  mimeType: string;
  size: number;
  filename: string;
  path: string;
  url: string;
};

export const uploadService = {
  async uploadOne(file: File) {
    const data = await this.uploadMany([file]);
    return data[0];
  },

  async uploadMany(files: File[], onProgress?: (percent: number) => void) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      const { data } = await apiClient.post<UploadedAsset[]>('/upload/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (!event.total || !onProgress) return;
          onProgress(Math.round((event.loaded / event.total) * 100));
        },
      });

      return data;
    } catch (error: any) {
      const status = Number(error?.response?.status ?? 0);
      if (status === 413) {
        throw new Error(
          'Upload failed: file is too large for the server limit. Please reduce file size and try again.',
        );
      }
      throw error;
    }
  },
};
