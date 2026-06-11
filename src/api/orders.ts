import apiClient from './client';
import type { ApiResponse, PaginatedResponse, Order, CreateOrderPayload } from '../types';

export const ordersAPI = {
  getAll: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const { data } = await apiClient.get<PaginatedResponse<Order>>('/orders', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
    return data;
  },

  create: async (payload: CreateOrderPayload) => {
    const { data } = await apiClient.post<ApiResponse<Order>>('/orders', payload);
    return data;
  },

  cancel: async (id: string) => {
    const { data } = await apiClient.post<ApiResponse<Order>>(`/orders/${id}/cancel`);
    return data;
  },

  updateStatus: async (id: string, status: string) => {
    const { data } = await apiClient.post<ApiResponse<Order>>(`/orders/${id}/update-status`, { status });
    return data;
  },

  confirmDelivery: async (id: string, payload?: { driverRating?: number; driverComment?: string }) => {
    const { data } = await apiClient.post<ApiResponse<Order>>(`/orders/${id}/confirm-delivery`, payload ?? {});
    return data;
  },
};
