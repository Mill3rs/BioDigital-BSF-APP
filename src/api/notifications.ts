import apiClient from './client';
import type { ApiResponse, PaginatedResponse, Notification } from '../types';

export const notificationsAPI = {
  getAll: async (params: { read?: boolean; page?: number; limit?: number } = {}) => {
    const { data } = await apiClient.get<PaginatedResponse<Notification>>('/notifications', {
      params,
    });
    return data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread/count');
    return data.data?.unreadCount ?? 0;
  },

  markRead: async (id: string) => {
    const { data } = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return data;
  },

  markAllRead: async () => {
    const { data } = await apiClient.post<ApiResponse<null>>('/notifications/mark-all-read');
    return data;
  },

  delete: async (id: string) => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/notifications/${id}`);
    return data;
  },
};
