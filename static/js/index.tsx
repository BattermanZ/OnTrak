import React from 'react';
import { createRoot } from 'react-dom/client';
import TrainingStatistics from './components/TrainingStatistics';

const container = document.getElementById('react-root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <TrainingStatistics />
  </React.StrictMode>
);