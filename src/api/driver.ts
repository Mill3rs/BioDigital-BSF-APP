import apiClient from './client';
import type { ApiResponse, PaginatedResponse, DriverProfile, Order, WasteRecord } from '../types';

export const driverAPI = {
  getProfile: async () => {
    const { data } = await apiClient.get<ApiResponse<DriverProfile>>('/driver/profile');
    return data;
  },

  updateProfile: async (payload: Partial<DriverProfile>) => {
    const { data } = await apiClient.put<ApiResponse<DriverProfile>>('/driver/profile', payload);
    return data;
  },

  getDeliveries: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const { data } = await apiClient.get<PaginatedResponse<Order>>('/driver/deliveries', { params });
    return data;
  },

  updateDeliveryStatus: async (orderId: string, status: string, notes?: string) => {
    const { data } = await apiClient.patch<ApiResponse<Order>>(
      `/driver/deliveries/${orderId}/status`,
      { status, notes },
    );
    return data;
  },

  updateLocation: async (lat: number, lng: number) => {
    const { data } = await apiClient.post<ApiResponse<null>>('/driver/location', {
      currentLocation: { lat, lng },
    });
    return data;
  },

  getWastePickups: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const { data } = await apiClient.get<PaginatedResponse<WasteRecord>>('/waste', { params });
    return data;
  },

  getWasteById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<WasteRecord>>(`/waste/${id}`);
    return data;
  },

  markWasteCollected: async (id: string, notes?: string) => {
    const { data } = await apiClient.patch<ApiResponse<WasteRecord>>(`/waste/${id}/collect`, { notes });
    return data;
  },

  markWasteDelivered: async (id: string, notes?: string) => {
    const { data } = await apiClient.patch<ApiResponse<WasteRecord>>(`/waste/${id}/deliver`, { notes });
    return data;
  },
};
