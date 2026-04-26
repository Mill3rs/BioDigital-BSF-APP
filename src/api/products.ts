import apiClient from './client';
import type { ApiResponse, PaginatedResponse, Product } from '../types';

export interface ProductsQuery {
  category?: string;
  status?: string;
  farmId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export const productsAPI = {
  getAll: async (params: ProductsQuery = {}) => {
    const { data } = await apiClient.get<PaginatedResponse<Product>>('/products', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return data;
  },
};
