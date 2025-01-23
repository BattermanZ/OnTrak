# Schedule Accuracy by Program Chart Data Flow

## Overview
This document outlines the complete data flow for the "Schedule Accuracy by Program" chart, which shows the average time variance (in minutes) for each training program.

## Data Flow Path

### 1. Database Layer (MongoDB)
- Collections used:
  - `schedules`: Contains completed training schedules
  - `templates`: Contains training program templates
  - Each schedule document contains:
    ```javascript
    {
      templateId: ObjectId,  // Reference to training program
      status: 'completed',
      activities: [{
        name: String,
        startTime: String,     // Scheduled start time (HH:mm)
        duration: Number,      // Scheduled duration in minutes
        completed: Boolean,
        actualStartTime: ISODate,
        actualEndTime: ISODate
      }]
    }
    ```

### 2. Backend Processing (`/statistics` endpoint)
Located in `server/src/routes/statistics.routes.js`:

1. **Data Fetching**:
   ```javascript
   const baseQuery = { 
     status: 'completed',
     'activities.completed': true
   };
   ```

2. **Time Variance Calculation**:
   ```javascript
   // For each activity in a schedule
   const actualDuration = differenceInMinutes(
     new Date(activity.actualEndTime),
     new Date(activity.actualStartTime)
   );
   const scheduledDuration = activity.duration;
   const variance = actualDuration - scheduledDuration;
   ```

3. **Training Program Aggregation**:
   ```javascript
   // In processSchedules function
   const trainingStats = new Map();
   
   // For each schedule
   const templateId = schedule.templateId?._id || schedule.templateId;
   if (!trainingStats.has(templateId.toString())) {
     trainingStats.set(templateId.toString(), {
       totalVariance: 0,
       activityCount: 0,
       name: schedule.templateId?.name || 'Unknown Training'
     });
   }
   
   // Update training stats
   const trainingData = trainingStats.get(templateId.toString());
   trainingData.totalVariance += variance;
   trainingData.activityCount++;
   ```

4. **Final Response Format**:
   ```javascript
   statistics.trainings = Array.from(trainingStats.entries()).map(([id, stats]) => ({
     _id: id,
     name: stats.name,
     timeVariance: stats.activityCount > 0 ? 
       Math.round(stats.totalVariance / stats.activityCount) : 0
   }));
   ```

### 3. Frontend Processing
Located in `client/src/pages/Statistics.tsx`:

1. **Data Fetching**:
   ```typescript
   const { data: statistics } = useQuery<StatisticsData>({
     queryKey: ['statistics', filters],
     queryFn: async () => {
       const response = await schedules.getStatistics(filters);
       return response.data;
     }
   });
   ```

2. **Data Transformation**:
   ```typescript
   const timeVarianceData = useMemo(() => 
     statistics?.trainings.map((training) => ({
       name: training.name,
       timeVariance: training.timeVariance
     })) || []
   , [statistics]);
   ```

3. **Chart Rendering**:
   ```typescript
   <BarChart data={timeVarianceData}>
     <Bar dataKey="timeVariance">
       {data.map((entry) => (
         <Cell 
           fill={entry.timeVariance > 0 ? CHART_COLORS.negative : CHART_COLORS.positive}
         />
       ))}
     </Bar>
   </BarChart>
   ```

## Validation Points

1. **Schedule Requirements**:
   - Must have `status: 'completed'`
   - Must have valid `templateId` reference
   - Activities must be marked as `completed: true`
   - Activities must have both `actualStartTime` and `actualEndTime`

2. **Time Variance Calculation**:
   - Positive variance = activity took longer than scheduled
   - Negative variance = activity completed faster than scheduled
   - Zero variance = activity completed exactly on schedule

3. **Data Aggregation**:
   - Variances are averaged per training program
   - Each program's average is rounded to nearest minute
   - Programs with no completed activities will show 0 variance

## Debugging Steps

1. **Verify Database Data**:
   ```javascript
   db.schedules.find({ 
     status: 'completed',
     'activities.completed': true,
     'activities.actualStartTime': { $exists: true },
     'activities.actualEndTime': { $exists: true }
   }).count()
   ```

2. **Check Backend Processing**:
   - Enable debug logging in statistics route
   - Monitor trainingStats map population
   - Verify variance calculations

3. **Frontend Validation**:
   - Check network response from `/statistics`
   - Verify `timeVarianceData` transformation
   - Inspect chart component props

## Common Issues

1. **Missing Data**:
   - No completed schedules
   - Activities marked completed but missing actual times
   - Invalid template references

2. **Calculation Issues**:
   - Incorrect time format parsing
   - Timezone mismatches
   - Duration calculation errors

3. **Aggregation Problems**:
   - Training programs not properly grouped
   - Variance averaging errors
   - Missing or null values in calculations 