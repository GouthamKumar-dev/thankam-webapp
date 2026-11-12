import { apiClient } from '@/services/api-client';

export type DashboardStats = {
  cards: {
    totalCategories: number;
    totalItems: number;
    totalMenus: number;
    totalUsers: number;
    totalQuotations?: number;
    pipelineValue?: number;
    acceptedCount?: number;
    acceptedValue?: number;
    pendingRequestsCount?: number;
  };
  upcomingEvents?: Array<{
    id: string;
    quotationNumber: string;
    customerName: string;
    customerPhone: string;
    eventDate: string;
    eventType: string;
    venue: string;
    guestCount: number;
    grandTotal: string | number;
    status: string;
    agreementStatus: string;
  }>;
  recentRequests?: Array<{
    id: string;
    quotationNumber: string;
    customerName: string;
    customerPhone: string;
    eventType: string;
    guestCount: number;
    createdAt: string;
    requestStatus: string;
    grandTotal: string | number;
  }>;
  recentQuotations: Array<{
    id: string;
    quotationNumber: string;
    customerName: string;
    customerPhone?: string;
    eventDate?: string;
    eventType?: string;
    grandTotal: string | number;
    status?: string;
    agreementStatus?: string;
    createdAt?: string;
  }>;
  recentUploads: Array<{ id: string; url: string; type: string; createdAt: string }>;
};

export const dashboardService = {
  async getStats() {
    const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
    return data;
  },
};
