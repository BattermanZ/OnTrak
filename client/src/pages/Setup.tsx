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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { templates } from '../services/api';
import { useQuery, useQueryClient } from 'react-query';
import type { Template, Activity } from '../types';
import { logger } from '../utils/logger';

export const Setup = () => {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<string>('');

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

  // Fetch templates
  const { data: templateList } = useQuery('templates', async () => {
    const response = await templates.getAll();
    return response.data;
  });

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

  const handleAddActivity = async () => {
    if (!selectedTemplate) {
      setError('No template selected');
      return;
    }

    try {
      setError('');
      logger.debug('Adding activity', { templateId: selectedTemplate._id, activity: activityForm });
      
      await templates.addActivity(selectedTemplate._id, activityForm);
      await queryClient.invalidateQueries('templates');
      
      setActivityForm({
        name: '',
        startTime: '',
        duration: 30,
        description: '',
        day: 1,
      });
      setActivityDialogOpen(false);
    } catch (err: any) {
      logger.error('Error adding activity', err);
      setError(err.response?.data?.message || 'Failed to add activity');
    }
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
          <Typography variant="h4">Templates</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Template
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {templateList?.map((template: Template) => (
            <Grid item xs={12} md={6} key={template._id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6">{template.name}</Typography>
                    <Typography color="text.secondary">Days: {template.days}</Typography>
                    <Typography color="text.secondary">
                      Activities: {template.activities.length}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton
                      onClick={() => {
                        setSelectedTemplate(template);
                        setActivityDialogOpen(true);
                      }}
                      color="primary"
                    >
                      <AddIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteTemplate(template._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                {template.activities.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Activities:
                    </Typography>
                    {template.activities.map((activity: Activity, index: number) => (
                      <Paper key={index} sx={{ p: 1, mb: 1, bgcolor: 'grey.100' }}>
                        <Typography variant="body2">
                          Day {activity.day}: {activity.name} ({activity.startTime}, {activity.duration}min)
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create Template</DialogTitle>
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
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={activityDialogOpen} onClose={() => setActivityDialogOpen(false)}>
        <DialogTitle>Add Activity</DialogTitle>
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
            label="Start Time (HH:MM)"
            fullWidth
            value={activityForm.startTime}
            onChange={(e) => setActivityForm({ ...activityForm, startTime: e.target.value })}
            placeholder="09:00"
          />
          <TextField
            margin="dense"
            label="Duration (minutes)"
            type="number"
            fullWidth
            value={activityForm.duration}
            onChange={(e) => setActivityForm({ ...activityForm, duration: parseInt(e.target.value) || 30 })}
          />
          <TextField
            margin="dense"
            label="Day"
            type="number"
            fullWidth
            value={activityForm.day}
            onChange={(e) => setActivityForm({ ...activityForm, day: parseInt(e.target.value) || 1 })}
          />
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
          <Button onClick={() => setActivityDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddActivity} variant="contained">
            Add Activity
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}; 