import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/api';

import {
  Card,
  CardContent,
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
}

const initialFormData: UserFormData = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'trainer',
};

const Admin = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await auth.updateUser(editingUser._id, formData);
        setSuccess('User updated successfully');
      } else {
        await auth.createUser(formData);
        setSuccess('User created successfully');
      }
      handleCloseDialog();
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await auth.deleteUser(userId);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header with red gradient banner */}
      <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage system users and permissions</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="mb-6">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Name</th>
                  <th scope="col" className="px-6 py-3">Email</th>
                  <th scope="col" className="px-6 py-3">Role</th>
                  <th scope="col" className="px-6 py-3">Last Login</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem._id} className="bg-white border-b">
                    <td className="px-6 py-4">{`${userItem.firstName} ${userItem.lastName}`}</td>
                    <td className="px-6 py-4">{userItem.email}</td>
                    <td className="px-6 py-4 capitalize">{userItem.role}</td>
                    <td className="px-6 py-4">
                      {userItem.lastLogin ? new Date(userItem.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(userItem)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit user</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(userItem._id)}
                              disabled={userItem._id === currentUser?._id}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete user</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Update the user details below.' 
                : 'Fill in the details to create a new user.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {editingUser ? "New Password (leave empty to keep current)" : "Password"}
              </label>
              <Input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder={editingUser ? "Enter new password" : "Enter password"}
                required={!editingUser}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                name="role"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin; 