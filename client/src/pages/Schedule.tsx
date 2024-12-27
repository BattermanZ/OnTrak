import React from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import { schedules } from '../services/api';
import type { Schedule as ScheduleType, Activity } from '../types';
import type { AxiosResponse } from 'axios';

const Schedule = () => {
  const { id } = useParams<{ id: string }>();
  const { data: schedule } = useQuery(['schedule', id], () =>
    schedules.getById(id!).then((res: AxiosResponse<ScheduleType>) => res.data)
  );

  if (!schedule) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {schedule.name}
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {schedule.days} Days
      </Typography>

      <Grid container spacing={3}>
        {schedule.activities.map((activity: Activity) => (
          <Grid item xs={12} md={6} key={activity._id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {activity.name}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Start Time: {format(new Date(`2000-01-01T${activity.startTime}`), 'HH:mm')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Duration: {activity.duration} minutes
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Day: {activity.day}
                </Typography>
              </Box>
              {activity.description && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body2">{activity.description}</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Schedule; 