import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import { useQuery } from 'react-query';
import { format } from 'date-fns';
import { schedules, type Schedule as ScheduleType } from '../services/api';

const Schedule = () => {
  const { id } = useParams<{ id: string }>();

  const { data: schedule, isLoading, error } = useQuery<ScheduleType>({
    queryKey: ['schedule', id],
    queryFn: async () => {
      const response = await schedules.getById(id!);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !schedule) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error">
          {error instanceof Error ? error.message : 'Failed to load schedule'}
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {schedule.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {schedule.description}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Schedule Details
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Start Time: {format(new Date(schedule.startTime), 'HH:mm')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Duration: {schedule.duration} minutes
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Day: {schedule.day}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body2">{schedule.description}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Schedule; 