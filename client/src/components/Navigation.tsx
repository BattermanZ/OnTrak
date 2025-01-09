import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  useTheme,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  BarChart as StatisticsIcon,
  Person as ProfileIcon,
  People as AdminIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      setDrawerOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/setup', label: 'Setup', icon: <SettingsIcon /> },
    { path: '/statistics', label: 'Statistics', icon: <StatisticsIcon /> },
    { path: '/profile', label: 'Profile', icon: <ProfileIcon /> },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin', icon: <AdminIcon /> }] : []),
  ];

  const navigationList = (
    <List>
      {menuItems.map((item) => (
        <ListItem key={item.path} disablePadding>
          <ListItemButton
            component={RouterLink}
            to={item.path}
            selected={isActive(item.path)}
            onClick={() => setDrawerOpen(false)}
            sx={{
              bgcolor: isActive(item.path) ? 'rgba(0, 51, 102, 0.1)' : 'transparent',
              '&:hover': {
                bgcolor: isActive(item.path) ? 'rgba(0, 51, 102, 0.2)' : 'rgba(0, 51, 102, 0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ color: isActive(item.path) ? '#003366' : '#666' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              sx={{ 
                color: isActive(item.path) ? '#003366' : '#666',
                '& .MuiTypography-root': {
                  fontWeight: isActive(item.path) ? 600 : 400,
                },
              }}
            />
          </ListItemButton>
        </ListItem>
      ))}
      <ListItem disablePadding>
        <ListItemButton onClick={handleLogout} sx={{ color: '#DC3545' }}>
          <ListItemIcon sx={{ color: '#DC3545' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </ListItem>
    </List>
  );

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <IconButton
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={() => setDrawerOpen(true)}
      >
        <MenuIcon />
      </IconButton>

      <Typography variant="h6" component="div" sx={{ color: '#003366' }}>
        OnTrak
      </Typography>

      <Typography variant="subtitle1" sx={{ color: '#666' }}>
        {user?.firstName} {user?.lastName}
      </Typography>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            bgcolor: '#fff',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ color: '#003366', mb: 2 }}>
            OnTrak
          </Typography>
          {navigationList}
        </Box>
      </Drawer>
    </Box>
  );
};

export default Navigation; 