import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { schedules } from '../services/api';
import { Schedule as ScheduleType } from '../types';

const Schedule = () => {
  const { id } = useParams<{ id: string }>();

  const { data: schedule, isLoading, error } = useQuery<ScheduleType>({
    queryKey: ['schedule', id],
    queryFn: () => schedules.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !schedule) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Failed to load schedule'}
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {schedule.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {schedule.description}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Schedule Details
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Start Date: {format(new Date(schedule.startDate), 'PPP')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  End Date: {format(new Date(schedule.endDate), 'PPP')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Status: <Chip label={schedule.status} size="small" />
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Progress: {Math.round(schedule.progress)}%
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Sessions
              </Typography>
              {schedule.sessions.map((session) => (
                <Paper
                  key={session._id}
                  sx={{ p: 2, mb: 2, backgroundColor: 'background.default' }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    {session.title}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Date: {format(new Date(session.date), 'PPP')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Time: {session.startTime} - {session.endTime}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Status: <Chip label={session.status} size="small" />
                      </Typography>
                      {session.notes && (
                        <Typography variant="body2" color="text.secondary">
                          Notes: {session.notes}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Schedule; 