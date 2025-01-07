import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Alert,
  Paper
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import axios from 'axios';

const Login: React.FC = () => {
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
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Sign In
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Typography color="primary">
                  Don't have an account? Sign Up
                </Typography>
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 