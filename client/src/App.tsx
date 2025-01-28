import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import Admin from './pages/Admin';
import Statistics from './pages/Statistics';
import Profile from './pages/Profile';
import BackupManager from './pages/BackupManager';
import { Toaster } from './components/ui/toaster';
import Layout from './components/Layout';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
      <Route path="/setup" element={user ? <Layout><Setup /></Layout> : <Navigate to="/login" />} />
      <Route path="/admin" element={user ? <Layout><Admin /></Layout> : <Navigate to="/login" />} />
      <Route path="/statistics" element={user ? <Layout><Statistics /></Layout> : <Navigate to="/login" />} />
      <Route path="/profile" element={user ? <Layout><Profile /></Layout> : <Navigate to="/login" />} />
      {user?.role === 'admin' && (
        <Route path="/backups" element={<BackupManager />} />
      )}
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
      <Toaster />
    </Router>
  );
}

export default App;
