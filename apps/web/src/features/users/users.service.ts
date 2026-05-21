import { apiClient } from '@/services/api-client';
import { PaginatedResponse } from '@/types/api';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  isActive: boolean;
};

export type UserPayload = {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: 'ADMIN' | 'STAFF';
  isActive?: boolean;
};

export const usersService = {
  async list(page = 1, limit = 20) {
    const { data } = await apiClient.get<PaginatedResponse<UserRow>>('/users', {
      params: { page, limit },
    });
    return data;
  },

  async create(payload: UserPayload) {
    const { data } = await apiClient.post('/users', payload);
    return data;
  },

  async update(id: string, payload: Partial<UserPayload>) {
    const { data } = await apiClient.patch(`/users/${id}`, payload);
    return data;
  },

  async remove(id: string) {
    const { data } = await apiClient.delete(`/users/${id}`);
    return data;
  },
};
