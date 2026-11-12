import axios from 'axios';
import { msg91OtpService } from '@/services/msg91-otp.service';
import { CategoryNode } from '@/features/categories/categories.service';
import { QuotationPayload } from '@/features/quotations/quotations.service';

const fallbackApiBaseUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000/api`
    : 'http://localhost:4000/api';

const portalApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? fallbackApiBaseUrl,
  withCredentials: false,
});

export const customerPortalService = {
  async catalog() {
    const { data } = await portalApiClient.get<CategoryNode[]>('/portal/catalog');
    return data;
  },

  async websiteContent() {
    const { data } = await portalApiClient.get<{
      company: {
        app: string;
        name: string;
        legalName: string;
        logoName: string;
        logoUrl: string;
        faviconUrl: string;
        tagline: string;
        website: string;
        contact: string;
        altContact: string;
        email: string;
        gstNumber: string;
        address: string;
      };
      gallery: Array<{
        id: string;
        title?: string | null;
        description?: string | null;
        type: 'IMAGE' | 'VIDEO';
        url: string;
        thumbnailUrl?: string | null;
        isFeatured: boolean;
        createdAt: string;
      }>;
      reviews: Array<{
        id: string;
        clientName?: string | null;
        title?: string | null;
        testimonial?: string | null;
        rating?: number | null;
        mediaUrl?: string | null;
        mediaType?: 'IMAGE' | 'VIDEO' | null;
        isFeatured: boolean;
      }>;
    }>('/portal/website-content');
    return data;
  },

  async submitQuotationRequest(accessToken: string, payload: QuotationPayload) {
    const { data } = await portalApiClient.post('/portal/quotation-request', payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  },

  async updateMyQuotation(accessToken: string, id: string, payload: QuotationPayload) {
    const { data } = await portalApiClient.patch(`/portal/quotations/my/${id}`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  },

  async respondToMyQuotation(
    accessToken: string,
    id: string,
    action: 'ACCEPT' | 'DECLINE' | 'INTERESTED',
    reason?: string,
  ) {
    const { data } = await portalApiClient.post<{
      message: string;
      requestStatus?: string;
      adminContact?: {
        name?: string;
        phone?: string;
        email?: string;
      };
    }>(
      `/portal/quotations/my/${id}/respond`,
      { action, reason },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return data;
  },

  async requestOtp(phone: string) {
    const { data } = await portalApiClient.post<{
      message: string;
      otp?: string;
      existingCustomer: boolean;
    }>('/portal/auth/request-otp', { phone });

    // Trigger MSG91 Headless OTP sending via SMS/WhatsApp
    try {
      await msg91OtpService.sendOtp(phone);
    } catch (err) {
      console.warn('MSG91 sendOtp note:', err);
    }

    return data;
  },

  async verifyOtp(phone: string, otp: string, name?: string, email?: string) {
    // Obtain MSG91 verified token if available from widget
    let msg91Token: string | null = null;
    try {
      msg91Token = await msg91OtpService.verifyOtp(otp);
    } catch (err) {
      console.warn('MSG91 verifyOtp note:', err);
    }

    const { data } = await portalApiClient.post<{
      accessToken: string;
      phone: string;
      existingCustomer: boolean;
      customerName?: string | null;
      customerEmail?: string | null;
    }>('/portal/auth/verify-otp', { phone, otp, name, email, msg91Token });
    return data;
  },

  async retryOtp(channel?: string | null) {
    return msg91OtpService.retryOtp(channel);
  },

  async myQuotations(accessToken: string) {
    const { data } = await portalApiClient.get('/portal/quotations/my', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  },

  async myQuotationById(accessToken: string, id: string) {
    const { data } = await portalApiClient.get(`/portal/quotations/my/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  },

  async myAgreementHtml(accessToken: string, id: string) {
    const { data } = await portalApiClient.get<{ html: string }>(
      `/portal/quotations/my/${id}/agreement-html`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return data;
  },

  async acceptAgreement(accessToken: string, id: string) {
    const { data } = await portalApiClient.post(
      `/portal/quotations/my/${id}/agreement/accept`,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return data;
  },

  async rejectAgreement(accessToken: string, id: string, reason: string) {
    const { data } = await portalApiClient.post(
      `/portal/quotations/my/${id}/agreement/reject`,
      { reason },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return data;
  },
};
