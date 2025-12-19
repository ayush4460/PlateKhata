import { Category, CreateCategoryDTO, UpdateCategoryDTO } from '@/lib/types';
import { ApiClient } from './api.service';

export const CategoryService = {
  getAll: async (restaurantId?: number): Promise<Category[]> => {
    if (!restaurantId || isNaN(restaurantId)) {
        console.warn("[CategoryService] getAll called without valid restaurantId");
        return [];
    }
    const query = restaurantId ? `?restaurantId=${restaurantId}` : '';
    const response = await ApiClient.get<any[]>(`/categories${query}`);
    // Map backend snake_case to frontend interface
    return response.data.map((cat: any) => ({
      ...cat,
      id: cat.category_id || cat.id,
    }));
  },

  create: async (data: CreateCategoryDTO): Promise<Category> => {
    const response = await ApiClient.post<Category>('/categories', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCategoryDTO): Promise<Category> => {
    const response = await ApiClient.put<Category>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await ApiClient.delete(`/categories/${id}`);
  }
};
