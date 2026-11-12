import { apiClient } from '@/services/api-client';
import { PaginatedResponse } from '@/types/api';

export type ItemRow = {
  id: string;
  name: string;
  description?: string;
  basePrice: string;
  unit?: string;
  category: { id: string; name: string };
};

export type ItemPayload = {
  name: string;
  description?: string;
  basePrice: number;
  unit?: string;
  categoryId?: string;
  imageUrl?: string;
  isActive?: boolean;
};

export const itemsService = {
  async list(page = 1, limit = 50, search?: string, category?: string) {
    const { data } = await apiClient.get<PaginatedResponse<ItemRow>>('/items', {
      params: { page, limit, search: search || undefined, category: category || undefined },
    });
    return data;
  },

  async search(query: string, category?: string, limit = 50) {
    const { data } = await apiClient.get<PaginatedResponse<ItemRow>>('/items', {
      params: { search: query, category: category || undefined, limit },
    });
    return data.data;
  },

  async create(payload: ItemPayload) {
    const { data } = await apiClient.post('/items', payload);
    return data;
  },

  async update(id: string, payload: Partial<ItemPayload>) {
    const { data } = await apiClient.patch(`/items/${id}`, payload);
    return data;
  },

  async remove(id: string) {
    const { data } = await apiClient.delete(`/items/${id}`);
    return data;
  },
};
