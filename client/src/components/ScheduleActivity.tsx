import React from 'react';
import { format, parse } from 'date-fns';
import { Activity } from '../types';
import { Card, CardContent } from "./ui/card";
import { cn } from "../lib/utils";

interface ScheduleActivityProps {
  activity: Activity;
  isActive?: boolean;
  isCompleted?: boolean;
}

export const ScheduleActivity: React.FC<ScheduleActivityProps> = ({
  activity,
  isActive,
  isCompleted,
}) => {
  const borderColorClass = isCompleted || activity.completed
    ? "border-l-4 border-l-green-500"
    : isActive
    ? "border-l-4 border-l-blue-600"
    : "border-l-4 border-l-gray-400";

  const textColorClass = isCompleted || activity.completed
    ? "text-green-800"
    : isActive
    ? "text-blue-900"
    : "text-gray-900";

  return (
    <div className="flex items-center gap-4">
      <Card className={cn(
        "flex-1 transition-all hover:translate-x-1 hover:shadow-md",
        borderColorClass
      )}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className={cn(
                "text-base font-medium",
                textColorClass,
                isActive && "font-semibold"
              )}>
                {activity.name} ({activity.duration} min)
              </h3>
              {activity.description && (
                <p className={cn(
                  "mt-1 text-sm",
                  isCompleted || activity.completed ? "text-green-600" : "text-muted-foreground"
                )}>
                  {activity.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <span className="text-lg text-muted-foreground w-20 text-left">
        {format(parse(activity.startTime, 'HH:mm', new Date()), 'HH:mm')}
      </span>
    </div>
  );
}; 