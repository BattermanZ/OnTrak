import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
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
  ReferenceLine,
} from 'recharts';
import {
  Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery, useQueries } from 'react-query';
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

const Statistics: React.FC = () => {
  const [filters, setFilters] = useState<StatisticsFilters>({
    trainer: 'all',
    training: 'all',
    dateRange: 'month',
  });

  const [selectedTrainer, setSelectedTrainer] = useState<string>('');

  // Update filters when selectedTrainer changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      trainer: selectedTrainer || 'all'
    }));
  }, [selectedTrainer]);

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

  // Add a helper function to parse duration strings
  const parseDuration = useCallback((durationStr: string): number => {
    const hours = durationStr.match(/(\d+)h/);
    const minutes = durationStr.match(/(\d+)min/);
    const isNegative = durationStr.startsWith('-');
    
    let totalMinutes = 0;
    if (hours) totalMinutes += parseInt(hours[1]) * 60;
    if (minutes) totalMinutes += parseInt(minutes[1]);
    
    return isNegative ? -totalMinutes : totalMinutes;
  }, []);

  const timeVarianceData = useMemo(() => {
    if (!statsData) return [];
    
    // Single training, single day view
    if (filters.training !== 'all' && filters.day) {
      const key = `${filters.training}-${filters.day}`;
      const dayData = statsData.daySpecificStats[key]?.activities || [];
      return dayData.map(activity => ({
        name: activity.name,
        timeVariance: parseDuration(activity.averageVariance)
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
          return sum + parseDuration(activity.averageVariance);
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
              return activitySum + parseDuration(activity.averageVariance);
            }, 0);
          }, 0);
        
        return {
          name: training.name,
          timeVariance: totalVariance
        };
      });
    }
    
    return [];
  }, [statsData, filters, parseDuration]);

  // Fetch trainer-specific statistics
  const trainerQueries = useMemo(() => {
    if (!statsData || filters.trainer !== 'all') return [];
    
    return statsData.trainers.map(trainer => ({
      queryKey: ['statistics', { ...filters, trainer: trainer._id }],
      queryFn: async () => {
        const response = await schedules.getStatistics({
          ...filters,
          trainer: trainer._id
        });
        return response.data;
      }
    }));
  }, [statsData, filters]);

  const trainerResults = useQueries(trainerQueries);

  const trainerVarianceData = useMemo(() => {
    if (!statsData || filters.trainer !== 'all') return [];
    
    return statsData.trainers.map((trainer, index) => {
      const trainerStats = trainerResults[index]?.data;
      if (!trainerStats) return { name: trainer.name, timeVariance: 0 };
      
      // Calculate average variance based on the selected view
      if (filters.training !== 'all') {
        if (filters.day) {
          // Single day view
          const key = `${filters.training}-${filters.day}`;
          const dayData = trainerStats.daySpecificStats[key]?.activities || [];
          const totalVariance = dayData.reduce((sum: number, activity: { averageVariance: string }) => {
            return sum + parseDuration(activity.averageVariance);
          }, 0);
          return {
            name: trainer.name,
            timeVariance: dayData.length > 0 ? Math.round(totalVariance / dayData.length) : 0
          };
        } else {
          // All days for specific training
          interface ActivityData {
            activities: Array<{ averageVariance: string }>;
          }
          
          const daysData = Object.entries(trainerStats.daySpecificStats)
            .filter(([key]) => key.startsWith(filters.training))
            .map(([_, data]) => {
              const typedData = data as ActivityData;
              return typedData.activities;
            })
            .flat();

          const totalVariance = daysData.reduce((sum: number, activity: { averageVariance: string }) => {
            return sum + parseDuration(activity.averageVariance);
          }, 0);

          return {
            name: trainer.name,
            timeVariance: daysData.length > 0 ? Math.round(totalVariance / daysData.length) : 0
          };
        }
      } else {
        // All trainings view - use adherence data
        const totalVariance = trainerStats.adherence.reduce((sum: number, activity: { averageVariance: string }) => {
          return sum + parseDuration(activity.averageVariance);
        }, 0);
        return {
          name: trainer.name,
          timeVariance: trainerStats.adherence.length > 0 
            ? Math.round(totalVariance / trainerStats.adherence.length)
            : 0
        };
      }
    });
  }, [statsData, filters, trainerResults, parseDuration]);

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

  const handleBarClick = (data: any) => {
    if (!data || !statsData) return;

    // Determine what type of data was clicked based on current view
    if (filters.training === 'all') {
      // Clicking on a training bar
      const training = statsData.trainings.find(t => t.name === data.name);
      if (training) {
        setFilters(prev => ({ ...prev, training: training._id, day: undefined }));
      }
    } else if (!filters.day) {
      // Clicking on a day bar
      const dayNumber = parseInt(data.name.split(' ')[1]);
      if (!isNaN(dayNumber)) {
        setFilters(prev => ({ ...prev, day: dayNumber }));
      }
    }
  };

  const handleTrainerBarClick = (data: any) => {
    if (!data || !statsData) return;
    const trainer = statsData.trainers.find(t => t.name === data.name);
    if (trainer) {
      setSelectedTrainer(trainer._id);
    }
  };

  const renderTimeVarianceChart = (data: TimeVarianceData[], title: string, isTrainerChart: boolean = false) => (
    <Grid item xs={12}>
      <Paper sx={{ p: 3 }}>
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
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <ReferenceLine y={0} stroke="#666" strokeWidth={2} />
            <XAxis dataKey="name" />
            <YAxis 
              label={{ 
                value: 'Time Variance (minutes)', 
                angle: -90, 
                position: 'insideLeft' 
              }}
              domain={['auto', 'auto']}
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
              onClick={(data) => isTrainerChart ? handleTrainerBarClick(data) : handleBarClick(data)}
              onMouseEnter={(data, index) => {
                const bar = document.querySelector(`#bar-${index}`) as SVGElement;
                if (bar) {
                  bar.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(data, index) => {
                const bar = document.querySelector(`#bar-${index}`) as SVGElement;
                if (bar) {
                  bar.style.opacity = '1';
                }
              }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  id={`bar-${index}`}
                  fill={entry.timeVariance > 0 ? '#EF5350' : '#4CAF50'}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease-in-out',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Grid>
  );

  const renderTimingDistributionCharts = (data: TimeVarianceData[], title: string) => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={filters.trainer === 'all' ? 6 : 12}>
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
                    label={false}
                  >
                    {calculateTimingDistribution(data).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={Object.values(TIMING_COLORS)[index]}
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
        {filters.trainer === 'all' && (
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
                      label={false}
                    >
                      {calculateTimingDistribution(trainerVarianceData).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={Object.values(TIMING_COLORS)[index]}
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
        )}
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header with navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" color="#003366">
            Training Statistics
          </Typography>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small" sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}>
                <InputLabel>Trainer</InputLabel>
                <Select
                  value={selectedTrainer || 'all'}
                  onChange={(e) => setSelectedTrainer(e.target.value === 'all' ? '' : e.target.value)}
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
                  value={filters.day?.toString() || 'all'}
                  onChange={(e) => setFilters({ ...filters, day: e.target.value === 'all' ? undefined : Number(e.target.value) })}
                  disabled={!selectedTraining}
                >
                  <MenuItem value="all">All Days</MenuItem>
                  {selectedTraining?.days && Array.from({ length: selectedTraining.days }, (_, i) => (
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
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                On-Time Activity Start Rate
                <Tooltip title={
                  "Percentage of activities that started on time or early.\n\n" +
                  "Formula: (Number of on-time starts / Total activities) × 100\n\n" +
                  "An activity is considered 'on time' if it started at or before its scheduled start time."
                }>
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              </Typography>
              <Typography variant="h4" color="primary">
                {statsData?.onTimeStartRate || '0%'}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Total Training Days Analysed
                <Tooltip title={
                  "Total number of completed training days in the selected period.\n\n" +
                  "This includes:\n" +
                  "- All days that have been marked as completed\n" +
                  "- Days from all trainers (if no specific trainer is selected)\n" +
                  "- Days from all training types (if no specific training is selected)"
                }>
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
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
            renderTimeVarianceChart(trainerVarianceData, 'Time Variance by Trainer', true)
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