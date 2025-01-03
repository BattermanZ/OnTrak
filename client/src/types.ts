export interface Activity {
  _id: string;
  name: string;
  startTime: string;
  duration: number;
  description?: string;
  day: number;
  isActive: boolean;
  completed: boolean;
}

export interface Template {
  _id: string;
  name: string;
  days: number;
  createdBy: {
    _id: string;
    email: string;
  };
  category: string;
  tags: string[];
  activities: Activity[];
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  createdBy: string;
}

export interface Schedule {
  _id: string;
  title: string;
  date: Date;
  templateId: string;
  selectedDay: number;
  activities: Activity[];
  currentActivityIndex: number;
  isActive: boolean;
  createdBy: string;
  currentActivity: Activity | null;
  previousActivity: Activity | null;
  nextActivity: Activity | null;
  status: string;
}

export interface User {
  _id: string;
  email: string;
  name?: string;
  role: string;
}

export interface ActivityConflict {
  activity1: Activity;
  activity2: Activity;
  type: 'overlap';
  conflictDetails: string;
  day: number;
}

export interface TemplateHistoryAction {
  type: 'create' | 'update' | 'delete';
  templateId: string;
  timestamp: Date;
  changes?: {
    before: Partial<Template>;
    after: Partial<Template>;
  };
} 