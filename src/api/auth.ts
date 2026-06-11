import apiClient from './client';
import type { ApiResponse, User, AuthTokens, LoginPayload, RegisterPayload } from '../types';

export const authAPI = {
  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<
      ApiResponse<{ token: string; refreshToken: string; user: User }>
    >('/auth/login', payload);
    return data;
  },

  register: async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<
      ApiResponse<{ token: string; refreshToken: string; user: User }>
    >('/auth/register', payload);
    return data;
  },

  googleSignIn: async (payload: { idToken: string; role?: string }) => {
    const { data } = await apiClient.post<
      ApiResponse<{ token: string; refreshToken: string; user: User }> & { error?: string }
    >('/auth/google', payload);
    return data;
  },

  verifyCompanyCode: async (code: string) => {
    const { data } = await apiClient.post<
      ApiResponse<{ user: User; companyName: string }>
    >('/auth/verify-company-code', { code });
    return data;
  },

  completeLocation: async (payload: {
    country: string;
    city: string;
    address: string;
    landmark?: string;
    lat?: number;
    lng?: number;
  }) => {
    const { data } = await apiClient.post<ApiResponse<{ user: User }>>(
      '/auth/complete-location',
      payload,
    );
    return data;
  },

  logout: async (refreshToken: string) => {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // ignore – clear local storage regardless
    }
  },

  forgotPassword: async (email: string) => {
    const { data } = await apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email });
    return data;
  },

  refreshToken: async (refreshToken: string) => {
    const { data } = await apiClient.post<
      ApiResponse<AuthTokens>
    >('/auth/refresh-token', { refreshToken });
    return data;
  },
};
