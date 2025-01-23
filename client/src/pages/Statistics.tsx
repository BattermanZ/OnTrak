import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { Info as InfoIcon, Download as DownloadIcon } from 'lucide-react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { schedules } from '../services/api';
import { logger } from '../utils/logger';
import debounce from 'lodash/debounce';
import type {
  StatisticsData,
  StatisticsFilters,
  TimeVarianceData,
  AdherenceItem,
  ActivityStats,
  Training,
  Trainer
} from '../types';

// Shadcn components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Button } from "../components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

const TIMING_COLORS = {
  onTime: '#22c55e',  // green-500
  early: '#3b82f6',   // blue-500
  late: '#f43f5e'     // rose-500
};

const CHART_COLORS = {
  positive: '#22c55e',  // green-500
  negative: '#f43f5e',  // rose-500
  neutral: '#3b82f6',   // blue-500
  onTimePositive: '#fb923c'  // orange-400
};

const exportStatisticsToCSV = (statsData: StatisticsData) => {
  const rows = [
    // Headers
    ['Adherence', 'Activity', 'On Time', 'Delayed', 'Average Variance'],
    // Adherence Data
    ...statsData.adherence.map((item: AdherenceItem) => 
      ['Adherence', item.activity, item.onTime, item.delayed, item.averageVariance]
    )
  ];

  // Convert to CSV
  const csvContent = rows
    .map(row => row.map((cell: string) => `"${cell}"`).join(','))
    .join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'training_statistics.csv';
  link.click();
};

export default function Statistics() {
  const [filters, setFilters] = useState<StatisticsFilters>({
    trainer: 'all',
    training: 'all',
    dateRange: 'all'
  });

  const [selectedTrainer, setSelectedTrainer] = useState<string>('');
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Debounce filter changes
  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedFilters(filters);
    }, 300);
    handler();
    return () => handler.cancel();
  }, [filters]);

  // Update filters when selectedTrainer changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      trainer: selectedTrainer || 'all'
    }));
  }, [selectedTrainer]);

  const { data: statistics, isLoading, error: queryError } = useQuery<StatisticsData>({
    queryKey: ['statistics', debouncedFilters],
    queryFn: async ({ signal }) => {
      try {
        logger.debug('Fetching statistics with filters:', debouncedFilters);
        const response = await schedules.getStatistics(debouncedFilters);
        logger.debug('Statistics response:', response.data);
        return response.data;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          logger.debug('Statistics request was cancelled');
          throw error;
        }
        logger.error('Error fetching statistics:', error);
        throw error;
      }
    },
    staleTime: 30000,
    retry: (failureCount: number, error: Error) => {
      if (error.name === 'AbortError') return false;
      return failureCount < 3;
    }
  });

  const parseDuration = useCallback((durationStr: string): number => {
    const match = durationStr.match(/(-?\d+)/);
    return match ? parseInt(match[0]) : 0;
  }, []);

  const timeVarianceData = useMemo(() => {
    console.log('Statistics data:', statistics);
    if (!statistics) {
      console.log('No statistics data available');
      return [];
    }

    // All trainings view
    if (debouncedFilters.training === 'all') {
      console.log('All trainings view');
      console.log('Available trainings:', statistics.trainings);
      return (statistics.trainings || []).map((training: Training) => {
        const result = {
          name: training.name,
          timeVariance: training.timeVariance || 0
        };
        console.log(`Training ${training.name} data:`, result);
        return result;
      });
    }

    // Single training, specific day view
    if (debouncedFilters.day) {
      console.log('Single training, specific day view');
      if (!statistics.dailyStats) {
        console.log('No daily stats available');
        return [];
      }
      
      const dayStats = statistics.dailyStats.find(d => d.day === debouncedFilters.day);
      if (!dayStats?.activities) {
        console.log('No activity stats available for selected day');
        return [];
      }
      
      console.log('Day stats:', dayStats);
      return dayStats.activities.map((activity: ActivityStats) => ({
        name: activity.name,
        timeVariance: activity.timeVariance
      }));
    }

    // Single training view - show daily stats
    console.log('Single training view');
    if (!statistics.dailyStats) {
      console.log('No daily stats available');
      return [];
    }
    console.log('Daily stats:', statistics.dailyStats);
    
    return statistics.dailyStats.map((day) => ({
      name: `Day ${day.day}`,
      timeVariance: day.timeVariance
    }));
  }, [statistics, debouncedFilters.training, debouncedFilters.day]);

  // Chart title based on view
  const chartTitle = useMemo(() => {
    if (!statistics?.trainings) return 'Schedule Accuracy';
    
    if (debouncedFilters.training === 'all') {
      return 'Schedule Accuracy by Program';
    }
    const selectedTrainingName = statistics.trainings.find(
      t => t._id === debouncedFilters.training
    )?.name;
    if (debouncedFilters.day) {
      return `Activity Timing Analysis - ${selectedTrainingName || 'Selected Training'} (Day ${debouncedFilters.day})`;
    }
    return `Daily Schedule Accuracy - ${selectedTrainingName || 'Selected Training'}`;
  }, [debouncedFilters.training, debouncedFilters.day, statistics?.trainings]);

  // Debounced trainer queries
  const trainerQueries = useMemo(() => {
    if (!statistics?.trainers || debouncedFilters.trainer !== 'all') return { queries: [] };
    
    return {
      queries: statistics.trainers.map((trainer: Trainer) => ({
        queryKey: ['statistics', { ...debouncedFilters, trainer: trainer._id }],
        queryFn: async () => {
          const response = await schedules.getStatistics({
            ...debouncedFilters,
            trainer: trainer._id
          });
          return response.data;
        },
        staleTime: 30000,
        retry: (failureCount: number, error: Error) => {
          if (error.name === 'AbortError') return false;
          return failureCount < 3;
        }
      }))
    };
  }, [statistics, debouncedFilters]);

  const trainerResults = useQueries(trainerQueries);

  const trainerVarianceData = useMemo(() => {
    if (!statistics?.trainers || debouncedFilters.trainer !== 'all') return [];
    
    // Single training, specific day view
    if (debouncedFilters.training !== 'all' && debouncedFilters.day) {
      console.log('Single day view - showing trainer performance');
      if (!statistics.dailyStats) {
        console.log('No daily stats available');
        return [];
      }
      
      const dayStats = statistics.dailyStats.find(d => d.day === debouncedFilters.day);
      if (!dayStats?.trainers) {
        console.log('No trainer stats available for selected day');
        return [];
      }
      
      console.log('Day trainer stats:', dayStats.trainers);
      return dayStats.trainers;
    }
    
    // All trainings or single training (all days) view
    const trainerData = statistics.trainers.map((trainer: Trainer, index: number) => {
      const trainerStats = trainerResults[index]?.data as StatisticsData | undefined;
      if (!trainerStats?.adherence?.length) return null;
      
      const totalVariance = trainerStats.adherence.reduce((sum: number, activity: AdherenceItem) => {
        return sum + parseDuration(activity.averageVariance);
      }, 0);

      return {
        name: trainer.name,
        timeVariance: Math.round(totalVariance / trainerStats.adherence.length)
      };
    });

    // Filter out trainers with no data
    return trainerData.filter((data): data is TimeVarianceData => data !== null);
  }, [statistics, debouncedFilters, trainerResults, parseDuration]);

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

  const handleBarClick = (data: { name: string }) => {
    if (!data || !statistics) return;

    // Determine what type of data was clicked based on current view
    if (debouncedFilters.training === 'all') {
      // Clicking on a training bar
      const training = statistics.trainings.find(t => t.name === data.name);
      if (training) {
        setFilters(prev => ({ ...prev, training: training._id, day: undefined }));
      }
    } else if (!debouncedFilters.day) {
      // Clicking on a day bar
      const dayNumber = parseInt(data.name.split(' ')[1]);
      if (!isNaN(dayNumber)) {
        setFilters(prev => ({ ...prev, day: dayNumber }));
      }
    }
  };

  const handleTrainerBarClick = (data: { name: string }) => {
    if (!data || !statistics) return;
    const trainer = statistics.trainers.find(t => t.name === data.name);
    if (trainer) {
      setSelectedTrainer(trainer._id);
    }
  };

  const renderTimeVarianceChart = (data: TimeVarianceData[], title: string, isTrainerChart: boolean = false) => {
    console.log('Rendering chart with data:', data);
    const chartTitle = isTrainerChart ? 'Timing Performance by Trainer' : (
      debouncedFilters.training === 'all' 
        ? 'Schedule Accuracy by Program'
        : debouncedFilters.day
          ? 'Activity Timing Analysis'
          : 'Daily Schedule Accuracy'
    );

    const tooltipContent = isTrainerChart 
      ? "How accurately each trainer follows scheduled timings.\n\nCalculation: Average(Σ(actual_end_time - actual_start_time) - scheduled_duration) per trainer across all their sessions"
      : "How well training programs stay on schedule.\n\nCalculation: Sum(actual_duration - scheduled_duration) for all activities\nNegative = Ahead of schedule, Positive = Behind schedule";

    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{chartTitle}</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <InfoIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm whitespace-pre-line">
                    <p>{tooltipContent}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <ReferenceLine y={0} stroke="#666" strokeWidth={2} />
                  <XAxis 
                    dataKey="name" 
                    interval={0}
                    angle={data.length > 5 ? -35 : 0}
                    textAnchor="middle"
                    height={data.length > 5 ? 120 : 40}
                    tickMargin={data.length > 5 ? 35 : 10}
                    dx={data.length > 5 ? -10 : 0}
                    dy={data.length > 5 ? 20 : 0}
                  />
                  <YAxis 
                    label={{ 
                      value: 'Time Variance (minutes)', 
                      angle: -90, 
                      position: 'insideLeft',
                      offset: 0,
                      style: {
                        textAnchor: 'middle',
                        fill: '#6b7280',
                        fontSize: 12
                      }
                    }}
                    domain={[
                      (dataMin: number) => Math.floor(Math.min(0, dataMin) / 5) * 5,
                      (dataMax: number) => Math.ceil(Math.max(0, dataMax) / 5) * 5
                    ]}
                    tickFormatter={(value) => Math.round(value).toString()}
                  />
                  <RechartsTooltip />
                  <Bar dataKey="timeVariance" onClick={isTrainerChart ? handleTrainerBarClick : handleBarClick}>
                    {data.map((entry: TimeVarianceData, index: number) => {
                      // Calculate if the variance is within 10% of scheduled duration
                      const scheduledDuration = 60; // Default duration in minutes
                      const variancePercentage = Math.abs(entry.timeVariance / scheduledDuration) * 100;
                      const isOnTime = variancePercentage <= 10;
                      
                      let fillColor;
                      if (entry.timeVariance <= 0) {
                        fillColor = CHART_COLORS.positive;
                      } else if (isOnTime) {
                        fillColor = CHART_COLORS.onTimePositive;
                      } else {
                        fillColor = CHART_COLORS.negative;
                      }
                      
                      return (
                        <Cell 
                          key={`cell-${index}`}
                          fill={fillColor}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTimingDistributionCharts = (data: TimeVarianceData[], entityType: string) => {
    const distributionData = calculateTimingDistribution(data);
    const chartTitle = entityType === 'Trainer' ? 'Trainer Timing Patterns' : 'Schedule Adherence Distribution';
    const tooltipContent = entityType === 'Trainer'
      ? "How each trainer typically manages activity timing.\n\nCalculations:\n- On Time: |actual_start - scheduled_start| ≤ 6 minutes\n- Early: actual_start < scheduled_start - 6 minutes\n- Late: actual_start > scheduled_start + 6 minutes"
      : "Breakdown of timing performance categories.\n\nCalculations:\n- On Time: |variance| ≤ 10% of scheduled duration\n- Early: variance < -10% of scheduled duration\n- Late: variance > 10% of scheduled duration";
    
    return (
      <div className="w-full">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{chartTitle}</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <InfoIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm whitespace-pre-line">
                    <p>{tooltipContent}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={
                          entry.name.includes('On Time') ? TIMING_COLORS.onTime :
                          entry.name.includes('Early') ? TIMING_COLORS.early :
                          TIMING_COLORS.late
                        }
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Debounced filter change handlers
  const handleTrainingChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, training: value, day: undefined }));
  }, []);

  const handleDayChange = useCallback((value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      day: value === 'all' ? undefined : parseInt(value) 
    }));
  }, []);

  const handleDateRangeChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, dateRange: value }));
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Statistics</h1>
          <p className="text-gray-600 mt-2">Training performance analysis</p>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading || !statistics}
          onClick={() => {
            try {
              if (!statistics) {
                logger.error('No statistics data available to export');
                return;
              }
              exportStatisticsToCSV(statistics);
            } catch (error) {
              logger.error('Error exporting statistics:', error);
            }
          }}
        >
          <DownloadIcon className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {queryError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{queryError instanceof Error ? queryError.message : 'Failed to load statistics'}</span>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Select
                value={selectedTrainer || 'all'}
                onValueChange={(value) => setSelectedTrainer(value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Trainer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trainers</SelectItem>
                  {trainerVarianceData.map((trainer) => {
                    const trainerInfo = statistics?.trainers.find(t => t.name === trainer.name);
                    return trainerInfo && (
                      <SelectItem key={trainerInfo._id} value={trainerInfo._id}>
                        {trainerInfo.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={debouncedFilters.training}
                onValueChange={handleTrainingChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Training" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trainings</SelectItem>
                  {(statistics?.trainings || []).map((training) => (
                    <SelectItem key={training._id} value={training._id}>
                      {training.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={debouncedFilters.day?.toString() || 'all'}
                onValueChange={handleDayChange}
                disabled={debouncedFilters.training === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {debouncedFilters.training !== 'all' && statistics?.metadata?.templates && 
                    (() => {
                      const selectedTraining = statistics.trainings.find(t => t._id === debouncedFilters.training);
                      const template = statistics.metadata.templates.find(t => t.name === selectedTraining?.name);
                      return template && Array.from({ length: template.days }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Day {i + 1}
                        </SelectItem>
                      ));
                    })()
                  }
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={debouncedFilters.dateRange}
                onValueChange={handleDateRangeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-8 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Training Punctuality Score</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <InfoIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>How often activities start at their scheduled time.</p>
                    <p className="mt-2 text-sm text-muted-foreground">Calculation:</p>
                    <p className="text-sm">(Number of on-time activity starts / Total number of activities) × 100</p>
                    <p className="mt-1 text-sm">On-time = Started within ±10% of scheduled time</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.onTimeStartRate || '0%'}</div>
            <Progress 
              value={Math.min(100, Math.max(0, Number(statistics?.onTimeStartRate?.replace('%', '') || '0')))} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Completed Training Sessions</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <InfoIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>Number of fully completed training days in the selected period.</p>
                    <p className="mt-2 text-sm text-muted-foreground">Calculation:</p>
                    <p className="text-sm">Count of schedules where status = 'completed'</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalTrainingDays || '0'} days</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 mb-8">
        {/* Schedule Accuracy Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{chartTitle}</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <InfoIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>Average time variance in minutes for each {debouncedFilters.training === 'all' ? 'training program' : 'day'}.</p>
                    <p className="mt-2 text-sm text-muted-foreground">Calculation:</p>
                    <p className="text-sm">Positive values indicate activities took longer than scheduled.</p>
                    <p className="text-sm">Negative values indicate activities were completed faster than scheduled.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeVarianceData}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <ReferenceLine y={0} stroke="#666" strokeWidth={2} />
                  <XAxis 
                    dataKey="name" 
                    interval={0}
                    angle={timeVarianceData.length > 3 ? -45 : 0}
                    textAnchor={timeVarianceData.length > 3 ? "end" : "middle"}
                    height={timeVarianceData.length > 3 ? 100 : 60}
                    tickMargin={timeVarianceData.length > 3 ? 25 : 5}
                    dx={timeVarianceData.length > 3 ? 10 : 0}
                  />
                  <YAxis 
                    label={{ 
                      value: 'Time Variance (minutes)', 
                      angle: -90, 
                      position: 'insideLeft',
                      offset: 0,
                      style: {
                        textAnchor: 'middle',
                        fill: '#6b7280',
                        fontSize: 12
                      }
                    }}
                    domain={[
                      (dataMin: number) => Math.floor(Math.min(0, dataMin) / 5) * 5,
                      (dataMax: number) => Math.ceil(Math.max(0, dataMax) / 5) * 5
                    ]}
                    tickFormatter={(value) => Math.round(value).toString()}
                  />
                  <RechartsTooltip />
                  <Bar dataKey="timeVariance" onClick={handleBarClick}>
                    {timeVarianceData.map((entry: TimeVarianceData, index: number) => {
                      // Calculate if the variance is within 10% of scheduled duration
                      const scheduledDuration = 60; // Default duration in minutes
                      const variancePercentage = Math.abs(entry.timeVariance / scheduledDuration) * 100;
                      const isOnTime = variancePercentage <= 10;
                      
                      let fillColor;
                      if (entry.timeVariance <= 0) {
                        fillColor = CHART_COLORS.positive;
                      } else if (isOnTime) {
                        fillColor = CHART_COLORS.onTimePositive;
                      } else {
                        fillColor = CHART_COLORS.negative;
                      }
                      
                      return (
                        <Cell 
                          key={`cell-${index}`}
                          fill={fillColor}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timing Performance by Trainer chart in its own container */}
      {debouncedFilters.trainer === 'all' && (
        <div className="mb-8">
          {renderTimeVarianceChart(trainerVarianceData, 'Time Variance by Trainer', true)}
        </div>
      )}
      
      {/* Pie charts in a two-column grid below */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {/* Schedule Adherence Distribution */}
        {renderTimingDistributionCharts(
          timeVarianceData,
          debouncedFilters.training === 'all' 
            ? 'Training'
            : debouncedFilters.day
              ? 'Activity'
              : 'Day'
        )}
        
        {/* Trainer Timing Patterns */}
        {debouncedFilters.trainer === 'all' && renderTimingDistributionCharts(trainerVarianceData, 'Trainer')}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Delayed Activities</CardTitle>
            <CardDescription>Activities that consistently run longer than scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {(statistics?.mostDelayedActivities || []).map((activity, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <span>{activity.name}</span>
                  <Badge variant="secondary">Average delay: {activity.averageDelay}</Badge>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Efficient Activities</CardTitle>
            <CardDescription>Activities that consistently finish ahead of schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {(statistics?.mostEfficientActivities || []).map((activity, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <span>{activity.name}</span>
                  <Badge variant="secondary">Time saved: {activity.averageTimeSaved}</Badge>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 