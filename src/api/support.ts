import apiClient from './client';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userRole: string;
  category: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  adminNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string; email: string };
}

export interface CreateTicketPayload {
  category: string;
  title: string;
  description: string;
  priority?: string;
}

export const supportAPI = {
  create: async (payload: CreateTicketPayload) => {
    const { data } = await apiClient.post<ApiResponse<SupportTicket>>('/support', payload);
    return data;
  },

  getAll: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const { data } = await apiClient.get<PaginatedResponse<SupportTicket>>('/support', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<SupportTicket>>(`/support/${id}`);
    return data;
  },
};
