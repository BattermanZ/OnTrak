import { TZDate } from '@date-fns/tz';
import { format as formatDate } from 'date-fns';
import { Activity } from '../types';

// Timezone identifiers
export const TIMEZONE_MAP = {
  'Amsterdam': 'Europe/Amsterdam',
  'Manila': 'Asia/Manila',
  'Curacao': 'America/Curacao'
} as const;

export type TimezoneLocation = keyof typeof TIMEZONE_MAP;

/**
 * Convert a time from Amsterdam time to the user's local timezone
 * @param time Time string in HH:mm format (24-hour)
 * @param userTimezone User's timezone setting
 * @returns Time string in HH:mm format in user's timezone
 */
export function convertFromAmsterdamTime(time: string, userTimezone: TimezoneLocation): string {
  console.log('Converting from Amsterdam time:', { time, userTimezone });
  // Create a date object for today with the given time in Amsterdam timezone
  const [hours, minutes] = time.split(':').map(Number);
  const today = new Date();
  
  // Create a TZDate in Amsterdam timezone
  const amsterdamDate = new TZDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    hours,
    minutes,
    0,
    0,
    TIMEZONE_MAP.Amsterdam
  );
  console.log('Amsterdam date:', amsterdamDate.toString());

  // Convert to user's timezone
  const localDate = amsterdamDate.withTimeZone(TIMEZONE_MAP[userTimezone]);
  console.log('Local date:', localDate.toString());
  
  // Get hours and minutes from the local date
  const localHours = localDate.getHours().toString().padStart(2, '0');
  const localMinutes = localDate.getMinutes().toString().padStart(2, '0');
  const result = `${localHours}:${localMinutes}`;
  
  console.log('Conversion result:', result);
  return result;
}

/**
 * Convert a time from user's local timezone to Amsterdam time
 * @param time Time string in HH:mm format (24-hour)
 * @param userTimezone User's timezone setting
 * @returns Time string in HH:mm format in Amsterdam timezone
 */
export function convertToAmsterdamTime(time: string, userTimezone: TimezoneLocation): string {
  console.log('Converting to Amsterdam time:', { time, userTimezone });
  // Create a date object for today with the given time in user's timezone
  const [hours, minutes] = time.split(':').map(Number);
  const today = new Date();
  
  // Create a TZDate in user's timezone
  const localDate = new TZDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    hours,
    minutes,
    0,
    0,
    TIMEZONE_MAP[userTimezone]
  );
  console.log('Local date:', localDate.toString());

  // Convert to Amsterdam timezone
  const amsterdamDate = localDate.withTimeZone(TIMEZONE_MAP.Amsterdam);
  console.log('Amsterdam date:', amsterdamDate.toString());
  
  // Get hours and minutes from the Amsterdam date
  const amsterdamHours = amsterdamDate.getHours().toString().padStart(2, '0');
  const amsterdamMinutes = amsterdamDate.getMinutes().toString().padStart(2, '0');
  const result = `${amsterdamHours}:${amsterdamMinutes}`;
  
  console.log('Conversion result:', result);
  return result;
}

/**
 * Format a date-time for display in the user's timezone
 * @param dateTime ISO date-time string or Date object
 * @param userTimezone User's timezone setting
 * @param formatStr Optional format string (defaults to 'HH:mm')
 * @returns Formatted time string in user's timezone
 */
export function formatInUserTimezone(
  dateTime: string | Date,
  userTimezone: TimezoneLocation,
  formatStr: string = 'HH:mm'
): string {
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  const tzDate = new TZDate(date, TIMEZONE_MAP[userTimezone]);
  return formatDate(tzDate, formatStr);
}

/**
 * Calculate the difference in minutes between two time strings
 * @param time1 First time string in HH:mm format
 * @param time2 Second time string in HH:mm format
 * @returns Difference in minutes (time1 - time2)
 */
function calculateTimeDifferenceInMinutes(time1: string, time2: string): number {
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);
  
  const totalMinutes1 = hours1 * 60 + minutes1;
  const totalMinutes2 = hours2 * 60 + minutes2;
  
  return totalMinutes1 - totalMinutes2;
}

/**
 * Adjust a time string by adding or subtracting minutes
 * @param time Time string in HH:mm format
 * @param offsetMinutes Minutes to adjust (positive or negative)
 * @returns Adjusted time string in HH:mm format
 */
function adjustTimeByMinutes(time: string, offsetMinutes: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  
  // Calculate total minutes and handle wrap-around for 24 hours
  let totalMinutes = hours * 60 + minutes + offsetMinutes;
  // Ensure positive value for modulo operation (add 24 hours worth of minutes)
  totalMinutes = (totalMinutes + 24 * 60) % (24 * 60);
  
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

/**
 * Process activities for display with special handling for Curaçao timezone
 * For Curaçao, first activity of each day is adjusted to start at 7:30 AM local time
 * 
 * @param activities Array of activities with startTime in Amsterdam timezone
 * @param userTimezone User's timezone setting
 * @returns Processed activities with displayTime and possibly adjusted startTime
 */
export function processActivitiesForDisplay(activities: any[], userTimezone: TimezoneLocation) {
  if (!activities || activities.length === 0) {
    return [];
  }

  // If not Curaçao, just convert times to user's timezone
  if (userTimezone !== 'Curacao') {
    return activities.map(activity => ({
      ...activity,
      displayTime: convertFromAmsterdamTime(activity.startTime, userTimezone)
    }));
  }
  
  // For Curaçao: Special handling to ensure first activity of each day is at 7:30 AM
  
  // Group activities by day
  const activitiesByDay = activities.reduce((acc, activity) => {
    if (!acc[activity.day]) {
      acc[activity.day] = [];
    }
    acc[activity.day].push({...activity});
    return acc;
  }, {});
  
  // Sort activities by time for each day
  Object.keys(activitiesByDay).forEach(day => {
    activitiesByDay[day].sort((a: any, b: any) => 
      a.startTime.localeCompare(b.startTime)
    );
  });
  
  // Process each day to adjust times
  const result: any[] = [];
  Object.keys(activitiesByDay).forEach(day => {
    const dayActivities = activitiesByDay[day];
    if (dayActivities.length === 0) return;
    
    // Get first activity of the day
    const firstActivity = dayActivities[0];
    
    // Convert to Curaçao time to see current start time
    const currentStartTimeInCuracao = convertFromAmsterdamTime(firstActivity.startTime, 'Curacao');
    
    // Target start time for Curaçao is 7:30 AM
    const targetStartTime = '07:30';
    
    // Calculate offset needed to make first activity start at 7:30 AM
    const offsetMinutes = calculateTimeDifferenceInMinutes(targetStartTime, currentStartTimeInCuracao);
    
    // Apply offset to all activities in this day
    dayActivities.forEach((activity: Activity) => {
      // Get the current time in Curaçao
      const activityTimeInCuracao = convertFromAmsterdamTime(activity.startTime, 'Curacao');
      
      // Apply the same offset
      const adjustedTimeInCuracao = adjustTimeByMinutes(activityTimeInCuracao, offsetMinutes);
      
      // Convert back to Amsterdam time for storage if needed
      const adjustedTimeInAmsterdam = convertToAmsterdamTime(adjustedTimeInCuracao, 'Curacao');
      
      result.push({
        ...activity,
        displayTime: adjustedTimeInCuracao,
        adjustedStartTime: adjustedTimeInAmsterdam // Store this if we need to update the activity
      });
    });
  });
  
  return result;
}

/**
 * Properly prepares times for saving to the database.
 * For Curaçao users, it ensures times are adjusted back to match the 7:30 AM constraint.
 * 
 * @param activity Activity data with time in user's timezone
 * @param userTimezone User's timezone
 * @param isFirstOfDay Whether this is the first activity of the day
 * @returns Activity with Amsterdam time for database storage
 */
export function prepareActivityForSaving(
  activity: any, 
  userTimezone: TimezoneLocation,
  isFirstOfDay: boolean
) {
  let startTime = activity.startTime;
  
  // Special handling for Curaçao users creating the first activity of the day
  if (userTimezone === 'Curacao' && isFirstOfDay) {
    // Force first activity to be at 7:30 AM Curaçao time
    startTime = '07:30';
  }
  
  // Convert to Amsterdam time for storage
  const amsterdamTime = convertToAmsterdamTime(startTime, userTimezone);
  
  return {
    ...activity,
    startTime: amsterdamTime
  };
} 