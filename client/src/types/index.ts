export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'trainer';
  timezone?: 'Amsterdam' | 'Manila' | 'Curacao';
  lastLogin?: string;
}

export interface Activity {
  _id: string;
  name: string;
  startTime: string;
  duration: number;
  description?: string;
  day: number;
  status?: 'pending' | 'in-progress' | 'completed';
  isActive?: boolean;
  completed?: boolean;
  actualStartTime: string | null;
  actualEndTime: string | null;
  displayTime?: string;
}

export interface Template {
  _id: string;
  name: string;
  days: number;
  activities: Activity[];
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  _id: string;
  title: string;
  templateId: string;
  selectedDay: number;
  activities: Activity[];
  currentActivity: Activity | null;
  previousActivity: Activity | null;
  nextActivity: Activity | null;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// For undo/redo functionality
export interface TemplateHistoryAction {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADD_ACTIVITY' | 'UPDATE_ACTIVITY' | 'DELETE_ACTIVITY';
  templateId: string;
  data: any;
  timestamp: number;
}

export interface ActivityConflict {
  activity1: Activity;
  activity2: Activity;
  type: 'OVERLAP' | 'NO_BREAK';
  day: number;
}

export interface AdherenceItem {
  activity: string;
  onTime: string;
  delayed: string;
  averageVariance: string;
}

export interface ActivityStats {
  name: string;
  timeVariance: number;
  averageDelay?: string;
  averageTimeSaved?: string;
}

export interface DailyStats {
  day: number;
  timeVariance: number;
  name: string;
  activities: ActivityStats[];
  trainers: {
    name: string;
    timeVariance: number;
  }[];
}

export interface DayStats {
  activities: ActivityStats[];
}

export interface DelayedActivity {
  name: string;
  averageDelay: string;
}

export interface EfficientActivity {
  name: string;
  averageTimeSaved: string;
}

export interface StatisticsData {
  totalTrainingDays: number;
  adherence: AdherenceItem[];
  onTimeStartRate: string;
  averageDelay: string;
  daySpecificStats?: { [key: string]: DayStats };
  mostDelayedActivities: ActivityStats[];
  mostEfficientActivities: ActivityStats[];
  trainers: Trainer[];
  trainings: Training[];
  metadata: {
    templates: Template[];
    trainers: Trainer[];
  };
  dailyStats: DailyStats[];
}

export interface StatisticsFilters {
  trainer: string;
  training: string;
  dateRange: string;
  day?: number;
  customStart?: string;
  customEnd?: string;
}

export interface TimeVarianceData {
  name: string;
  timeVariance: number;
}

export interface Trainer {
  _id: string;
  name: string;
  email: string;
}

export interface Training {
  _id: string;
  name: string;
  days: number;
  timeVariance?: number;
} 