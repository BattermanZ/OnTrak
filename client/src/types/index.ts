export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'trainer';
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
  name: string;
  days: number;
  userId: string;
  activities: Activity[];
  currentActivity: Activity | null;
  previousActivity: Activity | null;
  nextActivity: Activity | null;
  createdAt: Date;
  updatedAt: Date;
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