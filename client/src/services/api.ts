import axios from 'axios';
import { User, Schedule, AuthResponse } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3456/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  register: async (userData: Partial<User> & { password: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await api.put<User>('/auth/profile', userData);
    return response.data;
  },
};

export const schedules = {
  getAll: async (): Promise<Schedule[]> => {
    const response = await api.get<Schedule[]>('/schedules');
    return response.data;
  },

  getById: async (id: string): Promise<Schedule> => {
    const response = await api.get<Schedule>(`/schedules/${id}`);
    return response.data;
  },

  create: async (scheduleData: Partial<Schedule>): Promise<Schedule> => {
    const response = await api.post<Schedule>('/schedules', scheduleData);
    return response.data;
  },

  update: async (id: string, scheduleData: Partial<Schedule>): Promise<Schedule> => {
    const response = await api.put<Schedule>(`/schedules/${id}`, scheduleData);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/schedules/${id}`);
  },

  updateSessionStatus: async (
    scheduleId: string,
    sessionId: string,
    status: string
  ): Promise<Schedule> => {
    const response = await api.patch<Schedule>(
      `/schedules/${scheduleId}/sessions/${sessionId}`,
      { status }
    );
    return response.data;
  },
}; 