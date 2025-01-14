import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import axios from 'axios';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3456/api';
      logger.debug('Testing backend connection to:', baseUrl);
      
      const response = await axios.get(`${baseUrl}/health`);
      logger.debug('Backend health check response:', response.data);
      return true;
    } catch (err) {
      logger.error('Backend connection test failed:', err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      // Test backend connection first
      const isBackendAvailable = await testBackendConnection();
      if (!isBackendAvailable) {
        throw new Error('Unable to connect to the server. Please check if the backend is running.');
      }

      logger.debug('Attempting login with email:', email);
      logger.debug('Current API URL:', process.env.REACT_APP_API_URL);

      await login(email, password);
      logger.info('Login successful, navigating to home');
      navigate('/');
    } catch (err: any) {
      logger.error('Login error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        stack: err.stack
      });

      // Set more descriptive error messages
      if (err.response?.status === 404) {
        setError('Server not found. Please check if the backend is running.');
      } else if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else if (!err.response) {
        setError('Network error. Please check your connection and server status.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login; 