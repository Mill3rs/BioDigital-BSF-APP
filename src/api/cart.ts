import apiClient from './client';
import type { ApiResponse, Cart } from '../types';

export const cartAPI = {
  getCart: async () => {
    const { data } = await apiClient.get<ApiResponse<Cart>>('/cart');
    return data;
  },

  addItem: async (variantId: string, quantity: number) => {
    const { data } = await apiClient.post<ApiResponse<Cart>>('/cart/add', { variantId, quantity });
    return data;
  },

  updateItem: async (itemId: string, quantity: number) => {
    const { data } = await apiClient.put<ApiResponse<Cart>>(`/cart/update/${itemId}`, { quantity });
    return data;
  },

  removeItem: async (itemId: string) => {
    const { data } = await apiClient.delete<ApiResponse<Cart>>(`/cart/remove/${itemId}`);
    return data;
  },

  clearCart: async () => {
    const { data } = await apiClient.delete<ApiResponse<null>>('/cart/clear');
    return data;
  },
};
