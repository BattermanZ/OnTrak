import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Settings,
  BarChart,
  User,
  Users,
  LogOut
} from "lucide-react";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    { value: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { value: '/setup', label: 'Setup', icon: <Settings className="w-4 h-4" /> },
    { value: '/statistics', label: 'Statistics', icon: <BarChart className="w-4 h-4" /> },
    { value: '/profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    ...(user?.role === 'admin' ? [{ value: '/admin', label: 'Admin', icon: <Users className="w-4 h-4" /> }] : []),
  ];

  return (
    <div className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="hidden font-bold sm:inline-block">
              OnTrak
              {user && (
                <span className="font-normal text-muted-foreground ml-2">
                  - {user.firstName} {user.lastName}
                </span>
              )}
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <Tabs
            value={location.pathname}
            onValueChange={(value) => navigate(value)}
            className="w-full md:w-auto"
          >
            <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full md:w-auto">
              {menuItems.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow gap-2"
                >
                  {item.icon}
                  {item.label}
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="logout"
                onClick={handleLogout}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-destructive hover:text-destructive-foreground gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Navigation; 