import axios from 'axios';
import type { User, Schedule, Activity, Template } from '../types';
import { logger } from '../utils/logger';

// Create base API URL with fallback
const baseURL = process.env.REACT_APP_API_URL || '/api';
logger.debug('Initializing API with base URL:', baseURL);

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  // Add timeout
  timeout: 10000,
});

// Add request interceptor to handle auth token and logging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Simplified request logging
    logger.debug('API Request', { 
      method: config.method, 
      url: config.url,
    });
    
    return config;
  },
  (error) => {
    logger.error('API Request Error', {
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors and logging
api.interceptors.response.use(
  (response) => {
    // Simplified response logging
    const logData: {
      status: number;
      statusText: string;
      title?: string;
    } = {
      status: response.status,
      statusText: response.statusText,
    };

    // Only add training name if it exists
    if (response.data?.title) {
      logData.title = response.data.title;
    }

    logger.debug('API Response', logData);
    return response;
  },
  async (error) => {
    // Simplified error logging
    logger.error('API Response Error', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });

    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out. Please try again.';
    } else if (!error.response) {
      error.message = 'Network error. Please check your connection and server status.';
    } else if (error.response.status === 401) {
      // Only remove token and redirect for auth-related endpoints
      const isAuthEndpoint = error.config.url?.includes('/auth/');
      if (isAuthEndpoint) {
        localStorage.removeItem('token');
        // Use React Router's navigate instead of window.location
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
const auth = {
  login: async (data: { email: string; password: string }) => {
    try {
      logger.debug('Attempting login', { email: data.email });
      const response = await api.post('/auth/login', data);
      logger.info('Login successful');
      return response;
    } catch (error) {
      logger.error('Login failed', error);
      throw error;
    }
  },
  register: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    try {
      logger.debug('Attempting registration', { email: data.email });
      const response = await api.post('/auth/register', data);
      logger.info('Registration successful');
      return response;
    } catch (error) {
      logger.error('Registration failed', error);
      throw error;
    }
  },
  getCurrentUser: async () => {
    try {
      logger.debug('Fetching current user');
      const response = await api.get('/auth/me');
      logger.debug('Current user fetched successfully');
      return response;
    } catch (error) {
      logger.error('Failed to fetch current user', error);
      throw error;
    }
  },
  updateProfile: async (data: Partial<User>) => {
    try {
      logger.debug('Updating user profile');
      const response = await api.put('/auth/profile', data);
      logger.info('Profile updated successfully');
      return response;
    } catch (error) {
      logger.error('Failed to update profile', error);
      throw error;
    }
  },
  logout: async () => {
    try {
      logger.debug('Attempting logout');
      const response = await api.post('/auth/logout');
      logger.info('Logout successful');
      return response;
    } catch (error) {
      logger.error('Logout failed', error);
      throw error;
    }
  },
  getAllUsers: async () => {
    try {
      logger.debug('Fetching all users');
      const response = await api.get('/auth/users');
      logger.debug('Users fetched successfully');
      return response;
    } catch (error) {
      logger.error('Failed to fetch users', error);
      throw error;
    }
  },
  createUser: async (data: { email: string; password: string; firstName: string; lastName: string; role: string }) => {
    try {
      logger.debug('Creating new user', { email: data.email });
      const response = await api.post('/auth/users', data);
      logger.info('User created successfully');
      return response;
    } catch (error) {
      logger.error('Failed to create user', error);
      throw error;
    }
  },
  updateUser: async (userId: string, data: Partial<User>) => {
    try {
      logger.debug('Updating user', { userId });
      const response = await api.put(`/auth/users/${userId}`, data);
      logger.info('User updated successfully');
      return response;
    } catch (error) {
      logger.error('Failed to update user', error);
      throw error;
    }
  },
  deleteUser: async (userId: string) => {
    try {
      logger.debug('Deleting user', { userId });
      const response = await api.delete(`/auth/users/${userId}`);
      logger.info('User deleted successfully');
      return response;
    } catch (error) {
      logger.error('Failed to delete user', error);
      throw error;
    }
  },
  getTrainers: async () => {
    try {
      logger.debug('Fetching trainers');
      const response = await api.get('/auth/trainers');
      logger.debug('Trainers fetched successfully');
      return response;
    } catch (error) {
      logger.error('Failed to fetch trainers', error);
      throw error;
    }
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    try {
      logger.debug('Attempting password change');
      const response = await api.put('/auth/change-password', data);
      logger.info('Password changed successfully');
      return response;
    } catch (error) {
      logger.error('Password change failed', error);
      throw error;
    }
  },
};

// Templates API
const templates = {
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
const schedules = {
  getAll: () => api.get('/schedules'),
  getById: (id: string) => api.get(`/schedules/${id}`),
  create: (data: { templateId: string; startDate: string }) => api.post('/schedules', data),
  update: (id: string, data: Partial<Schedule>) => api.put(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
  getCurrent: () => api.get('/schedules/current'),
  startDay: (templateId: string, day: number) => api.post('/schedules/start-day', { templateId, day }),
  closeDay: () => api.post('/schedules/close-day'),
  cancelDay: () => api.post('/schedules/cancel-day'),
  nextActivity: (scheduleId: string, activityId: string) => api.post(`/schedules/${scheduleId}/next/${activityId}`),
  goToPreviousActivity: (scheduleId: string, activityId: string) => api.post(`/schedules/${scheduleId}/previous/${activityId}`),
  getStatistics: (filters: { trainer: string; training: string; dateRange: string }) => api.get('/statistics', { params: filters }),
};

// Add statistics object
const statistics = {
  getStatistics: async (filters: { trainer: string; training: string; dateRange: string }) => {
    try {
      logger.debug('Fetching statistics', filters);
      const response = await api.get('/statistics', { params: filters });
      logger.debug('Statistics fetched successfully');
      return response;
    } catch (error) {
      logger.error('Failed to fetch statistics', error);
      throw error;
    }
  },
};

// Export everything at the end
export { api, auth, templates, schedules, statistics };
export type { User, Schedule, Activity, Template } from '../types/index'; 