import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Grid,
  IconButton,
  Alert,
  MenuItem,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Divider,
  Badge,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { templates } from '../services/api';
import { useQuery, useQueryClient } from 'react-query';
import type { Template, Activity } from '../types/index';
import { logger } from '../utils/logger';

export const Setup = () => {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activitiesViewDialogOpen, setActivitiesViewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    days: 1,
  });

  // Activity form state
  const [activityForm, setActivityForm] = useState({
    name: '',
    startTime: '',
    duration: 30,
    description: '',
    day: 1,
  });

  // Helper function to format time input
  const formatTimeInput = (input: string) => {
    const numbers = input.replace(/\D/g, '');
    if (numbers.length < activityForm.startTime.replace(/\D/g, '').length) {
      return numbers;
    }
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      const hours = numbers.slice(0, 2);
      const minutes = numbers.slice(2);
      return `${hours}:${minutes}`;
    }
    return activityForm.startTime;
  };

  // Helper function to calculate end time
  const calculateEndTime = (startTime: string, duration: number) => {
    if (!startTime || !timeRegex.test(startTime)) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes + duration;
    
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Time format validation regex
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  // Fetch templates
  const { data: templateList } = useQuery('templates', async () => {
    const response = await templates.getAll();
    return response.data;
  });

  // Filter templates based on search query
  const filteredTemplates = templateList?.filter((template: Template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group activities by day
  const groupActivitiesByDay = (activities: Activity[]) => {
    return activities.reduce((acc, activity) => {
      if (!acc[activity.day]) {
        acc[activity.day] = [];
      }
      acc[activity.day].push(activity);
      return acc;
    }, {} as Record<number, Activity[]>);
  };

  const handleCreateTemplate = async () => {
    try {
      setError('');
      logger.debug('Creating template', templateForm);
      
      await templates.create(templateForm);
      await queryClient.invalidateQueries('templates');
      
      setTemplateForm({ name: '', days: 1 });
      setCreateDialogOpen(false);
    } catch (err: any) {
      logger.error('Error creating template', err);
      setError(err.response?.data?.message || 'Failed to create template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setError('');
      logger.debug('Updating template', templateForm);
      
      await templates.update(selectedTemplate._id, templateForm);
      await queryClient.invalidateQueries('templates');
      
      setTemplateForm({ name: '', days: 1 });
      setCreateDialogOpen(false);
      setEditMode(false);
    } catch (err: any) {
      logger.error('Error updating template', err);
      setError(err.response?.data?.message || 'Failed to update template');
    }
  };

  const handleAddActivity = async () => {
    if (!selectedTemplate) {
      setError('No template selected');
      return;
    }

    try {
      setError('');
      logger.debug('Adding activity', { templateId: selectedTemplate._id, activity: activityForm });
      
      if (editMode && selectedActivity) {
        await templates.updateActivity(selectedTemplate._id, selectedActivity._id, activityForm);
      } else {
        await templates.addActivity(selectedTemplate._id, activityForm);
      }
      
      await queryClient.invalidateQueries('templates');
      
      setActivityForm({
        name: '',
        startTime: '',
        duration: 30,
        description: '',
        day: 1,
      });
      setActivityDialogOpen(false);
      setEditMode(false);
      setSelectedActivity(null);
    } catch (err: any) {
      logger.error('Error with activity', err);
      setError(err.response?.data?.message || 'Failed to handle activity');
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setActivityForm({
      name: activity.name,
      startTime: activity.startTime,
      duration: activity.duration,
      description: activity.description || '',
      day: activity.day,
    });
    setEditMode(true);
    setActivityDialogOpen(true);
    setActivitiesViewDialogOpen(false);
  };

  const handleViewActivities = (template: Template) => {
    setSelectedTemplate(template);
    setActivitiesViewDialogOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setError('');
      await templates.delete(templateId);
      await queryClient.invalidateQueries('templates');
    } catch (err: any) {
      logger.error('Error deleting template', err);
      setError(err.response?.data?.message || 'Failed to delete template');
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header Section */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 4,
            background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            p: 3,
            borderRadius: 2,
            color: 'white',
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Training Setup
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.8 }}>
              Create and manage your training templates
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setTemplateForm({ name: '', days: 1 });
              setEditMode(false);
              setCreateDialogOpen(true);
            }}
            sx={{
              bgcolor: 'white',
              color: theme => theme.palette.primary.main,
              '&:hover': {
                bgcolor: alpha('#ffffff', 0.9),
              },
              px: 3,
              py: 1.5,
              borderRadius: 2,
              boxShadow: 2,
            }}
          >
            Create Training
          </Button>
        </Box>

        {/* Search Section */}
        <Card sx={{ mb: 4, p: 2, boxShadow: 2 }}>
          <TextField
            fullWidth
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'primary.main' }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                '& fieldset': {
                  borderWidth: 2,
                  borderColor: theme => alpha(theme.palette.primary.main, 0.2),
                },
                '&:hover fieldset': {
                  borderColor: 'primary.main !important',
                },
              },
            }}
          />
        </Card>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              borderRadius: 2,
              boxShadow: 1,
            }}
          >
            {error}
          </Alert>
        )}

        {/* Templates Grid */}
        <Grid container spacing={3}>
          {filteredTemplates?.map((template: Template) => (
            <Grid item xs={12} md={6} key={template._id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                  borderRadius: 2,
                }}
              >
                <CardContent 
                  sx={{ 
                    flexGrow: 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleViewActivities(template)}
                >
                  <Typography variant="h6" gutterBottom color="primary.main" sx={{ fontWeight: 600 }}>
                    {template.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Badge 
                      badgeContent={template.days} 
                      color="primary"
                      sx={{ '& .MuiBadge-badge': { fontSize: '0.8rem', height: '22px', minWidth: '22px' } }}
                    >
                      <CalendarIcon color="action" />
                    </Badge>
                    <Badge 
                      badgeContent={template.activities.length} 
                      color="secondary"
                      sx={{ '& .MuiBadge-badge': { fontSize: '0.8rem', height: '22px', minWidth: '22px' } }}
                    >
                      <ScheduleIcon color="action" />
                    </Badge>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                    <PersonIcon sx={{ mr: 1, fontSize: '1rem' }} />
                    <Typography variant="body2">
                      {template.createdBy.email}
                    </Typography>
                  </Box>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end', gap: 1, p: 2 }}>
                  <Tooltip title="Add Activity">
                    <IconButton
                      onClick={() => {
                        setSelectedTemplate(template);
                        setEditMode(false);
                        setActivityForm({
                          name: '',
                          startTime: '',
                          duration: 30,
                          description: '',
                          day: 1,
                        });
                        setActivityDialogOpen(true);
                      }}
                      sx={{ 
                        color: 'primary.main',
                        '&:hover': { bgcolor: alpha('#0066CC', 0.1) },
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Template">
                    <IconButton
                      onClick={() => {
                        setSelectedTemplate(template);
                        setTemplateForm({
                          name: template.name,
                          days: template.days,
                        });
                        setEditMode(true);
                        setCreateDialogOpen(true);
                      }}
                      sx={{ 
                        color: 'primary.main',
                        '&:hover': { bgcolor: alpha('#0066CC', 0.1) },
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Template">
                    <IconButton
                      onClick={() => handleDeleteTemplate(template._id)}
                      sx={{ 
                        color: 'error.main',
                        '&:hover': { bgcolor: alpha('#DC3545', 0.1) },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Dialogs remain mostly the same but with enhanced styling */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => {
          setCreateDialogOpen(false);
          setEditMode(false);
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3,
          }
        }}
      >
        <DialogTitle sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          px: 3,
          py: 2,
        }}>
          {editMode ? 'Edit Template' : 'Create Template'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            value={templateForm.name}
            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
            sx={{ mb: 2 }}
            InputProps={{
              sx: {
                borderRadius: 1,
              }
            }}
          />
          <TextField
            margin="dense"
            label="Number of Days"
            type="number"
            fullWidth
            value={templateForm.days}
            onChange={(e) => setTemplateForm({ ...templateForm, days: parseInt(e.target.value) || 1 })}
            InputProps={{
              sx: {
                borderRadius: 1,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => {
              setCreateDialogOpen(false);
              setEditMode(false);
            }}
            sx={{ 
              color: 'text.secondary',
              '&:hover': { bgcolor: alpha('#000', 0.05) },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={editMode ? handleUpdateTemplate : handleCreateTemplate} 
            variant="contained"
            sx={{
              px: 3,
              borderRadius: 1,
            }}
          >
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Activities Dialog */}
      <Dialog
        open={activitiesViewDialogOpen}
        onClose={() => setActivitiesViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTemplate?.name} - Activities
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && Object.entries(groupActivitiesByDay(selectedTemplate.activities))
            .sort(([dayA], [dayB]) => parseInt(dayA) - parseInt(dayB))
            .map(([day, activities]) => (
              <Box key={day} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Day {day}
                </Typography>
                <List>
                  {activities.map((activity, index) => (
                    <React.Fragment key={activity._id || index}>
                      <ListItem
                        sx={{
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': {
                            bgcolor: 'grey.200',
                            cursor: 'pointer'
                          }
                        }}
                        onClick={() => handleEditActivity(activity)}
                      >
                        <ListItemText
                          primary={activity.name}
                          secondary={
                            <React.Fragment>
                              <Typography variant="body2">
                                Time: {activity.startTime} - {calculateEndTime(activity.startTime, activity.duration)}
                                {' '}({activity.duration} min)
                              </Typography>
                              {activity.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {activity.description}
                                </Typography>
                              )}
                            </React.Fragment>
                          }
                        />
                      </ListItem>
                      {index < activities.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivitiesViewDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setActivityDialogOpen(true);
              setActivitiesViewDialogOpen(false);
              setEditMode(false);
              setActivityForm({
                name: '',
                startTime: '',
                duration: 30,
                description: '',
                day: 1,
              });
            }}
          >
            Add Activity
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Activity Dialog */}
      <Dialog open={activityDialogOpen} onClose={() => {
        setActivityDialogOpen(false);
        setEditMode(false);
        setSelectedActivity(null);
      }}>
        <DialogTitle>{editMode ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Activity Name"
            fullWidth
            value={activityForm.name}
            onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Start Time"
            fullWidth
            value={activityForm.startTime}
            onChange={(e) => {
              const formattedTime = formatTimeInput(e.target.value);
              setActivityForm({ ...activityForm, startTime: formattedTime });
            }}
            placeholder="HHMM (e.g., 0900 for 09:00)"
            error={activityForm.startTime !== '' && !timeRegex.test(activityForm.startTime)}
            helperText={activityForm.startTime !== '' && !timeRegex.test(activityForm.startTime) ? 'Invalid time format' : ''}
          />
          <TextField
            margin="dense"
            label="Duration (minutes)"
            type="number"
            fullWidth
            value={activityForm.duration}
            onChange={(e) => setActivityForm({ ...activityForm, duration: parseInt(e.target.value) || 30 })}
          />
          {activityForm.startTime && timeRegex.test(activityForm.startTime) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              End Time: {calculateEndTime(activityForm.startTime, activityForm.duration)}
            </Typography>
          )}
          <TextField
            select
            margin="dense"
            label="Day"
            fullWidth
            value={activityForm.day}
            onChange={(e) => setActivityForm({ ...activityForm, day: parseInt(e.target.value) })}
          >
            {selectedTemplate && Array.from({ length: selectedTemplate.days }, (_, i) => i + 1).map((day) => (
              <MenuItem key={day} value={day}>
                Day {day}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={activityForm.description}
            onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setActivityDialogOpen(false);
            setEditMode(false);
            setSelectedActivity(null);
          }}>Cancel</Button>
          <Button onClick={handleAddActivity} variant="contained">
            {editMode ? 'Update' : 'Add'} Activity
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}; 