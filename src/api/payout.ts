import { apiClient } from './client';
import type { ApiResponse } from '../types';

export interface PayoutRequest {
  id: string;
  supplierId: string;
  adminId?: string | null;
  points: number;
  amountGhs: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  paymentMethod?: string | null;
  paymentDetails?: Record<string, string> | null;
  notes?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutSettings {
  ratePerPoint: number;
  pointsBalance: number;
  pointsRewardEnabled: boolean;
  enabledPayoutMethods: string[];
  minimumPoints: number;
}

export const payoutAPI = {
  getSettings: async () => {
    const { data } = await apiClient.get<ApiResponse<PayoutSettings>>('/payout/settings');
    return data;
  },

  submitRequest: async (payload: {
    points: number;
    paymentMethod: string;
    paymentDetails: Record<string, string>;
  }) => {
    const { data } = await apiClient.post<ApiResponse<PayoutRequest>>('/payout/request', payload);
    return data;
  },

  getMyRequests: async () => {
    const { data } = await apiClient.get<ApiResponse<{ requests: PayoutRequest[] }>>('/payout/my-requests');
    return data;
  },
};
