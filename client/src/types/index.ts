export type UserRole = 'admin' | 'trainer' | 'trainee';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLogin?: Date;
  password?: string;
}

export interface Session {
  _id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Schedule {
  _id: string;
  title: string;
  description: string;
  trainer: User;
  startDate: Date;
  endDate: Date;
  sessions: Session[];
  status: 'active' | 'completed' | 'cancelled';
  progress: number;
  createdBy: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
} 