import { apiClient } from '@/services/api-client';

export type DashboardStats = {
  cards: {
    totalCategories: number;
    totalItems: number;
    totalMenus: number;
    totalUsers: number;
  };
  recentQuotations: Array<{ id: string; quotationNumber: string; customerName: string; grandTotal: string }>;
  recentUploads: Array<{ id: string; url: string; type: string; createdAt: string }>;
};

export const dashboardService = {
  async getStats() {
    const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
    return data;
  },
};
