import { Activity, ActivityConflict } from '../types/index';
import { addMinutes, parseISO } from 'date-fns';

export const checkActivityConflicts = (activities: Activity[], newActivity?: Activity): ActivityConflict[] => {
  const conflicts: ActivityConflict[] = [];
  const activitiesByDay: { [key: number]: Activity[] } = {};

  // Group activities by day
  activities.forEach(activity => {
    if (!activitiesByDay[activity.day]) {
      activitiesByDay[activity.day] = [];
    }
    activitiesByDay[activity.day].push(activity);
  });

  // If we're checking a new activity, only check that day
  if (newActivity) {
    const dayActivities = activitiesByDay[newActivity.day] || [];
    dayActivities.forEach(existingActivity => {
      const existingStart = parseISO(`2000-01-01T${existingActivity.startTime}`);
      const existingEnd = addMinutes(existingStart, existingActivity.duration);
      const newStart = parseISO(`2000-01-01T${newActivity.startTime}`);
      const newEnd = addMinutes(newStart, newActivity.duration);

      if (
        (newStart < existingEnd && newEnd > existingStart) ||
        (existingStart < newEnd && existingEnd > newStart)
      ) {
        conflicts.push({
          activity1: newActivity,
          activity2: existingActivity,
          type: 'OVERLAP',
          day: newActivity.day
        });
      }
    });
    return conflicts;
  }

  // Check conflicts for each day
  Object.entries(activitiesByDay).forEach(([day, dayActivities]) => {
    // Sort activities by start time for consistent comparison
    const sortedActivities = [...dayActivities].sort((a, b) => {
      if (!a?.startTime || !b?.startTime) return 0;
      return a.startTime.localeCompare(b.startTime);
    });

    // Check for overlaps
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
    }
  });

  return conflicts;
}; 