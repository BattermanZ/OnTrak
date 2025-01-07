import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { format, parse, addMinutes } from 'date-fns';
import { useSocket } from '../hooks/useSocket';
import { schedules, templates } from '../services/api';
import type { Schedule, Activity, Template } from '../types';
import { useQuery, useQueryClient } from 'react-query';
import {
  PlayArrow as PlayArrowIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const ActivityBox = ({ 
  title, 
  activity,
  isActive,
  isCompleted,
}: { 
  title: string; 
  activity: Activity | null;
  isActive?: boolean;
  isCompleted?: boolean;
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isActive && activity) {
      // Update progress every second
      const updateProgress = () => {
        const startTime = parse(activity.startTime, 'HH:mm', new Date());
        const endTime = addMinutes(startTime, activity.duration);
        const now = new Date();
        const total = endTime.getTime() - startTime.getTime();
        const elapsed = now.getTime() - startTime.getTime();
        setProgress(Math.min(Math.max((elapsed / total) * 100, 0), 100));
      };

      // Initial update
      updateProgress();
      
      // Set up interval for live updates
      intervalId = setInterval(updateProgress, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isActive, activity]);

  if (!activity) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 3,
          bgcolor: '#F5F5F5',
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography variant="h6" gutterBottom color="#003366">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No {title.toLowerCase()}
        </Typography>
      </Paper>
    );
  }

  const startTime = parse(activity.startTime, 'HH:mm', new Date());
  const endTime = addMinutes(startTime, activity.duration);

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        bgcolor: isActive ? '#FFFFFF' : '#F5F5F5',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        border: isActive ? '2px solid #0066CC' : 'none',
        borderLeft: isCompleted ? '4px solid #4CAF50' : isActive ? '4px solid #0066CC' : '4px solid #9E9E9E',
      }}
    >
      <Typography variant="h6" gutterBottom color={isActive ? '#0066CC' : '#003366'}>
        {title}
      </Typography>
      <Typography variant="subtitle1">{activity.name}</Typography>
      <Typography variant="body2" color="text.secondary">
        {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
      </Typography>
      {activity.description && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {activity.description}
        </Typography>
      )}
      {isActive && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: '#E0E0E0',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#0066CC',
              },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {Math.max(Math.ceil((endTime.getTime() - new Date().getTime()) / 60000), 0)} minutes remaining
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [error, setError] = useState<string>('');

  // Fetch templates
  const { data: templateList } = useQuery('templates', async () => {
    const response = await templates.getAll();
    return response.data;
  });

  // Fetch current schedule
  const { data: schedule, isLoading } = useQuery('currentSchedule', async () => {
    const response = await schedules.getCurrentSchedule();
    return response.data;
  });

  useEffect(() => {
    if (socket) {
      socket.on('schedule:updated', (updatedSchedule: Schedule) => {
        queryClient.setQueryData('currentSchedule', updatedSchedule);
      });
    }

    return () => {
      if (socket) {
        socket.off('schedule:updated');
      }
    };
  }, [socket, queryClient]);

  const handleStartDay = async () => {
    try {
      setError('');
      if (!selectedTemplate || !selectedDay) {
        setError('Please select a template and day to start');
        return;
      }

      await schedules.startDay(selectedTemplate, selectedDay);
      await queryClient.invalidateQueries('currentSchedule');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start day');
    }
  };

  const handleSkipActivity = async () => {
    try {
      setError('');
      if (!schedule?._id || !schedule.currentActivity?._id) {
        setError('No active activity to skip');
        return;
      }

      await schedules.skipActivity(schedule._id, schedule.currentActivity._id);
      await queryClient.invalidateQueries('currentSchedule');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to skip activity');
    }
  };

  const handlePreviousActivity = async () => {
    try {
      setError('');
      if (!schedule?._id || !schedule.previousActivity?._id) {
        setError('No previous activity available');
        return;
      }

      await schedules.goToPreviousActivity(schedule._id, schedule.previousActivity._id);
      await queryClient.invalidateQueries('currentSchedule');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to go to previous activity');
    }
  };

  const handleCloseDay = async () => {
    try {
      setError('');
      await schedules.closeDay();
      await queryClient.invalidateQueries('currentSchedule');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close day');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err: any) {
      setError('Failed to logout');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h5" color="#003366">
              {schedule ? schedule.title : "Today's Schedule"}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {schedule && (
              <Button
                variant="contained"
                color="secondary"
                onClick={handleCloseDay}
                sx={{
                  bgcolor: '#4CAF50',
                  '&:hover': {
                    bgcolor: '#388E3C',
                  },
                }}
              >
                Close Day
              </Button>
            )}
            <Button
              component={RouterLink}
              to="/setup"
              variant="contained"
              sx={{
                bgcolor: '#0066CC',
                '&:hover': {
                  bgcolor: '#003366',
                },
              }}
            >
              Setup Templates
            </Button>
            <IconButton
              onClick={handleLogout}
              sx={{
                color: '#DC3545',
                '&:hover': {
                  bgcolor: 'rgba(220, 53, 69, 0.1)',
                },
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Box>

        {!schedule && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Start Your Day
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Select Template</InputLabel>
                  <Select
                    value={selectedTemplate || ''}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    label="Select Template"
                  >
                    {templateList?.map((template: Template) => (
                      <MenuItem key={template._id} value={template._id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Select Day</InputLabel>
                  <Select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                    label="Select Day"
                  >
                    {selectedTemplate && templateList?.find((t: Template) => t._id === selectedTemplate)?.days ?
                      Array.from(
                        { length: templateList.find((t: Template) => t._id === selectedTemplate)!.days },
                        (_, i) => i + 1
                      ).map((day) => (
                        <MenuItem key={day} value={day}>
                          Day {day}
                        </MenuItem>
                      ))
                      : <MenuItem value={1}>Day 1</MenuItem>
                    }
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleStartDay}
                  startIcon={<PlayArrowIcon />}
                  sx={{ height: '56px' }}
                >
                  Start Day
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {schedule && (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
              <Button
                variant="contained"
                onClick={handlePreviousActivity}
                startIcon={<SkipPreviousIcon />}
                disabled={!schedule.previousActivity}
              >
                Previous Activity
              </Button>
              <Button
                variant="contained"
                onClick={handleSkipActivity}
                startIcon={<SkipNextIcon />}
                disabled={!schedule.currentActivity}
              >
                Skip Activity
              </Button>
            </Box>

            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <ActivityBox
                  title="Previous Activity"
                  activity={schedule.previousActivity}
                  isCompleted={true}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <ActivityBox
                  title="Current Activity"
                  activity={schedule.currentActivity}
                  isActive={true}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <ActivityBox
                  title="Next Activity"
                  activity={schedule.nextActivity}
                />
              </Grid>
            </Grid>

            <Paper elevation={3} sx={{ mt: 4, p: 3 }}>
              <Typography variant="h6" gutterBottom color="#003366">
                Full Schedule
              </Typography>
              <Grid container spacing={2}>
                {schedule.activities.map((activity: Activity) => (
                  <Grid item xs={12} key={activity._id}>
                    <ActivityBox
                      title={activity.name}
                      activity={activity}
                      isActive={activity._id === schedule.currentActivity?._id}
                      isCompleted={activity._id === schedule.previousActivity?._id}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard; 