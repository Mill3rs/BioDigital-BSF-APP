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

  getDeliveryById: async (orderId: string) => {
    const { data } = await apiClient.get<ApiResponse<Order>>(`/driver/deliveries/${orderId}`);
    return data;
  },

  updateDeliveryStatus: async (orderId: string, status: string, notes?: string) => {
    const { data } = await apiClient.patch<ApiResponse<Order>>(
      `/driver/deliveries/${orderId}/status`,
      { status, notes },
    );
    return data;
  },

  updateLocation: async (lat: number, lng: number, wasteId?: string) => {
    const { data } = await apiClient.post<ApiResponse<null>>('/driver/location', {
      lat,
      lng,
      ...(wasteId ? { wasteId } : {}),
    });
    return data;
  },

  getDriverLocation: async (wasteId: string) => {
    const { data } = await apiClient.get<ApiResponse<{ driverName: string; location: { lat: number; lng: number; updatedAt: string } | null } | null>>(`/driver/location/${wasteId}`);
    return data;
  },

  getCompanyLocation: async () => {
    const { data } = await apiClient.get<ApiResponse<{ companyName: string; lat: number | null; lng: number | null; address: string | null; city: string | null; region: string | null; country: string | null } | null>>('/driver/company');
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
