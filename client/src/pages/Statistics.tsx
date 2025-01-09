import React, { useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from 'react-query';
import { schedules } from '../services/api';

interface StatisticsFilters {
  trainer: string;
  training: string;
  dateRange: 'week' | 'month' | 'year' | 'all';
  day?: number;
}

interface StatisticsData {
  adherence: Array<{
    activity: string;
    onTime: string;
    delayed: string;
    averageVariance: string;
  }>;
  daySpecificStats: {
    [key: string]: {
      activities: Array<{
        name: string;
        scheduledDuration: string;
        averageActualDuration: string;
        averageVariance: string;
      }>;
    };
  };
  onTimeStartRate: string;
  totalTrainingDays: number;
  mostDelayedActivities: Array<{
    name: string;
    averageDelay: string;
  }>;
  mostEfficientActivities: Array<{
    name: string;
    averageTimeSaved: string;
  }>;
  trainers: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
  trainings: Array<{
    _id: string;
    name: string;
    days: number;
  }>;
}

const COLORS = ['#4CAF50', '#FFA726', '#EF5350'];

const Statistics = () => {
  const [filters, setFilters] = useState<StatisticsFilters>({
    trainer: 'all',
    training: 'all',
    dateRange: 'month',
  });

  // Fetch statistics data
  const { data: statsData } = useQuery<StatisticsData>(
    ['statistics', filters],
    async () => {
      const response = await schedules.getStatistics(filters);
      return response.data;
    },
    {
      refetchInterval: false,
    }
  );

  const selectedTraining = useMemo(() => {
    if (!statsData?.trainings || filters.training === 'all') return null;
    return statsData.trainings.find(t => t._id === filters.training);
  }, [statsData, filters.training]);

  const adherenceData = useMemo(() => {
    return statsData?.adherence || [];
  }, [statsData]);

  const daySpecificData = useMemo(() => {
    if (!statsData?.daySpecificStats || !filters.training || !filters.day) return [];
    const key = `${filters.training}-${filters.day}`;
    return statsData.daySpecificStats[key]?.activities || [];
  }, [statsData, filters]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header with navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" color="#003366">
            Training Statistics
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              component={RouterLink}
              to="/"
              startIcon={<DashboardIcon />}
              variant="outlined"
            >
              Dashboard
            </Button>
            <Button
              component={RouterLink}
              to="/setup"
              startIcon={<SettingsIcon />}
              variant="outlined"
            >
              Setup
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Trainer</InputLabel>
                <Select
                  value={filters.trainer}
                  onChange={(e) => setFilters({ ...filters, trainer: e.target.value })}
                >
                  <MenuItem value="all">All Trainers</MenuItem>
                  {(statsData?.trainers || []).map((trainer) => (
                    <MenuItem key={trainer._id} value={trainer._id}>
                      {trainer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Training</InputLabel>
                <Select
                  value={filters.training}
                  onChange={(e) => setFilters({ ...filters, training: e.target.value, day: undefined })}
                >
                  <MenuItem value="all">All Trainings</MenuItem>
                  {(statsData?.trainings || []).map((training) => (
                    <MenuItem key={training._id} value={training._id}>
                      {training.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Day</InputLabel>
                <Select
                  value={filters.day || ''}
                  onChange={(e) => setFilters({ ...filters, day: Number(e.target.value) })}
                  disabled={!selectedTraining}
                >
                  <MenuItem value="">All Days</MenuItem>
                  {selectedTraining && Array.from({ length: selectedTraining.days }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      Day {i + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
                >
                  <MenuItem value="week">Last Week</MenuItem>
                  <MenuItem value="month">Last Month</MenuItem>
                  <MenuItem value="year">Last Year</MenuItem>
                  <MenuItem value="all">All Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                On-Time Start Rate
              </Typography>
              <Typography variant="h4" color="primary">
                {statsData?.onTimeStartRate || '0%'}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Total Training Days
              </Typography>
              <Typography variant="h4" color="primary">
                {statsData?.totalTrainingDays || '0'} days
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Activity Timing Analysis */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Activity Timing Analysis
                <Tooltip title="Shows how activities are performing relative to their scheduled duration">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={filters.day ? daySpecificData : adherenceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  {filters.day ? (
                    <>
                      <Bar dataKey="scheduledDuration" fill="#4CAF50" name="Scheduled Duration" />
                      <Bar dataKey="averageActualDuration" fill="#FFA726" name="Average Actual Duration" />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="onTime" fill="#4CAF50" name="On Time" />
                      <Bar dataKey="delayed" fill="#FFA726" name="Delayed" />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Most Delayed Activities */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Most Delayed Activities
                <Tooltip title="Activities that consistently run longer than scheduled">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </Typography>
              <List>
                {(statsData?.mostDelayedActivities || []).map((activity, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={activity.name}
                      secondary={`Average delay: ${activity.averageDelay}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Most Efficient Activities */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Most Efficient Activities
                <Tooltip title="Activities that are consistently completed faster than scheduled">
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </Typography>
              <List>
                {(statsData?.mostEfficientActivities || []).map((activity, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={activity.name}
                      secondary={`Average time saved: ${activity.averageTimeSaved}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Statistics; 