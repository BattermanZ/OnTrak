const { parseISO, addMinutes, isWithinInterval } = require('date-fns');

const MINIMUM_BREAK_TIME = 15; // minutes

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

/**
 * Calculate break time between two activities in minutes
 * @param {Date} end1 End time of first activity
 * @param {Date} start2 Start time of second activity
 * @returns {number} Break time in minutes
 */
const getBreakTime = (end1, start2) => {
  return Math.floor((start2.getTime() - end1.getTime()) / (1000 * 60));
};

/**
 * Check for conflicts between activities
 * @param {Array} activities List of activities to check
 * @returns {Array} List of conflicts found
 */
const checkActivityConflicts = (activities) => {
  const conflicts = [];

  // Sort activities by start time
  const sortedActivities = [...activities].sort((a, b) => {
    const startA = parseISO(a.startTime);
    const startB = parseISO(b.startTime);
    return startA.getTime() - startB.getTime();
  });

  // Check each activity against subsequent activities
  for (let i = 0; i < sortedActivities.length; i++) {
    const activity1 = sortedActivities[i];
    const start1 = parseISO(activity1.startTime);
    const end1 = addMinutes(start1, activity1.duration);

    // Check for overlaps with subsequent activities
    for (let j = i + 1; j < sortedActivities.length; j++) {
      const activity2 = sortedActivities[j];
      const start2 = parseISO(activity2.startTime);
      const end2 = addMinutes(start2, activity2.duration);

      // Check for overlapping times
      if (doIntervalsOverlap(start1, end1, start2, end2)) {
        conflicts.push({
          type: 'overlap',
          activities: [activity1._id, activity2._id],
          message: `Activities "${activity1.name}" and "${activity2.name}" have overlapping times`,
        });
      }

      // Check for insufficient break time
      const breakTime = getBreakTime(end1, start2);
      if (breakTime < MINIMUM_BREAK_TIME && breakTime > 0) {
        conflicts.push({
          type: 'break',
          activities: [activity1._id, activity2._id],
          message: `Insufficient break time (${breakTime} minutes) between "${activity1.name}" and "${activity2.name}"`,
        });
      }
    }
  }

  return conflicts;
};

module.exports = {
  checkActivityConflicts,
  MINIMUM_BREAK_TIME,
}; 