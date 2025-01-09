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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" color="#003366">
            Training Setup
          </Typography>
        </Box>

        <TextField
          fullWidth
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 4 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {filteredTemplates?.map((template: Template) => (
            <Grid item xs={12} md={6} key={template._id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box 
                    onClick={() => handleViewActivities(template)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    <Typography variant="h6">{template.name}</Typography>
                    <Typography color="text.secondary">Days: {template.days}</Typography>
                    <Typography color="text.secondary">
                      Created by: {template.createdBy.email}
                    </Typography>
                    <Typography color="text.secondary">
                      Activities: {template.activities.length}
                    </Typography>
                  </Box>
                  <Box>
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
                      color="primary"
                      title="Add Activity"
                    >
                      <AddIcon />
                    </IconButton>
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
                      color="primary"
                      title="Edit Template"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteTemplate(template._id)}
                      color="error"
                      title="Delete Template"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Create/Edit Template Dialog */}
      <Dialog open={createDialogOpen} onClose={() => {
        setCreateDialogOpen(false);
        setEditMode(false);
      }}>
        <DialogTitle>{editMode ? 'Edit Template' : 'Create Template'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            value={templateForm.name}
            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Number of Days"
            type="number"
            fullWidth
            value={templateForm.days}
            onChange={(e) => setTemplateForm({ ...templateForm, days: parseInt(e.target.value) || 1 })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            setEditMode(false);
          }}>Cancel</Button>
          <Button 
            onClick={editMode ? handleUpdateTemplate : handleCreateTemplate} 
            variant="contained"
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