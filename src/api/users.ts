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
    location?: string;
  }) => {
    const { data } = await apiClient.put<ApiResponse<User>>('/users/profile', payload);
    return data;
  },

  uploadProfilePicture: async (base64: string, mimeType: string): Promise<ApiResponse<User>> => {
    const { data } = await apiClient.post<ApiResponse<User>>('/users/upload-profile-picture', {
      base64,
      mimeType,
    });
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
