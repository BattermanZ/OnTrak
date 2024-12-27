import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3456';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin: string | null;
}

export interface Template {
  id: string;
  name: string;
  days: number;
  activities: Activity[];
}

export interface Activity {
  id: string;
  name: string;
  startTime: string;
  duration: number;
  description: string;
  day: number;
}

export interface Schedule {
  id: string;
  name: string;
  description: string;
  startTime: string;
  duration: number;
  day: number;
  activities: Activity[];
  currentActivity: Activity | null;
  previousActivity: Activity | null;
  nextActivity: Activity | null;
}

// Axios instance with auth header
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  update: (id: string, data: Partial<Template>) =>
    api.put<Template>(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
  addActivity: (templateId: string, data: Omit<Activity, 'id'>) =>
    api.post<Activity>(`/templates/${templateId}/activities`, data),
  updateActivity: (templateId: string, activityId: string, data: Partial<Activity>) =>
    api.put<Activity>(`/templates/${templateId}/activities/${activityId}`, data),
  deleteActivity: (templateId: string, activityId: string) =>
    api.delete(`/templates/${templateId}/activities/${activityId}`),
};

// Schedules service
export const schedules = {
  getAll: () => api.get<Schedule[]>('/schedules'),
  getById: (id: string) => api.get<Schedule>(`/schedules/${id}`),
  create: (data: Omit<Schedule, 'id'>) => api.post<Schedule>('/schedules', data),
  update: (id: string, data: Partial<Schedule>) =>
    api.put<Schedule>(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
  getCurrentSchedule: () => api.get<Schedule>('/schedules/current'),
};

export default api; 