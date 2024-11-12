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

export default function TrainingStatistics() {
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [stats, setStats] = useState<Statistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const renderCount = useRef(0);

  // Hardcoded data for the graph
  const hardcodedActivities: Activity[] = [
    { name: "Warm-up", planned_duration: 15, actual_duration: 20 },
    { name: "Stretching", planned_duration: 10, actual_duration: 12 },
    { name: "Cardio", planned_duration: 30, actual_duration: 35 },
    { name: "Strength Training", planned_duration: 45, actual_duration: 40 },
    { name: "Cool-down", planned_duration: 10, actual_duration: 8 },
  ];

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
          setStats({
            ...data,
            activities: hardcodedActivities
          });
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

  useEffect(() => {
    console.log('Stats updated:', stats);
  }, [stats]);

  console.log('Render count:', ++renderCount.current);

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

      {stats.activities.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">No Data:</strong>
          <span className="block sm:inline"> There are no completed activities for the selected period.</span>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-2 text-gray-800">Activity Durations</h2>
          <p className="text-gray-600 text-sm mb-6">
            Planned vs Actual Duration for each activity
          </p>
          <div className="h-[600px] w-full border-2 border-red-500">
            <BarChart
              width={1000}
              height={500}
              data={stats.activities}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="planned_duration" name="Planned Duration" fill="#8884d8" />
              <Bar dataKey="actual_duration" name="Actual Duration" fill="#82ca9d" />
            </BarChart>
          </div>
        </div>
      )}
    </div>
  );
}