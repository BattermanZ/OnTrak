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
      data: response.data
    });
    return response;
  },
  (error) => {
    logger.error('API Response Error', { error: error.message });
    return Promise.reject(error);
  }
);

// Auth API
export const auth = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data: Partial<Omit<User, 'role' | '_id'>>) =>
    api.put('/auth/profile', data),
};

// Templates API
export const templates = {
  getAll: () => api.get('/templates'),
  getById: (id: string) => api.get(`/templates/${id}`),
  create: (data: { name: string; days: number }) => api.post('/templates', data),
  update: (id: string, data: Partial<Template>) => api.put(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
  addActivity: (templateId: string, activity: Partial<Activity>) =>
    api.post(`/templates/${templateId}/activities`, activity),
  updateActivity: (templateId: string, activityId: string, activity: Partial<Activity>) =>
    api.put(`/templates/${templateId}/activities/${activityId}`, activity),
};

// Schedules API
export const schedules = {
  getAll: () => api.get('/schedules'),
  getById: (id: string) => api.get(`/schedules/${id}`),
  create: (data: { templateId: string; startDate: string }) => api.post('/schedules', data),
  update: (id: string, data: Partial<Schedule>) => api.put(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
  getCurrentSchedule: () => api.get('/schedules/current'),
  startDay: (templateId: string, day: number) => 
    api.post('/schedules/start-day', { templateId, day }),
  skipActivity: (scheduleId: string, activityId: string) =>
    api.post(`/schedules/${scheduleId}/skip/${activityId}`),
  goToPreviousActivity: (scheduleId: string, activityId: string) =>
    api.post(`/schedules/${scheduleId}/previous/${activityId}`),
};

export { api };
export type { User, Schedule, Activity, Template }; 