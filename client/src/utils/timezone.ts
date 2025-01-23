import { TZDate } from '@date-fns/tz';
import { format as formatDate } from 'date-fns';

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