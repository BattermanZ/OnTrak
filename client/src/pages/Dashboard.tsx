import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { schedules } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: scheduleList, isLoading, error } = useQuery({
    queryKey: ['schedules'],
    queryFn: schedules.getAll,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Failed to load schedules'}
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {user?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Your training schedule dashboard
        </Typography>

        <Grid container spacing={3}>
          {scheduleList?.map((schedule) => (
            <Grid item xs={12} sm={6} md={4} key={schedule._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {schedule.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {schedule.description}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Status: {schedule.status}
                    </Typography>
                    <Typography variant="body2">
                      Progress: {Math.round(schedule.progress)}%
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    onClick={() => navigate(`/schedule/${schedule._id}`)}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard; 