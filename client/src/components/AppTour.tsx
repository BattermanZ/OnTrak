import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps } from 'react-joyride';

interface AppTourProps {
  page: 'dashboard' | 'setup' | 'backups';
  run?: boolean;
  onClose?: () => void;
  steps?: Array<{
    target: string;
    content: string;
    title?: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    disableBeacon?: boolean;
  }>;
}

export function AppTour({ page, run: externalRun, onClose, steps: customSteps }: AppTourProps) {
  const [internalRun, setInternalRun] = useState(false);

  // Define default tours for different pages
  const defaultSteps = {
    dashboard: [
      {
        target: '.dashboard-header',
        content: 'Welcome to your training dashboard! This is where you can track and manage your daily training sessions.',
        disableBeacon: true,
      },
      {
        target: '.activity-cards',
        content: 'Here you can see your previous, current, and next activities at a glance.',
      },
      {
        target: '.controls',
        content: 'Use these controls to navigate between activities or close your training day.',
      },
      {
        target: '.start-day-button',
        content: 'Click here to start a new training day when you\'re ready to begin.',
      },
    ],
    setup: [
      {
        target: '.setup-header',
        content: 'Welcome to the training setup! Here you can create and manage your training templates.',
        disableBeacon: true,
      },
      {
        target: '.create-training-button',
        content: 'Click here to create a new training template.',
      },
      {
        target: '.search-section',
        content: 'Use these tools to search for templates by name or filter them by tags.',
      },
      {
        target: '.templates-grid',
        content: 'Your training templates will appear here. Click on any template to view its details.',
      },
    ],
    backups: [
      {
        target: '.backup-header',
        content: 'Welcome to the backups section! Here you can manage and restore your training backups.',
        disableBeacon: true,
      },
      {
        target: '.retention-info',
        content: 'Learn about how long each type of backup is kept in the system.',
      },
      {
        target: '.create-backup-button',
        content: 'Create a manual backup of your database when needed.',
      },
      {
        target: '.backup-actions',
        content: 'Use these actions to restore or delete your backups.',
      },
    ],
  };

  useEffect(() => {
    // Check if this is the user's first visit
    const hasSeenTour = localStorage.getItem(`hasSeenTour-${page}`);
    if (!hasSeenTour) {
      setInternalRun(true);
    }
  }, [page]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      setInternalRun(false);
      localStorage.setItem(`hasSeenTour-${page}`, 'true');
      onClose?.();
    }
  };

  const isRunning = externalRun ?? internalRun;
  const steps = customSteps || defaultSteps[page];

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      continuous
      showSkipButton
      showProgress
      styles={{
        options: {
          primaryColor: '#2563eb', // Blue-600
          zIndex: 1000,
        },
        tooltip: {
          fontSize: '14px',
        },
        buttonNext: {
          backgroundColor: '#2563eb',
        },
        buttonBack: {
          marginRight: 10,
        },
      }}
      callback={handleJoyrideCallback}
      locale={{
        last: 'End tour',
        skip: 'Skip tour',
      }}
    />
  );
} 