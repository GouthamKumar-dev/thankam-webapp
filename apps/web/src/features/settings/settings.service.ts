import { apiClient } from '@/services/api-client';

export type SettingRow = {
  id: string;
  key: string;
  value: Record<string, unknown>;
};

export const settingsService = {
  async list() {
    const { data } = await apiClient.get<SettingRow[]>('/settings');
    return data;
  },

  async get(key: string) {
    const { data } = await apiClient.get<SettingRow>(`/settings/${key}`);
    return data;
  },

  async upsert(key: string, value: Record<string, unknown>) {
    const { data } = await apiClient.put('/settings', { key, value });
    return data;
  },
};
