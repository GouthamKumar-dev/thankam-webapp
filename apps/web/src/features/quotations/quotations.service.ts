import { apiClient } from '@/services/api-client';
import { PaginatedResponse } from '@/types/api';

export type QuotationRow = {
  id: string;
  quotationNumber: string;
  createdAt?: string;
  customerName: string;
  customerPhone?: string;
  eventDate: string;
  eventType?: string;
  venue?: string;
  guestCount?: number;
  status: 'DRAFT' | 'FINALIZED';
  agreementStatus?: 'NOT_INITIATED' | 'INITIATED' | 'REJECTED' | 'ACCEPTED';
  agreementRejectReason?: string | null;
  agreementUpdatedAt?: string | null;
  agreementAcceptedAt?: string | null;
  source?: 'ADMIN' | 'CUSTOMER_PORTAL';
  requestStatus?:
    | 'NEW'
    | 'OTP_VERIFIED'
    | 'CONTACTED'
    | 'QUOTED'
    | 'CONVERTED'
    | 'CLOSED_REJECTED'
    | null;
  requestStatusUpdatedAt?: string | null;
  grandTotal: string;
};

export type QuotationPayload = {
  customerName: string;
  customerPhone: string;
  eventDate: string;
  eventType: string;
  venue: string;
  guestCount: number;
  items?: Array<{
    itemId?: string;
    name: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
  }>;
  templateStyle?: string;
  discountAmount?: number;
  extraChargesAmount?: number;
  gstPercent?: number;
  menuId?: string;
  customerAddress?: string;
  notes?: string;
  terms?: string;
};

export type QuotationDetail = QuotationRow & {
  customerAddress?: string;
  menuId?: string | null;
  templateStyle?: string;
  discountAmount?: string;
  extraChargesAmount?: string;
  gstPercent?: string;
  notes?: string;
  terms?: string;
  items: Array<{
    id: string;
    itemId?: string | null;
    name: string;
    quantity: string;
    unit?: string | null;
    unitPrice: string;
    amount: string;
    item?: {
      category?: {
        id?: string;
        name?: string;
      } | null;
    } | null;
  }>;
};

export const quotationsService = {
  async list(page = 1, limit = 20) {
    const { data } = await apiClient.get<PaginatedResponse<QuotationRow>>('/quotations', {
      params: { page, limit },
    });
    return data;
  },

  async templates() {
    const { data } = await apiClient.get<Array<{ style: string; name: string }>>('/quotations/templates/all');
    return data;
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await apiClient.post('/quotations', payload);
    return data;
  },

  async update(id: string, payload: Partial<QuotationPayload>) {
    const { data } = await apiClient.patch(`/quotations/${id}`, payload);
    return data;
  },

  async getOne(id: string) {
    const { data } = await apiClient.get<QuotationDetail>(`/quotations/${id}`);
    return data;
  },

  async duplicate(id: string) {
    const { data } = await apiClient.post(`/quotations/${id}/duplicate`);
    return data;
  },

  async finalize(id: string) {
    const { data } = await apiClient.post(`/quotations/${id}/finalize`);
    return data;
  },

  async draft(id: string) {
    const { data } = await apiClient.post(`/quotations/${id}/draft`);
    return data;
  },

  async remove(id: string) {
    const { data } = await apiClient.delete(`/quotations/${id}`);
    return data;
  },

  async getAgreementHtml(id: string) {
    const { data } = await apiClient.get<{ html: string }>(
      `/quotations/${id}/agreement-html`,
    );
    return data;
  },

  async getPrintHtml(id: string) {
    const { data } = await apiClient.get<{ html: string }>(
      `/quotations/${id}/print-html`,
    );
    return data;
  },

  async initiateAgreement(id: string) {
    const { data } = await apiClient.post(`/quotations/${id}/agreement/initiate`);
    return data;
  },

  async customerRequests(page = 1, limit = 20, status?: string, search?: string) {
    const { data } = await apiClient.get<PaginatedResponse<QuotationRow>>(
      '/quotations/customer-requests',
      {
        params: { page, limit, status, search },
      },
    );
    return data;
  },

  async updateRequestStatus(id: string, requestStatus: string) {
    const { data } = await apiClient.patch(`/quotations/${id}/request-status`, {
      requestStatus,
    });
    return data;
  },
};
