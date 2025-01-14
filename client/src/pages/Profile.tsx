import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/api';
import { User, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      await updateProfile(profileForm);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      await auth.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      setSuccess('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with purple gradient banner */}
      <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account preferences</p>
        </div>
        <Settings className="h-8 w-8 text-purple-600" />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      firstName: e.target.value
                    })}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      lastName: e.target.value
                    })}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Input
                  value={user?.role || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value
                  })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value
                  })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    confirmNewPassword: e.target.value
                  })}
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 