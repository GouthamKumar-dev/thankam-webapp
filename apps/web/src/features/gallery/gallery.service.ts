import { apiClient } from '@/services/api-client';

export type MediaRow = {
  id: string;
  title?: string;
  description?: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string;
  isWebsiteGallery: boolean;
  isSocialContent: boolean;
  isFeatured: boolean;
  createdAt: string;
};

export type CreateGalleryPayload = {
  title?: string;
  description?: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string;
  isWebsiteGallery?: boolean;
  isSocialContent?: boolean;
  isFeatured?: boolean;
};

export const galleryService = {
  async list() {
    const { data } = await apiClient.get<MediaRow[]>('/gallery');
    return data;
  },

  async create(payload: CreateGalleryPayload) {
    const { data } = await apiClient.post<MediaRow>('/gallery', payload);
    return data;
  },

  async update(id: string, payload: Partial<CreateGalleryPayload>) {
    const { data } = await apiClient.patch<MediaRow>(`/gallery/${id}`, payload);
    return data;
  },

  async remove(id: string) {
    const { data } = await apiClient.delete<{ message: string }>(`/gallery/${id}`);
    return data;
  },
};
