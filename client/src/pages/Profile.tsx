import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/api';
import { User, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    timezone: user?.timezone || 'Amsterdam',
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
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  type="text"
                  name="firstName"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  type="text"
                  name="lastName"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Timezone</label>
                <Select
                  value={profileForm.timezone}
                  onValueChange={(value) => setProfileForm({ ...profileForm, timezone: value as 'Amsterdam' | 'Manila' | 'Curacao' })}
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
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 