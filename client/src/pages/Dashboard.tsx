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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { format, parse, addMinutes } from 'date-fns';
import { useSocket } from '../hooks/useSocket';
import { schedules, templates } from '../services/api';
import type { Schedule, Activity, Template } from '../types/index';
import { useQuery, useQueryClient } from 'react-query';
import {
  PlayArrow as PlayArrowIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const ScheduleActivityBox = ({ 
  activity,
  isActive,
  isCompleted,
}: { 
  activity: Activity;
  isActive?: boolean;
  isCompleted?: boolean;
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Paper
        elevation={2}
        sx={{
          flex: 1,
          p: 2,
          bgcolor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: isCompleted || activity.completed ? '4px solid #4CAF50' : isActive ? '4px solid #0066CC' : '4px solid #9E9E9E',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateX(4px)',
            boxShadow: 3,
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: isActive ? 600 : 400,
                color: isCompleted || activity.completed ? '#166534' : 'inherit'
              }}
            >
              {activity.name} ({activity.duration} min)
            </Typography>
            {activity.description && (
              <Typography 
                variant="body2" 
                color={isCompleted || activity.completed ? '#166534' : 'text.secondary'} 
                sx={{ mt: 0.5 }}
              >
                {activity.description}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
      <Typography 
        variant="h6" 
        sx={{ 
          width: '80px', 
          textAlign: 'left',
          color: 'text.secondary',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {format(parse(activity.startTime, 'HH:mm', new Date()), 'HH:mm')}
      </Typography>
    </Box>
  );
};

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
  const [isOvertime, setIsOvertime] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isActive && activity) {
      // Update progress every second
      const updateProgress = () => {
        const scheduledStartTime = parse(activity.startTime, 'HH:mm', new Date());
        const actualStartTimeDate = activity.actualStartTime ? new Date(activity.actualStartTime) : null;
        const startTime = actualStartTimeDate && actualStartTimeDate < scheduledStartTime 
          ? actualStartTimeDate 
          : scheduledStartTime;
        const endTime = addMinutes(startTime, activity.duration);
        const now = new Date();
        const total = endTime.getTime() - startTime.getTime();
        const elapsed = now.getTime() - startTime.getTime();
        const currentProgress = (elapsed / total) * 100;
        
        setProgress(Math.max(currentProgress, 0));
        
        // Calculate overtime
        if (now > endTime) {
          setIsOvertime(true);
          const overtime = (now.getTime() - endTime.getTime()) / (1000 * 60);
          setOvertimeMinutes(Math.ceil(overtime));
        } else {
          setIsOvertime(false);
          setOvertimeMinutes(0);
        }
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
          bgcolor: '#FFFFFF',
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          }
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
        bgcolor: '#FFFFFF',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        border: isActive ? '2px solid #0066CC' : 'none',
        borderLeft: isCompleted ? '4px solid #4CAF50' : isActive ? '4px solid #0066CC' : '4px solid #9E9E9E',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        }
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
            value={Math.min(progress, 100)}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: '#E0E0E0',
              '& .MuiLinearProgress-bar': {
                bgcolor: isOvertime 
                  ? '#DC3545' // Red for overtime
                  : progress > 90 
                    ? '#FFA726' // Orange for last 10%
                    : '#4CAF50', // Green by default
              },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isOvertime 
              ? `${overtimeMinutes} minutes overtime`
              : `${Math.max(Math.ceil((addMinutes(parse(activity.startTime, 'HH:mm', new Date()), activity.duration).getTime() - new Date().getTime()) / 60000), 0)} minutes remaining`
            }
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
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [bgColor, setBgColor] = useState('#F0FDF4'); // Light green default

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

  // Update background color based on current activity progress
  useEffect(() => {
    if (schedule?.currentActivity) {
      const startTime = parse(schedule.currentActivity.startTime, 'HH:mm', new Date());
      const endTime = addMinutes(startTime, schedule.currentActivity.duration);
      const now = new Date();
      const total = endTime.getTime() - startTime.getTime();
      const elapsed = now.getTime() - startTime.getTime();
      const progress = (elapsed / total) * 100;

      if (now > endTime) {
        setBgColor('#FEE2E2'); // Light red for overtime
      } else if (progress > 90) {
        setBgColor('#FFF7ED'); // Light orange for last 10%
      } else {
        setBgColor('#F0FDF4'); // Light green by default
      }
    } else {
      setBgColor('#F0FDF4'); // Light green when no activity
    }
  }, [schedule?.currentActivity]);

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

  const handleNextActivity = async () => {
    try {
      setError('');
      if (!schedule?._id || !schedule.currentActivity?._id) {
        setError('No active activity to move to next');
        return;
      }

      await schedules.nextActivity(schedule._id, schedule.currentActivity._id);
      await queryClient.invalidateQueries('currentSchedule');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to move to next activity');
    }
  };

  const handlePreviousActivity = async () => {
    try {
      setError('');
      if (!schedule?._id || !schedule.currentActivity?._id) {
        setError('No active activity to move from');
        return;
      }

      await schedules.goToPreviousActivity(schedule._id, schedule.currentActivity._id);
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
      setCloseDialogOpen(false);
      setShowCongrats(true);
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
    <Box sx={{ bgcolor: bgColor, minHeight: '100vh', py: 4 }}>
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
                  onClick={() => setCloseDialogOpen(true)}
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
                {schedule.nextActivity ? (
                  <Button
                    variant="contained"
                    onClick={handleNextActivity}
                    startIcon={<SkipNextIcon />}
                    disabled={!schedule.currentActivity}
                  >
                    Next Activity
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => setCloseDialogOpen(true)}
                    sx={{
                      bgcolor: '#4CAF50',
                      '&:hover': {
                        bgcolor: '#388E3C',
                      },
                    }}
                    disabled={!schedule.currentActivity}
                  >
                    Close Day
                  </Button>
                )}
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
                <Grid container spacing={1}>
                  {schedule.activities.map((activity: Activity, index: number) => {
                    const currentIndex = schedule.activities.findIndex((a: Activity) => a._id === schedule.currentActivity?._id);
                    return (
                      <Grid item xs={12} key={activity._id}>
                        <ScheduleActivityBox
                          activity={activity}
                          isActive={activity._id === schedule.currentActivity?._id}
                          isCompleted={index < currentIndex || activity.completed}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </Paper>
            </>
          )}
        </Box>

        {/* Close Day Confirmation Dialog */}
        <Dialog
          open={closeDialogOpen}
          onClose={() => setCloseDialogOpen(false)}
        >
          <DialogTitle>Close Training Day</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to close this training day? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCloseDay}
              variant="contained"
              sx={{
                bgcolor: '#4CAF50',
                '&:hover': {
                  bgcolor: '#388E3C',
                },
              }}
            >
              Close Day
            </Button>
          </DialogActions>
        </Dialog>

        {/* Congratulations Dialog */}
        <Dialog
          open={showCongrats}
          onClose={() => setShowCongrats(false)}
        >
          <DialogTitle>Training Day Complete! 🎉</DialogTitle>
          <DialogContent>
            <Typography>
              Congratulations on completing your training day! Keep up the great work!
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setShowCongrats(false);
                navigate('/');
              }}
              variant="contained"
            >
              Back to Dashboard
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Dashboard; 