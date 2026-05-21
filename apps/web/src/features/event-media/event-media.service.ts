import { apiClient } from '@/services/api-client';
import { customerPortalService } from '@/features/customer-portal/customer-portal.service';

export type EventSelfieRow = {
  id: string;
  customerName: string;
  phone: string;
  imageUrl: string;
  isApproved: boolean;
  isFeatured: boolean;
  adminNote?: string | null;
  createdAt: string;
};

export type EventReviewRow = {
  id: string;
  customerName: string;
  phone: string;
  imageUrl?: string | null;
  reviewText: string;
  rating: number;
  isApproved: boolean;
  isFeatured: boolean;
  adminNote?: string | null;
  createdAt: string;
};

/* ── Admin API ─────────────────────────────────────────────────── */
export const eventMediaService = {
  async listSelfies() {
    const { data } = await apiClient.get<EventSelfieRow[]>('/admin/event/selfies');
    return data;
  },
  async updateSelfie(id: string, payload: Partial<Pick<EventSelfieRow, 'isApproved' | 'isFeatured' | 'adminNote'>>) {
    const { data } = await apiClient.patch(`/admin/event/selfies/${id}`, payload);
    return data;
  },
  async removeSelfie(id: string) {
    await apiClient.delete(`/admin/event/selfies/${id}`);
  },

  async listReviews() {
    const { data } = await apiClient.get<EventReviewRow[]>('/admin/event/reviews');
    return data;
  },
  async updateReview(id: string, payload: Partial<Pick<EventReviewRow, 'isApproved' | 'isFeatured' | 'adminNote'>>) {
    const { data } = await apiClient.patch(`/admin/event/reviews/${id}`, payload);
    return data;
  },
  async removeReview(id: string) {
    await apiClient.delete(`/admin/event/reviews/${id}`);
  },
};

/* ── Customer Portal API (OTP-authenticated, multipart) ─────────── */
const apiBase = (() => {
  const url = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:4000/api';
  return String(url);
})();

export const eventPortalService = {
  requestOtp: customerPortalService.requestOtp.bind(customerPortalService),
  verifyOtp:  customerPortalService.verifyOtp.bind(customerPortalService),

  async submitSelfie(token: string, payload: { customerName: string; imageFile: File }) {
    const fd = new FormData();
    fd.append('customerName', payload.customerName);
    fd.append('image', payload.imageFile);
    const res = await fetch(`${apiBase}/portal/event/selfie`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? 'Failed to submit selfie');
    }
    return res.json();
  },

  async submitReview(token: string, payload: {
    customerName: string;
    reviewText: string;
    rating: number;
    imageFile?: File | null;
  }) {
    const fd = new FormData();
    fd.append('customerName', payload.customerName);
    fd.append('reviewText', payload.reviewText);
    fd.append('rating', String(payload.rating));
    if (payload.imageFile) fd.append('image', payload.imageFile);
    const res = await fetch(`${apiBase}/portal/event/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? 'Failed to submit review');
    }
    return res.json();
  },
};
