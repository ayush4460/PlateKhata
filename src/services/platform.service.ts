import { ApiClient } from "./api.service";

export interface PlatformLoginResponse {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface Restaurant {
    restaurant_id: number;
    name: string;
    slug: string;
    is_active: boolean;
    contact_email: string;
    address?: string;
    created_at?: string;
}

export class PlatformService {
  private static BASE_URL = "/platform";

  private static getHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('platformToken') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  static async login(credentials: { email: string; password: string }) {
    return ApiClient.post<PlatformLoginResponse>(
      `${this.BASE_URL}/login`,
      credentials
    );
  }

  static async getAllRestaurants() {
    return ApiClient.get<Restaurant[]>(`${this.BASE_URL}/restaurants`, this.getHeaders());
  }

  static async createRestaurant(data: any) {
    return ApiClient.post<Restaurant>(`${this.BASE_URL}/restaurants`, data, this.getHeaders());
  }

  static async updateRestaurant(id: number, data: any) {
      return ApiClient.patch<Restaurant>(`${this.BASE_URL}/restaurants/${id}`, data, this.getHeaders());
  }

  static async registerRestaurantAdmin(data: any) {
      return ApiClient.post(`${this.BASE_URL}/restaurants/admin`, data, this.getHeaders());
  }
}
