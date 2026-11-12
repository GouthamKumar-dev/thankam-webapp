import { apiClient } from '@/services/api-client';
import { PaginatedResponse } from '@/types/api';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'STAFF';
  isActive: boolean;
  createdAt?: string;
};

export type CustomerSummary = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  totalQuotations: number;
  totalBookings: number;
  lifetimeValue: number;
  lastEventDate: string | null;
  lastEventType: string | null;
  lastVenue: string | null;
  firstContactAt: string;
  lastActivityAt: string;
  latestStatus: string;
  quotations: Array<{
    id: string;
    quotationNumber: string;
    eventDate: string;
    eventType: string;
    venue: string;
    guestCount: number;
    grandTotal: string;
    status: string;
    requestStatus: string | null;
    agreementStatus: string;
    createdAt: string;
  }>;
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

  async listCustomers() {
    const { data } = await apiClient.get<CustomerSummary[]>('/users/customers');
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
