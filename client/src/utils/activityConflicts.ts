import { Activity, ActivityConflict } from '../types';
import { addMinutes, parseISO, differenceInMinutes } from 'date-fns';

const MINIMUM_BREAK_MINUTES = 15;

export const checkActivityConflicts = (activities: Activity[]): ActivityConflict[] => {
  const conflicts: ActivityConflict[] = [];
  const activitiesByDay: { [key: number]: Activity[] } = {};

  // Group activities by day
  activities.forEach(activity => {
    if (!activitiesByDay[activity.day]) {
      activitiesByDay[activity.day] = [];
    }
    activitiesByDay[activity.day].push(activity);
  });

  // Check conflicts for each day
  Object.entries(activitiesByDay).forEach(([day, dayActivities]) => {
    // Sort activities by start time
    const sortedActivities = dayActivities.sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );

    // Check for overlaps and insufficient breaks
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const activity1 = sortedActivities[i];
      const activity2 = sortedActivities[i + 1];

      const activity1End = addMinutes(
        parseISO(`2000-01-01T${activity1.startTime}`),
        activity1.duration
      );
      const activity2Start = parseISO(`2000-01-01T${activity2.startTime}`);

      // Check for overlap
      if (activity1End > activity2Start) {
        conflicts.push({
          activity1,
          activity2,
          type: 'OVERLAP',
          day: Number(day)
        });
      }

      // Check for insufficient break
      const breakDuration = differenceInMinutes(activity2Start, activity1End);
      if (breakDuration < MINIMUM_BREAK_MINUTES) {
        conflicts.push({
          activity1,
          activity2,
          type: 'NO_BREAK',
          day: Number(day)
        });
      }
    }
  });

  return conflicts;
}; 