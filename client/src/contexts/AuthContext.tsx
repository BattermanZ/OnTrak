import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/api';
import axios from 'axios';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'trainer';
  timezone: 'Amsterdam' | 'Manila' | 'Curacao';
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Omit<User, 'role' | '_id'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to check and refresh user data
  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await auth.getCurrentUser();
      setUser(response.data as User);
    } catch (error) {
      // Only remove token if it's an auth error
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await auth.login({ email, password });
      setUser(response.data.user as User);
    } catch (error) {
      setUser(null);
      throw error;
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    const response = await auth.register({ email, password, firstName, lastName });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user as User);
  };

  const updateProfile = async (data: Partial<Omit<User, 'role' | '_id'>>) => {
    try {
      const response = await auth.updateProfile(data);
      setUser(response.data.user as User);
    } catch (error) {
      // If it's an auth error, clear the user state
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setUser(null);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  // Add an effect to handle token expiration or removal
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      if (!token && user) {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 