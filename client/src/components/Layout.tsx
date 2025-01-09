import React from 'react';
import { Container, Box } from '@mui/material';
import Navigation from './Navigation';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Box sx={{ bgcolor: 'white', boxShadow: 1, mb: 4, py: 2 }}>
        <Container maxWidth="lg">
          <Navigation />
        </Container>
      </Box>
      {children}
    </Box>
  );
};

export default Layout; 