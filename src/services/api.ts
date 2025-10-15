import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  AuthTokens, 
  LoginCredentials, 
  RegisterData, 
  Workout, 
  Measurement,
  ApiResponse,
  PaginatedResponse,
  StatsSummary,
  ExerciseStats
} from '../types';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private tokens: AuthTokens | null = null;

  constructor(baseURL: string = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadTokens();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        if (this.tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${this.tokens?.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            await this.logout();
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async loadTokens(): Promise<void> {
    try {
      const tokens = await AsyncStorage.getItem('auth_tokens');
      if (tokens) {
        this.tokens = JSON.parse(tokens);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  private async saveTokens(tokens: AuthTokens): Promise<void> {
    try {
      this.tokens = tokens;
      await AsyncStorage.setItem('auth_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  private async clearTokens(): Promise<void> {
    try {
      this.tokens = null;
      await AsyncStorage.removeItem('auth_tokens');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<{ user: any; tokens: AuthTokens }> {
    const response: AxiosResponse<{ user: any; accessToken: string; refreshToken: string }> = 
      await this.client.post('/auth/login', credentials);
    
    const tokens: AuthTokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken
    };

    await this.saveTokens(tokens);
    return { user: response.data.user, tokens };
  }

  async register(data: RegisterData): Promise<{ user: any; tokens: AuthTokens }> {
    const response: AxiosResponse<{ user: any; accessToken: string; refreshToken: string }> = 
      await this.client.post('/auth/register', data);
    
    const tokens: AuthTokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken
    };

    await this.saveTokens(tokens);
    return { user: response.data.user, tokens };
  }

  async refreshToken(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response: AxiosResponse<{ accessToken: string; refreshToken: string }> = 
      await this.client.post('/auth/refresh', {
        refreshToken: this.tokens.refreshToken
      });

    const tokens: AuthTokens = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken
    };

    await this.saveTokens(tokens);
    return tokens;
  }

  async logout(): Promise<void> {
    if (this.tokens?.refreshToken) {
      try {
        await this.client.post('/auth/logout', {
          refreshToken: this.tokens.refreshToken
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    await this.clearTokens();
  }

  // Workout methods
  async getWorkouts(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    exercise?: string;
    muscleGroup?: string;
  }): Promise<PaginatedResponse<Workout>> {
    const response = await this.client.get('/workouts', { params });
    return response.data;
  }

  async getWorkout(id: string): Promise<Workout> {
    const response = await this.client.get(`/workouts/${id}`);
    return response.data;
  }

  async createWorkout(workout: Omit<Workout, '_id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Workout> {
    const response = await this.client.post('/workouts', workout);
    return response.data;
  }

  async updateWorkout(id: string, workout: Partial<Workout>): Promise<Workout> {
    const response = await this.client.put(`/workouts/${id}`, workout);
    return response.data;
  }

  async deleteWorkout(id: string): Promise<void> {
    await this.client.delete(`/workouts/${id}`);
  }

  async getExerciseStats(exerciseName: string, limit = 50): Promise<ExerciseStats> {
    const response = await this.client.get(`/workouts/stats/exercise/${exerciseName}`, {
      params: { limit }
    });
    return response.data;
  }

  // Measurement methods
  async getMeasurements(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Measurement>> {
    const response = await this.client.get('/measurements', { params });
    return response.data;
  }

  async getMeasurement(id: string): Promise<Measurement> {
    const response = await this.client.get(`/measurements/${id}`);
    return response.data;
  }

  async createMeasurement(measurement: Omit<Measurement, '_id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Measurement> {
    const response = await this.client.post('/measurements', measurement);
    return response.data;
  }

  async updateMeasurement(id: string, measurement: Partial<Measurement>): Promise<Measurement> {
    const response = await this.client.put(`/measurements/${id}`, measurement);
    return response.data;
  }

  async deleteMeasurement(id: string): Promise<void> {
    await this.client.delete(`/measurements/${id}`);
  }

  // Statistics methods
  async getStatsSummary(period = 30): Promise<StatsSummary> {
    const response = await this.client.get('/stats/summary', {
      params: { period }
    });
    return response.data;
  }

  async getExerciseProgress(exerciseName: string, period = 90): Promise<any> {
    const response = await this.client.get(`/stats/progress/${exerciseName}`, {
      params: { period }
    });
    return response.data;
  }

  async getMeasurementTrends(period = 365): Promise<any> {
    const response = await this.client.get('/stats/measurements', {
      params: { period }
    });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.tokens?.accessToken;
  }

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
