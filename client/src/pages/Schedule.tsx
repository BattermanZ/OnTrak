import React from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  LinearProgress,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { format, parse, addMinutes } from 'date-fns';
import { schedules } from '../services/api';
import type { Schedule as ScheduleType, Activity } from '../types/index';
import type { AxiosResponse } from 'axios';

const Schedule = () => {
  const { data: schedule } = useQuery('currentSchedule', async () => {
    const response = await schedules.getCurrent();
    return response.data;
  });

  if (!schedule) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {schedule.title}
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Day {schedule.selectedDay}
      </Typography>

      <Grid container spacing={3}>
        {schedule.activities.map((activity: Activity) => (
          <Grid item xs={12} key={activity._id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">{activity.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {format(parse(activity.startTime, 'HH:mm', new Date()), 'HH:mm')} - {' '}
                {format(addMinutes(parse(activity.startTime, 'HH:mm', new Date()), activity.duration), 'HH:mm')}
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
    </Container>
  );
};

export default Schedule; 