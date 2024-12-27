import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  Button,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { format } from 'date-fns';
import { useSocket } from '../hooks/useSocket';
import { schedules } from '../services/api';
import type { Schedule, Activity } from '../types';
import { useQuery } from 'react-query';

const Dashboard = () => {
  const socket = useSocket();
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const { data: schedule, isLoading } = useQuery('todaySchedule', async () => {
    const response = await schedules.getCurrentSchedule();
    return response.data;
  });

  useEffect(() => {
    if (socket) {
      socket.on('scheduleUpdate', (updatedSchedule: Schedule) => {
        // Handle real-time schedule updates
        console.log('Schedule updated:', updatedSchedule);
      });
    }

    return () => {
      if (socket) {
        socket.off('scheduleUpdate');
      }
    };
  }, [socket]);

  useEffect(() => {
    if (schedule?.currentActivity) {
      setCurrentActivity(schedule.currentActivity);
      const endTime = new Date(schedule.currentActivity.startTime).getTime() + 
        schedule.currentActivity.duration * 60000;
      const updateTimeRemaining = () => {
        const now = new Date().getTime();
        const remaining = endTime - now;
        if (remaining > 0) {
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(0);
        }
      };
      
      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 1000);
      
      return () => clearInterval(interval);
    }
  }, [schedule?.currentActivity]);

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
          <Typography variant="h4" gutterBottom color="#003366">
            Today's Schedule
          </Typography>
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
        </Box>

        <Grid container spacing={4}>
          {/* Previous Activity */}
          <Grid item xs={12} md={4}>
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
                Previous Activity
              </Typography>
              {schedule?.previousActivity ? (
                <>
                  <Typography variant="subtitle1">{schedule.previousActivity.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(schedule.previousActivity.startTime), 'HH:mm')} -{' '}
                    {format(
                      new Date(schedule.previousActivity.startTime).getTime() +
                        schedule.previousActivity.duration * 60000,
                      'HH:mm'
                    )}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No previous activity
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Current Activity */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                bgcolor: '#FFFFFF',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                border: '2px solid #0066CC',
              }}
            >
              <Typography variant="h6" gutterBottom color="#0066CC">
                Current Activity
              </Typography>
              {schedule?.currentActivity ? (
                <>
                  <Typography variant="subtitle1">{schedule.currentActivity.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(schedule.currentActivity.startTime), 'HH:mm')} -{' '}
                    {format(
                      new Date(schedule.currentActivity.startTime).getTime() +
                        schedule.currentActivity.duration * 60000,
                      'HH:mm'
                    )}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={
                        ((schedule.currentActivity.duration * 60000 - timeRemaining) /
                          (schedule.currentActivity.duration * 60000)) *
                        100
                      }
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
                      {Math.ceil(timeRemaining / 60000)} minutes remaining
                    </Typography>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No current activity
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Next Activity */}
          <Grid item xs={12} md={4}>
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
                Next Activity
              </Typography>
              {schedule?.nextActivity ? (
                <>
                  <Typography variant="subtitle1">{schedule.nextActivity.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(schedule.nextActivity.startTime), 'HH:mm')} -{' '}
                    {format(
                      new Date(schedule.nextActivity.startTime).getTime() +
                        schedule.nextActivity.duration * 60000,
                      'HH:mm'
                    )}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No next activity
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Full Schedule */}
        <Paper elevation={3} sx={{ mt: 4, p: 3 }}>
          <Typography variant="h6" gutterBottom color="#003366">
            Full Schedule
          </Typography>
          <Grid container spacing={2}>
            {schedule?.activities?.map((activity) => (
              <Grid item xs={12} key={activity._id}>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: '#F5F5F5',
                    borderLeft: '4px solid #0066CC',
                  }}
                >
                  <Typography variant="subtitle1">{activity.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(activity.startTime), 'HH:mm')} -{' '}
                    {format(
                      new Date(activity.startTime).getTime() + activity.duration * 60000,
                      'HH:mm'
                    )}
                  </Typography>
                  {activity.description && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {activity.description}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default Dashboard; 