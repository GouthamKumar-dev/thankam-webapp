import { apiClient } from '@/services/api-client';

export type ReviewRow = {
  id: string;
  clientName?: string | null;
  title?: string | null;
  testimonial?: string | null;
  rating?: number | null;
  mediaUrl?: string | null;
  mediaType?: 'IMAGE' | 'VIDEO' | null;
  isFeatured: boolean;
  createdAt: string;
};

export type CreateReviewPayload = {
  clientName?: string;
  title?: string;
  testimonial?: string;
  rating?: number;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  isFeatured?: boolean;
};

export const websiteReviewService = {
  async list() {
    const { data } = await apiClient.get<ReviewRow[]>('/website-review');
    return data;
  },

  async create(payload: CreateReviewPayload) {
    const { data } = await apiClient.post<ReviewRow>('/website-review', payload);
    return data;
  },

  async update(id: string, payload: Partial<CreateReviewPayload>) {
    const { data } = await apiClient.patch<ReviewRow>(`/website-review/${id}`, payload);
    return data;
  },

  async remove(id: string) {
    const { data } = await apiClient.delete<{ message: string }>(`/website-review/${id}`);
    return data;
  },

  async toggleFeatured(id: string, isFeatured: boolean) {
    const { data } = await apiClient.patch<ReviewRow>(`/website-review/${id}`, { isFeatured });
    return data;
  },
};
