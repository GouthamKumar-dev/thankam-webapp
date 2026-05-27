import { apiClient } from '@/services/api-client';

export type UploadedAsset = {
  originalName: string;
  mimeType: string;
  size: number;
  filename: string;
  path: string;
  url: string;
};

async function postMedia(files: File[], onProgress?: (percent: number) => void) {
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
        'Upload failed: this file is larger than the server upload limit. Please choose a smaller file or increase the server limit.',
      );
    }
    throw error;
  }
}

export const uploadService = {
  async uploadOne(file: File, onProgress?: (percent: number) => void) {
    const data = await postMedia([file], onProgress);
    return data[0];
  },

  async uploadMany(files: File[], onProgress?: (percent: number) => void) {
    if (!files.length) return [];

    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    let completedBytes = 0;
    const uploaded: UploadedAsset[] = [];

    for (const file of files) {
      const assets = await postMedia([file], (percent) => {
        if (!onProgress) return;
        const currentBytes = file.size * percent / 100;
        onProgress(Math.round(((completedBytes + currentBytes) / totalBytes) * 100));
      });

      uploaded.push(...assets);
      completedBytes += file.size;
      onProgress?.(Math.round((completedBytes / totalBytes) * 100));
    }

    return uploaded;
  },
};
