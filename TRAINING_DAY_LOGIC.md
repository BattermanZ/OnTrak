# Training Day Database Logic

## 1. Starting a Training Day

When a trainer starts a training day, the following happens in the database:

1. A new `Schedule` document is created with:
   - `status: 'active'`
   - `activeActivityIndex: 0`
   - `createdBy: trainer._id`
   - `templateId: selected_template._id`
   - `selectedDay: selected_day`
   - `date: current_date`

2. Activities are copied from the template with initial states:
   - First activity:
     ```js
     {
       status: 'in-progress',
       isActive: true,
       completed: false,
       actualStartTime: current_date,
       actualEndTime: null
     }
     ```
   - All other activities:
     ```js
     {
       status: 'pending',
       isActive: false,
       completed: false,
       actualStartTime: null,
       actualEndTime: null
     }
     ```

## 2. During Training

### When Moving to Next Activity:
1. Current activity is updated:
   ```js
   {
     status: 'completed',
     isActive: false,
     completed: true,
     actualEndTime: current_date
   }
   ```

2. Next activity is updated:
   ```js
   {
     status: 'in-progress',
     isActive: true,
     completed: false,
     actualStartTime: current_date
   }
   ```

3. Schedule is updated:
   ```js
   {
     activeActivityIndex: current_index + 1
   }
   ```

### When Going Back to Previous Activity:
1. Current activity is reset:
   ```js
   {
     status: 'pending',
     isActive: false,
     completed: false,
     actualStartTime: null,
     actualEndTime: null
   }
   ```

2. Previous activity is restored:
   ```js
   {
     status: 'in-progress',
     isActive: true,
     completed: false
   }
   ```

3. Schedule is updated:
   ```js
   {
     activeActivityIndex: current_index - 1
   }
   ```

## 3. Statistics Tracking

For statistics calculations, the system looks for:
1. Activities marked as `completed: true`
2. Activities with both `actualStartTime` and `actualEndTime` set
3. Schedules with `status: 'completed'`

The following metrics are calculated:
- Time variance between scheduled and actual duration
- On-time start rate (within ±10% of scheduled start)
- Activity-specific statistics (delays, efficiencies)
- Trainer-specific performance metrics
- Training-specific completion patterns 