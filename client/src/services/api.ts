import axios from 'axios';
import type { User, Schedule, Activity, Template } from '../types';
import { logger } from '../utils/logger';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3456/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logger.debug('API Request', { 
      method: config.method, 
      url: config.url,
      data: config.data
    });
    return config;
  },
  (error) => {
    logger.error('API Request Error', { error: error.message });
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    logger.debug('API Response', { 
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    logger.error('API Response Error', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth service
export const auth = {
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/login', data),
  register: (data: Partial<User> & { password: string }) =>
    api.post<{ token: string; user: User }>('/auth/register', data),
  getCurrentUser: () => api.get<User>('/auth/me'),
  updateProfile: (data: Partial<User>) => api.put<User>('/auth/profile', data),
};

// Templates service
export const templates = {
  getAll: () => api.get<Template[]>('/templates'),
  getById: (id: string) => api.get<Template>(`/templates/${id}`),
  create: (data: { name: string; days: number }) => 
    api.post<Template>('/templates', data),
  addActivity: (templateId: string, activity: Omit<Activity, '_id'>) =>
    api.post<Activity>(`/templates/${templateId}/activities`, activity),
  update: (id: string, data: Partial<Template>) =>
    api.put<Template>(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
  duplicate: (id: string) => 
    api.post(`/templates/${id}/duplicate`),
  updateActivity: (templateId: string, activityId: string, activity: Partial<Activity>) => 
    api.put(`/templates/${templateId}/activities/${activityId}`, activity),
  deleteActivity: (templateId: string, activityId: string) => 
    api.delete(`/templates/${templateId}/activities/${activityId}`),
  addBatchActivities: (templateId: string, activities: Omit<Activity, '_id'>[]) => 
    api.post(`/templates/${templateId}/activities/batch`, activities),
  getCategories: () => 
    api.get('/templates/categories'),
  getTags: () => 
    api.get('/templates/tags'),
  search: (query: string, filters: { category?: string; tags?: string[] }) => 
    api.get('/templates/search', { params: { query, ...filters } }),
  checkConflicts: (templateId: string) => 
    api.get(`/templates/${templateId}/conflicts`),
  exportPDF: (templateId: string) => 
    api.get(`/templates/${templateId}/export-pdf`, { responseType: 'blob' }),
};

// Schedules service
export const schedules = {
  getAll: () => api.get<Schedule[]>('/schedules'),
  getById: (id: string) => api.get<Schedule>(`/schedules/${id}`),
  create: (data: { templateId: string; startDate: string }) => 
    api.post<Schedule>('/schedules', data),
  update: (id: string, data: Partial<Schedule>) =>
    api.put<Schedule>(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
  getCurrentSchedule: () => api.get<Schedule>('/schedules/current'),
};

export { api };
export type { User, Schedule, Activity, Template }; 