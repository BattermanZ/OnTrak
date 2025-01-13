import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { schedules, templates } from '../services/api';
import type { Schedule, Activity, Template } from '../types/index';
import { useQuery, useQueryClient } from 'react-query';
import { ActivityCard } from '../components/ActivityCard';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { PlayCircle, SkipForward, SkipBack, StopCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';

export default function Dashboard() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isStartDayDialogOpen, setIsStartDayDialogOpen] = useState(false);
  const [isCloseDayDialogOpen, setIsCloseDayDialogOpen] = useState(false);
  const [isCancelDayDialogOpen, setIsCancelDayDialogOpen] = useState(false);

  const { data: currentSchedule } = useQuery(['currentSchedule'], () => 
    schedules.getCurrent().then(res => res.data)
  );

  const { data: availableTemplates } = useQuery<Template[]>(['templates'], async () => {
    const response = await templates.getAll();
    return response.data;
  });

  useEffect(() => {
    if (socket) {
      socket.on('scheduleUpdate', () => {
        queryClient.invalidateQueries(['currentSchedule']);
      });
    }
  }, [socket, queryClient]);

  const handleStartDay = async () => {
    if (!selectedTemplate) return;
    try {
      await schedules.startDay(selectedTemplate._id, selectedDay);
      setIsStartDayDialogOpen(false);
      setSelectedTemplate(null);
      setSelectedDay(1);
      queryClient.invalidateQueries(['currentSchedule']);
    } catch (err) {
      console.error('Error starting day:', err);
      setError(err instanceof Error ? err.message : 'Failed to start day');
    }
  };

  const handleSkipActivity = async () => {
    if (!currentSchedule) return;
    const currentActivity = getCurrentActivity(currentSchedule);
    if (!currentActivity) return;
    try {
      await schedules.nextActivity(currentSchedule._id, currentActivity._id);
      queryClient.invalidateQueries(['currentSchedule']);
    } catch (err) {
      console.error('Error skipping activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to skip activity');
    }
  };

  const handlePreviousActivity = async () => {
    if (!currentSchedule) return;
    const currentActivity = getCurrentActivity(currentSchedule);
    if (!currentActivity) return;
    try {
      await schedules.goToPreviousActivity(currentSchedule._id, currentActivity._id);
      queryClient.invalidateQueries(['currentSchedule']);
    } catch (err) {
      console.error('Error going to previous activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to go to previous activity');
    }
  };

  const getCurrentActivity = (schedule: Schedule): Activity | null => {
    return schedule.activities.find(a => a.isActive) || null;
  };

  const getNextActivity = (schedule: Schedule): Activity | null => {
    const currentIndex = schedule.activities.findIndex(a => a.isActive);
    if (currentIndex === -1 || currentIndex === schedule.activities.length - 1) return null;
    return schedule.activities[currentIndex + 1];
  };

  const getPreviousActivity = (schedule: Schedule): Activity | null => {
    const currentIndex = schedule.activities.findIndex(a => a.isActive);
    if (currentIndex <= 0) return null;
    return schedule.activities[currentIndex - 1];
  };

  const handleCloseDay = async () => {
    try {
      await schedules.closeDay();
      setIsCloseDayDialogOpen(false);
      queryClient.invalidateQueries(['currentSchedule']);
    } catch (err) {
      console.error('Error closing day:', err);
      setError(err instanceof Error ? err.message : 'Failed to close day');
    }
  };

  const handleCancelDay = async () => {
    try {
      await schedules.cancelDay();
      setIsCancelDayDialogOpen(false);
      setIsStartDayDialogOpen(true);
      queryClient.invalidateQueries(['currentSchedule']);
    } catch (error) {
      setError('Failed to cancel day. Please try again.');
    }
  };

  const markdownComponents = {
    p: ({ children }: { children: React.ReactNode }) => (
      <p className="mb-2 last:mb-0">{children}</p>
    ),
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
      <a 
        href={href}
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline"
      >
        {children}
      </a>
    )
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg shadow-sm">
        <div>
          {currentSchedule ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentSchedule.title.includes(' - Day') 
                  ? currentSchedule.title.split(' - Day')[0] 
                  : currentSchedule.title}
              </h1>
              <p className="text-gray-600 mt-2">Day {currentSchedule.selectedDay}</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900">Training</h1>
              <p className="text-gray-600 mt-2">Select a training to begin</p>
            </>
          )}
        </div>
        {!currentSchedule ? (
          <Button
            onClick={() => setIsStartDayDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Start Day
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCancelDayDialogOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Cancel Day
            </Button>
            <Button
              onClick={() => setIsCloseDayDialogOpen(true)}
              variant="destructive"
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Close Day
            </Button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {currentSchedule ? (
        <div className="space-y-8">
          {/* Activity Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <ActivityCard
              title="Previous"
              activity={getPreviousActivity(currentSchedule)}
              isCompleted
            />
            <ActivityCard
              title="Current"
              activity={getCurrentActivity(currentSchedule)}
              isActive
              onProgressUpdate={(progress, isOvertime) => {
                // Handle progress updates if needed
              }}
            />
            <ActivityCard
              title="Next"
              activity={getNextActivity(currentSchedule)}
            />
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={handlePreviousActivity}
              disabled={!getPreviousActivity(currentSchedule)}
            >
              <SkipBack className="mr-2 h-4 w-4" />
              Previous
            </Button>
            {getNextActivity(currentSchedule) ? (
              <Button
                onClick={handleSkipActivity}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Next
              </Button>
            ) : (
              getCurrentActivity(currentSchedule) && (
                <Button
                  variant="destructive"
                  onClick={() => setIsCloseDayDialogOpen(true)}
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Close Day
                </Button>
              )
            )}
          </div>

          {/* Schedule List */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Schedule</h2>
              <div className="divide-y divide-gray-100">
                {currentSchedule.activities.map((activity: Activity, index: number) => (
                  <div 
                    key={activity._id}
                    className={`py-2 flex items-start ${
                      activity.isActive ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="w-20 shrink-0 font-medium text-gray-900 pt-1">
                      {activity.startTime}
                    </div>
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-500 w-6 shrink-0 pt-1">
                          {index + 1}.
                        </span>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900">{activity.name}</p>
                            <span className="text-sm text-gray-500 shrink-0">
                              ({activity.duration} min)
                            </span>
                          </div>
                          {activity.description && (
                            <div className="text-sm text-gray-600 break-words max-w-full">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                components={markdownComponents}
                                className="prose prose-sm max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
                              >
                                {activity.description}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 pt-1 shrink-0">
                        {activity.completed && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded whitespace-nowrap">
                            Completed
                          </span>
                        )}
                        {activity.isActive && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded whitespace-nowrap">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600">No active training session. Start your day to begin tracking.</p>
        </div>
      )}

      {/* Start Day Dialog */}
      <Dialog open={isStartDayDialogOpen} onOpenChange={setIsStartDayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Training Day</DialogTitle>
            <DialogDescription>
              Select a training template and day to begin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Training Template</label>
              <Select
                value={selectedTemplate?._id}
                onValueChange={(value) => {
                  const template = availableTemplates?.find(t => t._id === value);
                  setSelectedTemplate(template || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates?.map((template) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTemplate && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Day</label>
                <Select
                  value={selectedDay.toString()}
                  onValueChange={(value) => setSelectedDay(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: selectedTemplate.days }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Day {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartDayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartDay} disabled={!selectedTemplate}>
              Start Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Day Dialog */}
      <Dialog open={isCloseDayDialogOpen} onOpenChange={setIsCloseDayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Training Day</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this training day? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseDayDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCloseDay}>
              Close Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Day Dialog */}
      <Dialog open={isCancelDayDialogOpen} onOpenChange={setIsCancelDayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Training Day</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this training day? You will be able to select a new day immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDayDialogOpen(false)}>
              No, Keep Current Day
            </Button>
            <Button 
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleCancelDay}
            >
              Yes, Cancel Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 