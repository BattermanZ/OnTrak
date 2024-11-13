import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import TrainingStatistics from './components/TrainingStatistics';
import Dashboard from './components/Dashboard';

const container = document.getElementById('react-root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/statistics" element={<TrainingStatistics />} />
      </Routes>
    </Router>
  </React.StrictMode>
);