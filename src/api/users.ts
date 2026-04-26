import apiClient from './client';
import type { ApiResponse, User } from '../types';

export const usersAPI = {
  getProfile: async () => {
    const { data } = await apiClient.get<ApiResponse<User>>('/users/profile');
    return data;
  },

  updateProfile: async (payload: {
    fullName?: string;
    phoneNumber?: string;
    profileImage?: string;
  }) => {
    const { data } = await apiClient.put<ApiResponse<User>>('/users/profile', payload);
    return data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await apiClient.put<ApiResponse<null>>('/users/change-password', {
      currentPassword,
      newPassword,
    });
    return data;
  },
};
