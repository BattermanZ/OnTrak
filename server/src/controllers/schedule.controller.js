const Schedule = require('../models/schedule.model');
const winston = require('../config/winston');
const { startOfDay, endOfDay } = require('date-fns');

// Get current schedule
exports.getCurrentSchedule = async (req, res) => {
  try {
    winston.debug('Fetching current schedule');
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    const schedule = await Schedule.findOne({
      userId: req.user._id,
      startDate: {
        $gte: today,
        $lte: todayEnd
      }
    }).sort({ startDate: 1 });

    if (!schedule) {
      winston.debug('No schedule found for today');
      return res.status(404).json({ message: 'No schedule found for today' });
    }

    // Calculate current, previous, and next activities
    const currentTime = now.getTime();
    let currentActivity = null;
    let previousActivity = null;
    let nextActivity = null;

    for (let i = 0; i < schedule.activities.length; i++) {
      const activity = schedule.activities[i];
      const startTime = new Date(`${today.toISOString().split('T')[0]}T${activity.startTime}`).getTime();
      const endTime = startTime + (activity.duration * 60000);

      if (currentTime >= startTime && currentTime < endTime) {
        currentActivity = activity;
        previousActivity = schedule.activities[i - 1] || null;
        nextActivity = schedule.activities[i + 1] || null;
        break;
      } else if (currentTime < startTime) {
        if (!nextActivity) nextActivity = activity;
      } else {
        previousActivity = activity;
      }
    }

    schedule.currentActivity = currentActivity;
    schedule.previousActivity = previousActivity;
    schedule.nextActivity = nextActivity;

    winston.debug('Current schedule fetched successfully', { scheduleId: schedule._id });
    res.json(schedule);
  } catch (error) {
    winston.error('Error fetching current schedule:', { error });
    res.status(500).json({ message: 'Error fetching current schedule', error: error.message });
  }
}; 