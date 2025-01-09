import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/api';

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
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
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
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header with navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" color="#003366">
            User Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              component={RouterLink}
              to="/setup"
              startIcon={<SettingsIcon />}
              variant="outlined"
            >
              Setup
            </Button>
          </Box>
        </Box>

        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* User List */}
        <Paper sx={{ mb: 4 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Users</Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => handleOpenDialog()}
            >
              Add User
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((userItem) => (
                  <TableRow key={userItem._id}>
                    <TableCell>{`${userItem.firstName} ${userItem.lastName}`}</TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{userItem.role}</TableCell>
                    <TableCell>
                      {userItem.lastLogin ? new Date(userItem.lastLogin).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleOpenDialog(userItem)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          onClick={() => handleDeleteUser(userItem._id)}
                          disabled={userItem._id === currentUser?._id} // Prevent self-deletion
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Add/Edit User Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Add User'}
          </DialogTitle>
          <DialogContent>
            <Box component="form" noValidate sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="firstName"
                    label="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="lastName"
                    label="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="email"
                    label="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    type="email"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="password"
                    label={editingUser ? "New Password (leave empty to keep current)" : "Password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    fullWidth
                    required={!editingUser}
                    type="password"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      label="Role"
                    >
                      <MenuItem value="trainer">Trainer</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingUser ? 'Save' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Admin; 