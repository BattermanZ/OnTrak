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
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
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

interface TimeVarianceData {
  name: string;
  timeVariance: number;
}

const TIMING_COLORS = {
  onTime: '#4CAF50',
  early: '#2196F3',
  late: '#EF5350'
};

const CHART_HOVER_STYLE = {
  opacity: 0.8,
  transition: 'opacity 0.3s ease-in-out',
};

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

  const timeVarianceData = useMemo(() => {
    if (!statsData) return [];
    
    // Single training, single day view
    if (filters.training !== 'all' && filters.day) {
      const key = `${filters.training}-${filters.day}`;
      const dayData = statsData.daySpecificStats[key]?.activities || [];
      return dayData.map(activity => ({
        name: activity.name,
        timeVariance: parseInt(activity.averageVariance.replace(/[^-\d]/g, ''))
      }));
    }
    
    // Single training, all days view
    if (filters.training !== 'all') {
      const training = statsData.trainings.find(t => t._id === filters.training);
      if (!training) return [];
      
      return Array.from({ length: training.days }, (_, i) => {
        const dayNumber = i + 1;
        const key = `${filters.training}-${dayNumber}`;
        const dayData = statsData.daySpecificStats[key]?.activities || [];
        const totalVariance = dayData.reduce((sum, activity) => {
          const variance = parseInt(activity.averageVariance.replace(/[^-\d]/g, ''));
          return sum + variance;
        }, 0);
        
        return {
          name: `Day ${dayNumber}`,
          timeVariance: totalVariance
        };
      });
    }
    
    // All trainings view
    if (filters.training === 'all') {
      return statsData.trainings.map(training => {
        const totalVariance = Object.entries(statsData.daySpecificStats)
          .filter(([key]) => key.startsWith(training._id))
          .reduce((sum, [_, data]) => {
            return sum + data.activities.reduce((activitySum, activity) => {
              return activitySum + parseInt(activity.averageVariance.replace(/[^-\d]/g, ''));
            }, 0);
          }, 0);
        
        return {
          name: training.name,
          timeVariance: totalVariance
        };
      });
    }
    
    return [];
  }, [statsData, filters]);

  const trainerVarianceData = useMemo(() => {
    if (!statsData || filters.trainer !== 'all') return [];
    
    return statsData.trainers.map(trainer => {
      const totalVariance = Object.entries(statsData.daySpecificStats)
        .reduce((sum, [_, data]) => {
          return sum + data.activities.reduce((activitySum, activity) => {
            return activitySum + parseInt(activity.averageVariance.replace(/[^-\d]/g, ''));
          }, 0);
        }, 0);
      
      return {
        name: trainer.name,
        timeVariance: totalVariance
      };
    });
  }, [statsData, filters]);

  const calculateTimingDistribution = (data: TimeVarianceData[]) => {
    const total = data.length;
    if (total === 0) return [];

    const distribution = data.reduce((acc, item) => {
      const variance = item.timeVariance;
      const scheduledDuration = 60; // assuming this is available in your data
      const variancePercentage = Math.abs(variance / scheduledDuration) * 100;
      
      if (variancePercentage <= 10) {
        acc.onTime++;
      } else if (variance < 0) {
        acc.early++;
      } else {
        acc.late++;
      }
      return acc;
    }, { onTime: 0, early: 0, late: 0 });

    return [
      { name: 'On Time (±10%)', value: distribution.onTime },
      { name: 'Early', value: distribution.early },
      { name: 'Late', value: distribution.late }
    ];
  };

  const renderTimeVarianceChart = (data: TimeVarianceData[], title: string) => (
    <Grid item xs={12}>
      <Paper sx={{ p: 3, transition: 'transform 0.2s ease-in-out', '&:hover': { transform: 'scale(1.01)' } }}>
        <Typography variant="h6" gutterBottom>
          {title}
          <Tooltip title="Shows how much time was saved (negative values) or exceeded (positive values) compared to scheduled duration">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis 
              label={{ 
                value: 'Time Variance (minutes)', 
                angle: -90, 
                position: 'insideLeft' 
              }}
              domain={[
                (dataMin: number) => Math.floor(Math.min(0, dataMin) / 100) * 100,
                (dataMax: number) => Math.ceil(Math.max(0, dataMax) / 100) * 100
              ]}
              tickFormatter={(value) => Math.round(value).toString()}
            />
            <RechartsTooltip 
              formatter={(value: number) => [`${value} minutes`, 'Time Variance']}
            />
            <Bar 
              dataKey="timeVariance" 
              name="Time Variance"
              fill="#4CAF50"
              animationDuration={300}
              onMouseOver={(data, index) => {
                // Optional: Add any hover effects here
              }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.timeVariance > 0 ? '#EF5350' : '#4CAF50'}
                  style={{ cursor: 'pointer', ...CHART_HOVER_STYLE }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Grid>
  );

  const renderTimingDistributionCharts = (data: TimeVarianceData[], title: string) => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {`${title} Timing Distribution`}
            <Tooltip title="Distribution of activities/days based on their timing performance">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 300, position: 'relative' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={calculateTimingDistribution(data)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  animationDuration={300}
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={{ 
                    stroke: '#666',
                    strokeWidth: 1,
                    distance: 20
                  }}
                  onMouseEnter={(_, index) => {
                    const sector = document.querySelector(`#timing-pie-${index}`) as SVGElement;
                    if (sector) {
                      sector.style.opacity = '0.8';
                    }
                  }}
                  onMouseLeave={(_, index) => {
                    const sector = document.querySelector(`#timing-pie-${index}`) as SVGElement;
                    if (sector) {
                      sector.style.opacity = '1';
                    }
                  }}
                >
                  {calculateTimingDistribution(data).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      id={`timing-pie-${index}`}
                      fill={Object.values(TIMING_COLORS)[index]}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'opacity 0.3s ease-in-out',
                      }}
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any, name: string) => [`${value} (${((Number(value) / data.length) * 100).toFixed(0)}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ 
              position: 'absolute', 
              bottom: 0, 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 2,
              backgroundColor: 'white',
              p: 1,
              borderRadius: 1
            }}>
              {Object.entries(TIMING_COLORS).map(([key, color]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: color, borderRadius: '50%' }} />
                  <Typography variant="caption">{key.charAt(0).toUpperCase() + key.slice(1)}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Trainer Timing Distribution
            <Tooltip title="Distribution of trainers based on their timing performance">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 300, position: 'relative' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={calculateTimingDistribution(trainerVarianceData)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  animationDuration={300}
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={{ 
                    stroke: '#666',
                    strokeWidth: 1,
                    distance: 20
                  }}
                  onMouseEnter={(_, index) => {
                    const sector = document.querySelector(`#trainer-pie-${index}`) as SVGElement;
                    if (sector) {
                      sector.style.opacity = '0.8';
                    }
                  }}
                  onMouseLeave={(_, index) => {
                    const sector = document.querySelector(`#trainer-pie-${index}`) as SVGElement;
                    if (sector) {
                      sector.style.opacity = '1';
                    }
                  }}
                >
                  {calculateTimingDistribution(trainerVarianceData).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      id={`trainer-pie-${index}`}
                      fill={Object.values(TIMING_COLORS)[index]}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'opacity 0.3s ease-in-out',
                      }}
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any, name: string) => [`${value} (${((Number(value) / trainerVarianceData.length) * 100).toFixed(0)}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ 
              position: 'absolute', 
              bottom: 0, 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 2,
              backgroundColor: 'white',
              p: 1,
              borderRadius: 1
            }}>
              {Object.entries(TIMING_COLORS).map(([key, color]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, backgroundColor: color, borderRadius: '50%' }} />
                  <Typography variant="caption">{key.charAt(0).toUpperCase() + key.slice(1)}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

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
              <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}>
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
              <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}>
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
              <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}>
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
              <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}>
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
            <Paper sx={{ 
              p: 3,
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              }
            }}>
              <Typography variant="h6" gutterBottom>
                On-Time Activity Start Rate
              </Typography>
              <Typography variant="h4" color="primary">
                {statsData?.onTimeStartRate || '0%'}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ 
              p: 3,
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              }
            }}>
              <Typography variant="h6" gutterBottom>
                Total Training Days Analysed
              </Typography>
              <Typography variant="h4" color="primary">
                {statsData?.totalTrainingDays || '0'} days
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Time Variance Charts */}
        <Grid container spacing={4}>
          {/* Main time variance chart */}
          {renderTimeVarianceChart(
            timeVarianceData,
            filters.training === 'all' 
              ? 'Time Variance by Training'
              : filters.day
                ? 'Time Variance by Activity'
                : 'Time Variance by Day'
          )}
          
          {/* Trainer time variance chart when viewing all trainers */}
          {filters.trainer === 'all' && (
            renderTimeVarianceChart(trainerVarianceData, 'Time Variance by Trainer')
          )}
          
          {/* Timing distribution pie charts */}
          <Grid item xs={12}>
            {renderTimingDistributionCharts(
              timeVarianceData,
              filters.training === 'all' 
                ? 'Training'
                : filters.day
                  ? 'Activity'
                  : 'Day'
            )}
          </Grid>

          {/* Most Delayed and Efficient Activities */}
          {filters.training !== 'all' && (
            <>
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
            </>
          )}
        </Grid>
      </Box>
    </Container>
  );
};

export default Statistics; 