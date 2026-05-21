import { apiClient } from '@/services/api-client';

export type CategoryNode = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
  children: CategoryNode[];
  items: Array<{
    id: string;
    name: string;
    description?: string;
    unit?: string;
    basePrice?: string;
    imageUrl?: string;
  }>;
};

export type CategoryPayload = {
  name: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
};

export const categoriesService = {
  async list() {
    const { data } = await apiClient.get<CategoryNode[]>('/categories');
    return data;
  },

  async create(payload: CategoryPayload) {
    const { data } = await apiClient.post('/categories', payload);
    return data;
  },

  async update(id: string, payload: Partial<CategoryPayload>) {
    const { data } = await apiClient.patch(`/categories/${id}`, payload);
    return data;
  },

  async remove(id: string) {
    const { data } = await apiClient.delete(`/categories/${id}`);
    return data;
  },
};
