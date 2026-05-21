import { apiClient } from '@/services/api-client';

export type MenuRow = {
  id: string;
  name: string;
  description?: string;
  menuItems: Array<{
    id: string;
    item: { id: string; name: string; basePrice: string; unit?: string };
  }>;
};

export type MenuPayload = {
  name: string;
  description?: string;
  itemIds: string[];
};

export const menusService = {
  async list() {
    const { data } = await apiClient.get<MenuRow[]>('/menus');
    return data;
  },

  async create(payload: MenuPayload) {
    const { data } = await apiClient.post('/menus', payload);
    return data;
  },

  async update(id: string, payload: Partial<MenuPayload>) {
    const { data } = await apiClient.patch(`/menus/${id}`, payload);
    return data;
  },

  async duplicate(id: string) {
    const { data } = await apiClient.post(`/menus/${id}/duplicate`);
    return data;
  },

  async remove(id: string) {
    const { data } = await apiClient.delete(`/menus/${id}`);
    return data;
  },
};
