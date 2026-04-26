import apiClient from './client';
import type { ApiResponse, PaginatedResponse, WasteRecord, CreateWastePayload } from '../types';

export const wasteAPI = {
  getAll: async (params: {
    status?: string;
    sourceType?: string;
    farmId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const { data } = await apiClient.get<PaginatedResponse<WasteRecord>>('/waste', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<WasteRecord>>(`/waste/${id}`);
    return data;
  },

  create: async (payload: CreateWastePayload) => {
    const { data } = await apiClient.post<ApiResponse<WasteRecord>>('/waste', payload);
    return data;
  },

  updateStatus: async (id: string, status: string) => {
    const { data } = await apiClient.put<ApiResponse<WasteRecord>>(`/waste/${id}`, { status });
    return data;
  },
};
