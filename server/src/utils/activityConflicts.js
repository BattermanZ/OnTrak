const { parseISO, addMinutes, isWithinInterval } = require('date-fns');

/**
 * Parse time string to Date object
 * @param {string} timeStr Time string in HH:MM format
 * @param {number} day Day number
 * @returns {Date} Parsed date object
 */
const parseActivityTime = (timeStr, day) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(2000, 0, day); // Use year 2000 as base year
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * Check if two time intervals overlap
 * @param {Date} start1 Start time of first interval
 * @param {Date} end1 End time of first interval
 * @param {Date} start2 Start time of second interval
 * @param {Date} end2 End time of second interval
 * @returns {boolean} True if intervals overlap
 */
const doIntervalsOverlap = (start1, end1, start2, end2) => {
  return (
    (start1 <= start2 && end1 > start2) ||
    (start2 <= start1 && end2 > start1)
  );
};

const checkActivityConflicts = (activities) => {
  const conflicts = [];
  const activitiesByDay = {};

  // Group activities by day
  activities.forEach(activity => {
    if (!activitiesByDay[activity.day]) {
      activitiesByDay[activity.day] = [];
    }
    activitiesByDay[activity.day].push(activity);
  });

  Object.entries(activitiesByDay).forEach(([day, dayActivities]) => {
    // Sort activities by start time
    const sortedActivities = [...dayActivities].sort((a, b) => {
      const startA = parseActivityTime(a.startTime, Number(day));
      const startB = parseActivityTime(b.startTime, Number(day));
      return startA.getTime() - startB.getTime();
    });

    // Check each activity against subsequent activities
    for (let i = 0; i < sortedActivities.length; i++) {
      const activity1 = sortedActivities[i];
      const start1 = parseActivityTime(activity1.startTime, Number(day));
      const end1 = addMinutes(start1, activity1.duration);

      // Check for overlaps with subsequent activities
      for (let j = i + 1; j < sortedActivities.length; j++) {
        const activity2 = sortedActivities[j];
        const start2 = parseActivityTime(activity2.startTime, Number(day));
        const end2 = addMinutes(start2, activity2.duration);

        // Check for overlapping times
        if (doIntervalsOverlap(start1, end1, start2, end2)) {
          conflicts.push({
            type: 'overlap',
            activities: [activity1._id, activity2._id],
            message: `Activities "${activity1.name}" and "${activity2.name}" have overlapping times on day ${day}`,
          });
        }
      }
    }
  });

  return conflicts;
};

module.exports = {
  checkActivityConflicts,
  parseActivityTime, // Export for testing
}; 