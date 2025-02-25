import React, { useState, useEffect } from 'react';
import { Edit, Plus } from 'lucide-react';
import { auth } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { schedules } from '../services/api';
import {
  Container,
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { format } from 'date-fns';

import {
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Alert, AlertDescription } from "../components/ui/alert";

interface UserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'trainer';
  timezone: 'Amsterdam' | 'Manila' | 'Curacao';
}

const initialFormData: UserFormData = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'trainer',
  timezone: 'Amsterdam',
};

interface ActiveSession {
  _id: string;
  trainer: {
    _id: string;
    name: string;
    email: string;
  };
  training: {
    _id: string;
    name: string;
  };
  currentActivity: {
    name: string;
    startTime: string;
    actualStartTime: string;
  } | null;
  day: number;
  startedAt: string;
}

const Admin = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: async () => {
      const response = await schedules.getActiveSessions();
      return response.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await auth.getAllUsers();
      setUsers(response.data);
    } catch (err) {
      setError('Failed to fetch users');
    }
  };

  const handleOpenDialog = (user: any = null) => {
    if (user) {
      setFormData({
        email: user.email,
        password: '', // Don't show existing password
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        timezone: user.timezone || 'Amsterdam',
      });
      setEditingUser(user);
    } else {
      setFormData(initialFormData);
      setEditingUser(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(initialFormData);
    setEditingUser(null);
    setError('');
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      if (editingUser) {
        await auth.updateUser(editingUser._id, formData);
      } else {
        await auth.createUser(formData);
      }
      
      await fetchUsers();
      handleCloseDialog();
      setSuccess(editingUser ? 'User updated successfully' : 'User created successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      {/* Active Sessions Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Active Training Sessions
        </Typography>
        <Grid container spacing={3}>
          {activeSessions.length === 0 ? (
            <Grid item xs={12}>
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No active training sessions at the moment
                </Typography>
              </Box>
            </Grid>
          ) : (
            activeSessions.map((session: ActiveSession) => (
              <Grid item xs={12} md={6} key={session._id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {session.training.name}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" color="primary">
                        Trainer: {session.trainer.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {session.trainer.email}
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      Day {session.day}
                    </Typography>
                    {session.currentActivity && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          Current Activity: {session.currentActivity.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Started at: {format(new Date(session.currentActivity.actualStartTime), 'HH:mm')}
                        </Typography>
                      </Box>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Session started: {format(new Date(session.startedAt), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Paper>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>User Management</CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Name</th>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Role</th>
                  <th scope="col" className="px-6 py-3">Timezone</th>
                  <th scope="col" className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(userItem => (
                  <tr key={userItem._id} className="bg-white border-b">
                    <td className="px-6 py-4">{`${userItem.firstName} ${userItem.lastName}`}</td>
                    <td className="px-6 py-4">{userItem.email}</td>
                    <td className="px-6 py-4">{userItem.role}</td>
                    <td className="px-6 py-4">{userItem.timezone || 'Amsterdam'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleOpenDialog(userItem)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit User</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user details' : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required={!editingUser}
                  disabled={!!editingUser}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange({
                    target: { name: 'role', value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trainer">Trainer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Timezone</label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => handleInputChange({
                    target: { name: 'timezone', value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Amsterdam">Amsterdam</SelectItem>
                    <SelectItem value="Manila">Manila</SelectItem>
                    <SelectItem value="Curacao">Curaçao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default Admin; 