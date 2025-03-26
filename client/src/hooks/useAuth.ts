import { useState, useEffect } from 'react';
import { auth } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setState({ isAuthenticated: false, isLoading: false, user: null });
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await auth.getCurrentUser();
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: response.data,
        });
      } catch (error) {
        localStorage.removeItem('token');
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
      }
    };

    checkAuth();
  }, []);

  return state;
} 