"use client"

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell } from 'recharts';

interface Activity {
  name: string;
  planned_duration: number;
  actual_duration: number;
  day: number;
}

interface Statistics {
  total_activities: number;
  number_of_sessions: number;
  activities: Activity[];
}

interface Template {
  id: number;
  name: string;
  duration: number;
}

interface ActivityDeviation {
  name: string;
  average_deviation: number;
}

interface DayDeviation {
  name: string;
  day: number;
  average_deviation: number;
}

const CHART_WIDTH = 1000;
const MIN_CHART_HEIGHT = 300;
const MAX_CHART_HEIGHT = 1200;
const PIXELS_PER_BAR = 50;
const MAX_LABEL_WIDTH = 200;

export default function TrainingStatistics() {
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [activityDeviations, setActivityDeviations] = useState<ActivityDeviation[]>([]);
  const [dayDeviations, setDayDeviations] = useState<DayDeviation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activityChartHeight, setActivityChartHeight] = useState<number>(MIN_CHART_HEIGHT);
  const [dayChartHeight, setDayChartHeight] = useState<number>(MIN_CHART_HEIGHT);
  const [activityMaxDeviation, setActivityMaxDeviation] = useState<number>(0);
  const [dayMaxDeviation, setDayMaxDeviation] = useState<number>(0);

  useEffect(() => {
    fetch('/api/templates')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        return response.json();
      })
      .then(data => {
        setTemplates(data);
        if (data.length > 0) {
          setSelectedTemplate(data[0].id);
        }
      })
      .catch(err => {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates: ' + err.message);
      });
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setLoading(true);
      fetch(`/api/template/${selectedTemplate}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch template details');
          }
          return response.json();
        })
        .then(data => {
          setTemplate(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching template:', err);
          setError('Failed to load template details: ' + err.message);
          setLoading(false);
        });
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedTemplate) {
      setLoading(true);
      fetch(`/api/statistics/${selectedTemplate}${selectedDay !== 'all' ? `?day=${selectedDay}` : ''}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          setStats(data);
          if (Array.isArray(data.activities)) {
            calculateActivityDeviations(data.activities);
            calculateDayDeviations(data.activities);
          } else {
            throw new Error('Activities data is not an array');
          }
          setError(null);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching statistics:', err);
          setError('Failed to load statistics: ' + err.message);
          setStats(null);
          setLoading(false);
        });
    }
  }, [selectedDay, selectedTemplate]);

  const calculateActivityDeviations = (activities: Activity[]) => {
    try {
      const deviationMap = new Map<string, number[]>();
      
      activities.forEach(activity => {
        if (typeof activity.actual_duration === 'number' && typeof activity.planned_duration === 'number') {
          const deviation = activity.actual_duration - activity.planned_duration;
          if (!deviationMap.has(activity.name)) {
            deviationMap.set(activity.name, []);
          }
          deviationMap.get(activity.name)!.push(deviation);
        } else {
          console.warn('Invalid activity data:', activity);
        }
      });

      const deviations: ActivityDeviation[] = Array.from(deviationMap.entries()).map(([name, deviations]) => {
        const average = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;
        return {
          name,
          average_deviation: average
        };
      });

      setActivityDeviations(deviations);

      const maxDev = Math.max(...deviations.map(d => Math.abs(d.average_deviation)));
      setActivityMaxDeviation(maxDev);

      const calculatedHeight = Math.min(Math.max(deviations.length * PIXELS_PER_BAR, MIN_CHART_HEIGHT), MAX_CHART_HEIGHT);
      setActivityChartHeight(calculatedHeight);
    } catch (err) {
      console.error('Error calculating activity deviations:', err);
      setError('Error calculating activity deviations: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const calculateDayDeviations = (activities: Activity[]) => {
    if (!template) return;

    try {
      const dayActivities = new Map<number, Activity[]>();
      
      for (let day = 1; day <= template.duration; day++) {
        dayActivities.set(day, []);
      }
      
      activities.forEach(activity => {
        if (typeof activity.day === 'number') {
          const dayGroup = dayActivities.get(activity.day);
          if (dayGroup) {
            dayGroup.push(activity);
          }
        }
      });

      const deviations: DayDeviation[] = Array.from(dayActivities.entries())
        .sort(([dayA], [dayB]) => dayA - dayB)
        .map(([day, dayActivities]) => {
          const totalPlanned = dayActivities.reduce((sum, activity) => 
            sum + (activity.planned_duration || 0), 0);
          const totalActual = dayActivities.reduce((sum, activity) => 
            sum + (activity.actual_duration || 0), 0);
          
          const deviation = totalActual - totalPlanned;
          
          return {
            name: `Day ${day}`,
            day,
            average_deviation: deviation
          };
        });

      setDayDeviations(deviations);

      const maxDev = Math.max(...deviations.map(d => Math.abs(d.average_deviation)));
      setDayMaxDeviation(maxDev || 1);

      const calculatedHeight = Math.min(
        Math.max(template.duration * PIXELS_PER_BAR, MIN_CHART_HEIGHT),
        MAX_CHART_HEIGHT
      );
      setDayChartHeight(calculatedHeight);
    } catch (err) {
      console.error('Error calculating day deviations:', err);
      setError('Error calculating day deviations: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const deviation = data.average_deviation;
      const formattedDeviation = Math.abs(deviation).toFixed(2);
      const deviationType = deviation > 0 ? 'longer' : 'shorter';
      
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow">
          <p className="font-bold">{data.name}</p>
          <p>{`${formattedDeviation} minutes ${deviationType} than planned`}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1200px] mx-auto p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!template || !stats) {
    return <div className="max-w-[1200px] mx-auto p-8 text-gray-600">No data available.</div>;
  }

  return (
    <div className="max-w-[1200px] mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-blue-600">Training Statistics</h1>

      <div className="mb-6">
        <label htmlFor="template-select" className="block text-sm font-medium mb-2 text-gray-700">
          Select Training Template
        </label>
        <select
          id="template-select"
          className="w-full md:w-64 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedTemplate || ''}
          onChange={(e) => setSelectedTemplate(Number(e.target.value))}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">Total Activities</h2>
          <p className="text-gray-600 text-sm">Number of training activities</p>
          <p className="text-4xl font-bold mt-2 text-blue-600">{stats.total_activities}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">Number of Sessions</h2>
          <p className="text-gray-600 text-sm">Total completed training sessions</p>
          <p className="text-4xl font-bold mt-2 text-blue-600">{stats.number_of_sessions}</p>
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="day-select" className="block text-sm font-medium mb-2 text-gray-700">
          Select Day
        </label>
        <select
          id="day-select"
          className="w-full md:w-48 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
        >
          <option value="all">All Days</option>
          {Array.from({ length: template.duration }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day.toString()}>
              Day {day}
            </option>
          ))}
        </select>
      </div>

      {dayDeviations.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">No Data:</strong>
          <span className="block sm:inline"> There are no completed days for the selected period.</span>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Day Average Deviation</h2>
          <p className="text-gray-600 text-sm mb-6">
            Average deviation from planned duration for each day
          </p>
          <div className={`h-[${dayChartHeight}px] w-full overflow-x-auto`}>
            <BarChart
              width={CHART_WIDTH}
              height={dayChartHeight}
              layout="vertical"
              data={dayDeviations}
              margin={{
                top: 5,
                right: 30,
                left: 5,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={[-dayMaxDeviation, dayMaxDeviation]} 
                tickFormatter={(value) => `${Math.round(value)} min`}
              />
              <YAxis 
                dataKey="name" 
                type="category"
                width={MAX_LABEL_WIDTH}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine x={0} stroke="#000" />
              <Bar dataKey="average_deviation" name="Average Deviation">
                {dayDeviations.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.average_deviation > 0 ? "#ef4444" : "#22c55e"}
                  />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>
      )}

      {activityDeviations.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">No Data:</strong>
          <span className="block sm:inline"> There are no completed activities for the selected period.</span>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Activity Duration Deviation</h2>
          <p className="text-gray-600 text-sm mb-6">
            Average deviation from planned duration for each activity
          </p>
          <div className={`h-[${activityChartHeight}px] w-full overflow-x-auto`}>
            <BarChart
              width={CHART_WIDTH}
              height={activityChartHeight}
              layout="vertical"
              data={activityDeviations}
              margin={{
                top: 5,
                right: 30,
                left: 5,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={[-activityMaxDeviation, activityMaxDeviation]}
                tickFormatter={(value) => `${Math.round(value)} min`}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={MAX_LABEL_WIDTH} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine x={0} stroke="#000" />
              <Bar dataKey="average_deviation" name="Average Deviation">
                {activityDeviations.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.average_deviation > 0 ? "#ef4444" : "#22c55e"} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>
      )}
    </div>
  );
}