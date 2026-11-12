import { apiClient } from '@/services/api-client';
import { LoginSchema } from '@/validations/auth';
import { SafeUser } from '@/types/auth';

type LoginResponse = {
  accessToken: string;
  user: SafeUser;
};

type ForgotPasswordResponse = {
  message: string;
};

export const authService = {
  async login(payload: LoginSchema): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
    return data;
  },

  async logout() {
    await apiClient.post(
      '/auth/logout',
      {},
      { headers: { 'x-skip-auth-refresh': '1' } },
    );
  },

  async forgotPassword(email: string) {
    const { data } = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(token: string, newPassword: string) {
    const { data } = await apiClient.post('/auth/reset-password', { token, newPassword });
    return data;
  },

  async refreshSession() {
    const { data } = await apiClient.post<LoginResponse>(
      '/auth/refresh',
      {},
      { headers: { 'x-skip-auth-refresh': '1' } },
    );
    return data;
  },

  async me() {
    const { data } = await apiClient.get<SafeUser>('/auth/me');
    return data;
  },

  async updateProfile(payload: { name?: string; phone?: string }) {
    const { data } = await apiClient.patch<SafeUser>('/auth/profile', payload);
    return data;
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    const { data } = await apiClient.patch('/auth/change-password', payload);
    return data;
  },
};
