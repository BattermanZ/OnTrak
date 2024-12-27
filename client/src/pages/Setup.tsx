import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { templates, type Template, type Activity } from '../services/api';
import { format, addMinutes } from 'date-fns';

interface TemplateFormData {
  name: string;
  days: number;
}

interface ActivityFormData {
  name: string;
  startTime: string;
  duration: number;
  description: string;
  day: number;
}

const Setup = () => {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateFormData>({
    name: '',
    days: 1,
  });
  const [activityForm, setActivityForm] = useState<ActivityFormData>({
    name: '',
    startTime: '09:00',
    duration: 60,
    description: '',
    day: 1,
  });

  const { data: templateList } = useQuery('templates', async () => {
    const response = await templates.getAll();
    return response.data;
  });

  const createTemplateMutation = useMutation(
    async (data: TemplateFormData) => {
      const response = await templates.create(data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('templates');
        setTemplateForm({ name: '', days: 1 });
      },
    }
  );

  const createActivityMutation = useMutation(
    async (data: ActivityFormData) => {
      if (!selectedTemplate) throw new Error('No template selected');
      const response = await templates.addActivity(selectedTemplate, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('templates');
        setOpenDialog(false);
        setActivityForm({
          name: '',
          startTime: '09:00',
          duration: 60,
          description: '',
          day: 1,
        });
      },
    }
  );

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplateMutation.mutate(templateForm);
  };

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTemplate) {
      createActivityMutation.mutate(activityForm);
    }
  };

  const handleTemplateClick = (templateId: string) => {
    setSelectedTemplate(selectedTemplate === templateId ? null : templateId);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" color="#003366" gutterBottom>
        Training Setup
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, bgcolor: '#FFFFFF' }}>
            <Typography variant="h5" color="#003366" gutterBottom>
              Create Template
            </Typography>
            <Box component="form" onSubmit={handleTemplateSubmit}>
              <TextField
                fullWidth
                label="Template Name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                sx={{ mb: 2 }}
                required
              />
              <TextField
                fullWidth
                type="number"
                label="Number of Days"
                value={templateForm.days}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, days: parseInt(e.target.value) })
                }
                inputProps={{ min: 1 }}
                sx={{ mb: 2 }}
                required
              />
              <Button
                type="submit"
                variant="contained"
                sx={{
                  bgcolor: '#0066CC',
                  '&:hover': {
                    bgcolor: '#003366',
                  },
                }}
              >
                Create Template
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" color="#003366">
                Templates
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
                disabled={!selectedTemplate}
                sx={{
                  bgcolor: '#0066CC',
                  '&:hover': {
                    bgcolor: '#003366',
                  },
                }}
              >
                Add Activity
              </Button>
            </Box>
            <List>
              {templateList?.map((template: Template) => (
                <React.Fragment key={template.id}>
                  <ListItem
                    button
                    onClick={() => handleTemplateClick(template.id)}
                    sx={{
                      bgcolor: '#F5F5F5',
                      mb: 1,
                      borderRadius: 1,
                    }}
                  >
                    <ListItemText
                      primary={template.name}
                      secondary={`${template.days} days`}
                    />
                    {selectedTemplate === template.id ? <ExpandLess /> : <ExpandMore />}
                  </ListItem>
                  <Collapse in={selectedTemplate === template.id}>
                    <List component="div" disablePadding>
                      {template.activities.map((activity: Activity) => (
                        <ListItem
                          key={activity.id}
                          sx={{ pl: 4, borderLeft: '2px solid #0066CC' }}
                        >
                          <ListItemText
                            primary={activity.name}
                            secondary={
                              <>
                                Day {activity.day} | {format(new Date(`2000-01-01T${activity.startTime}`), 'HH:mm')} - {' '}
                                {format(addMinutes(new Date(`2000-01-01T${activity.startTime}`), activity.duration), 'HH:mm')}
                                <br />
                                {activity.description}
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#003366' }}>Add Activity</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleActivitySubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Activity Name"
              value={activityForm.name}
              onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              type="time"
              label="Start Time"
              value={activityForm.startTime}
              onChange={(e) =>
                setActivityForm({ ...activityForm, startTime: e.target.value })
              }
              sx={{ mb: 2 }}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="number"
              label="Duration (minutes)"
              value={activityForm.duration}
              onChange={(e) =>
                setActivityForm({
                  ...activityForm,
                  duration: parseInt(e.target.value),
                })
              }
              sx={{ mb: 2 }}
              required
              inputProps={{ min: 1 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Day</InputLabel>
              <Select
                value={activityForm.day}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, day: e.target.value as number })
                }
                required
              >
                {Array.from(
                  { length: templateList?.find((t: Template) => t.id === selectedTemplate)?.days || 1 },
                  (_, i) => i + 1
                ).map((day) => (
                  <MenuItem key={day} value={day}>
                    Day {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={activityForm.description}
              onChange={(e) =>
                setActivityForm({ ...activityForm, description: e.target.value })
              }
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleActivitySubmit}
            variant="contained"
            sx={{
              bgcolor: '#0066CC',
              '&:hover': {
                bgcolor: '#003366',
              },
            }}
          >
            Add Activity
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Setup; 