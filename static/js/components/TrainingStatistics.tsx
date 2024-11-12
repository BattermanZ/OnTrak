"use client"

import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Activity {
  name: string;
  planned_duration: number;
  actual_duration: number;
}

interface Statistics {
  total_activities: number;
  average_time_deviation: number;
  cumulative_time_impact: number;
  activities: Activity[];
}

interface Template {
  id: number;
  name: string;
  duration: number;
}

interface AveragedActivity {
  name: string;
  planned_duration: number;
  average_actual_duration: number;
}

const CHART_WIDTH = 1000;
const MIN_CHART_HEIGHT = 300;
const MAX_CHART_HEIGHT = 1200;
const PIXELS_PER_BAR = 100; // Increased from 40 to 100
const MAX_LABEL_WIDTH = 200;
const CHAR_WIDTH = 6; // Approximate width of a character in pixels

export default function TrainingStatistics() {
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [stats, setStats] = useState<Statistics | null>(null);
  const [averagedActivities, setAveragedActivities] = useState<AveragedActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartHeight, setChartHeight] = useState<number>(MIN_CHART_HEIGHT);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    console.log('Component mounted or updated');
    setLoading(true);
    fetch('/api/template/1')
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
        setError('Failed to load template details');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (template) {
      console.log('Fetching statistics');
      setLoading(true);
      fetch(`/api/statistics/${template.id}${selectedDay !== 'all' ? `?day=${selectedDay}` : ''}`)
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
          calculateAverageActualDurations(data.activities);
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
  }, [selectedDay, template]);

  const calculateAverageActualDurations = (activities: Activity[]) => {
    const activityMap = new Map<string, { total: number; count: number; planned: number }>();

    activities.forEach(activity => {
      if (!activityMap.has(activity.name)) {
        activityMap.set(activity.name, { total: 0, count: 0, planned: activity.planned_duration });
      }
      const current = activityMap.get(activity.name)!;
      current.total += activity.actual_duration;
      current.count += 1;
    });

    const averaged: AveragedActivity[] = Array.from(activityMap.entries()).map(([name, data]) => ({
      name,
      planned_duration: data.planned,
      average_actual_duration: data.total / data.count
    }));

    setAveragedActivities(averaged);

    // Calculate and set the chart height based on the number of activities
    const calculatedHeight = Math.min(Math.max(averaged.length * PIXELS_PER_BAR, MIN_CHART_HEIGHT), MAX_CHART_HEIGHT);
    setChartHeight(calculatedHeight);
  };

  const wrapText = (text: string, maxWidth: number) => {
    if (text.length * CHAR_WIDTH <= maxWidth) return text;
    const words = text.split(' ');
    let line = '';
    let result = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      if (testLine.length * CHAR_WIDTH > maxWidth) {
        result += line.trim() + '\n';
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }
    result += line.trim();
    return result;
  };

  const CustomYAxisTick = ({ x, y, payload }: any) => {
    const wrappedText = wrapText(payload.value, MAX_LABEL_WIDTH);
    const lines = wrappedText.split('\n');
    return (
      <g transform={`translate(${x},${y})`}>
        {lines.map((line, index) => (
          <text
            key={index}
            x={0}
            y={index * 12}
            dy={-6 * (lines.length - 1) + 12}
            textAnchor="end"
            fill="#666"
            fontSize={12}
          >
            {line}
          </text>
        ))}
      </g>
    );
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
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <h1 className="text-3xl font-bold mb-8 text-blue-600">Training Statistics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">Total Activities</h2>
          <p className="text-gray-600 text-sm">Number of training activities</p>
          <p className="text-4xl font-bold mt-2 text-blue-600">{stats.total_activities}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">Average Time Deviation</h2>
          <p className="text-gray-600 text-sm">Average time difference from plan</p>
          <p className="text-4xl font-bold mt-2 text-blue-600">
            {stats.average_time_deviation.toFixed(2)} min
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">Cumulative Time Impact</h2>
          <p className="text-gray-600 text-sm">Total time difference from plan</p>
          <p className="text-4xl font-bold mt-2 text-blue-600">
            {stats.cumulative_time_impact.toFixed(0)} min
          </p>
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

      {averagedActivities.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">No Data:</strong>
          <span className="block sm:inline"> There are no completed activities for the selected period.</span>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Activity Durations</h2>
          <p className="text-gray-600 text-sm mb-6">
            Planned vs Average Actual Duration for each activity
          </p>
          <div className={`h-[${chartHeight}px] w-full overflow-x-auto`}>
            <BarChart
              width={CHART_WIDTH}
              height={chartHeight}
              layout="vertical"
              data={averagedActivities}
              margin={{
                top: 5,
                right: 30,
                left: 5,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit=" min" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={MAX_LABEL_WIDTH} 
                tick={<CustomYAxisTick />}
                dx={-10}
              />
              <Tooltip 
                formatter={(value) => [`${value.toFixed(2)} min`, '']}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Bar dataKey="planned_duration" name="Planned Duration" fill="#8884d8" />
              <Bar dataKey="average_actual_duration" name="Average Actual Duration" fill="#82ca9d" />
            </BarChart>
          </div>
        </div>
      )}
    </div>
  );
}