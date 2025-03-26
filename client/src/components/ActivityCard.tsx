import React from 'react';
import { parse, addMinutes } from 'date-fns';
import { Activity } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";
import { Clock, ArrowRight } from "lucide-react";
// @ts-ignore
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';
import { Badge } from "./ui/badge";
import { useAuth } from '../contexts/AuthContext';
import { convertFromAmsterdamTime } from '../utils/timezone';

interface ActivityCardProps {
  title: string;
  activity: Activity | null;
  isActive?: boolean;
  isCompleted?: boolean;
  onProgressUpdate?: (progress: number, isOvertime: boolean) => void;
}

const markdownComponents = {
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a 
      href={href}
      target="_blank" 
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 underline"
    >
      {children}
    </a>
  )
};

export const ActivityCard: React.FC<ActivityCardProps> = ({
  title,
  activity,
  isActive,
  isCompleted,
  onProgressUpdate,
}) => {
  const { user } = useAuth();
  const leftCardRef = React.useRef<HTMLDivElement>(null);
  const rightCardRef = React.useRef<HTMLDivElement>(null);

  // Effect to sync side cards height
  React.useEffect(() => {
    if (!isActive && (leftCardRef.current || rightCardRef.current)) {
      const updateHeight = () => {
        const leftCard = leftCardRef.current;
        const rightCard = rightCardRef.current;
        
        // Reset heights to auto to get true content height
        if (leftCard) leftCard.style.height = 'auto';
        if (rightCard) rightCard.style.height = 'auto';
        
        // Get the natural heights
        const leftHeight = leftCard?.getBoundingClientRect().height || 0;
        const rightHeight = rightCard?.getBoundingClientRect().height || 0;
        
        // Set the maximum height
        const maxHeight = Math.max(leftHeight, rightHeight, 200);
        
        // Apply the height
        if (leftCard) leftCard.style.height = `${maxHeight}px`;
        if (rightCard) rightCard.style.height = `${maxHeight}px`;
      };

      // Initial update
      updateHeight();
      
      // Update after a short delay to ensure content is rendered
      const timeout = setTimeout(updateHeight, 100);
      
      // Update on window resize
      window.addEventListener('resize', updateHeight);
      
      // Cleanup
      return () => {
        window.removeEventListener('resize', updateHeight);
        clearTimeout(timeout);
      };
    }
  }, [isActive, activity?.description]);

  const [progress, setProgress] = React.useState(0);
  const [isOvertime, setIsOvertime] = React.useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = React.useState(0);
  const [timeRemaining, setTimeRemaining] = React.useState(0);

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isActive && activity) {
      // Update progress every second
      const updateProgress = () => {
        const now = new Date();
        
        // Get scheduled start and end times in user's timezone
        const localStartTime = user?.timezone ? convertFromAmsterdamTime(activity.startTime, user.timezone) : activity.startTime;
        const scheduledStartTime = parse(localStartTime, 'HH:mm', new Date());
        const scheduledEndTime = addMinutes(scheduledStartTime, activity.duration);
        
        // Use actual start time if available
        const actualStartTime = activity.actualStartTime ? new Date(activity.actualStartTime) : null;
        if (!actualStartTime) return;

        // Calculate remaining duration based on actual start time but keeping scheduled end time
        const remainingDuration = (scheduledEndTime.getTime() - actualStartTime.getTime()) / 60000;
        
        // Calculate progress based on how much of the remaining duration has elapsed
        const elapsed = (now.getTime() - actualStartTime.getTime()) / 60000;
        const currentProgress = (elapsed / remainingDuration) * 100;
        
        const newProgress = Math.max(currentProgress, 0);
        setProgress(newProgress);
        
        // Calculate overtime based on scheduled end time
        const newIsOvertime = now > scheduledEndTime;
        setIsOvertime(newIsOvertime);
        
        if (newIsOvertime) {
          const overtime = (now.getTime() - scheduledEndTime.getTime()) / (1000 * 60);
          setOvertimeMinutes(Math.ceil(overtime));
          setTimeRemaining(-Math.ceil(overtime));
        } else {
          setOvertimeMinutes(0);
          setTimeRemaining(Math.max(Math.ceil((scheduledEndTime.getTime() - now.getTime()) / 60000), 0));
        }

        // Notify parent component of progress update
        if (onProgressUpdate) {
          onProgressUpdate(newProgress, newIsOvertime);
        }
      };

      // Initial update
      updateProgress();
      
      // Set up interval for live updates
      intervalId = setInterval(updateProgress, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isActive, activity, onProgressUpdate, user?.timezone]);

  if (!activity) {
    return (
      <Card 
        ref={isActive ? undefined : (title === "Previous" ? leftCardRef : rightCardRef)}
        className="min-h-[200px] transition-all hover:-translate-y-1 hover:shadow-lg bg-gray-50 flex flex-col"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl text-blue-600 text-center">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center">
          <ArrowRight className="w-6 h-6 text-gray-400 mb-1" />
          <p className="text-sm text-muted-foreground">
            No {title.toLowerCase()} activity
          </p>
        </CardContent>
      </Card>
    );
  }

  // Convert times to user's timezone
  const localStartTime = user?.timezone ? convertFromAmsterdamTime(activity.startTime, user.timezone) : activity.startTime;
  const startTime = parse(localStartTime, 'HH:mm', new Date());
  const endTime = addMinutes(startTime, activity.duration);
  const endTimeString = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

  const borderColorClass = isCompleted || activity.completed
    ? "border-l-4 border-l-green-500"
    : isActive
    ? "border-l-4 border-l-blue-600"
    : "border-l-4 border-l-gray-400";

  const circularProgressColor = isOvertime 
    ? "#EF4444" // red
    : progress > 90 
    ? "#F97316" // orange 
    : "#22C55E"; // green

  return (
    <Card 
      ref={isActive ? undefined : (title === "Previous" ? leftCardRef : rightCardRef)}
      className={cn(
        "transition-all hover:-translate-y-1 hover:shadow-lg relative flex flex-col",
        borderColorClass,
        isActive ? "min-h-[280px] border-2 border-blue-600" : "min-h-[200px]"
      )}
    >
      <CardHeader>
        <CardTitle className="text-2xl text-blue-600 text-center">{title}</CardTitle>
        {activity && (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{activity.name}</h3>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{`${localStartTime} - ${endTimeString}`}</span>
              <Badge variant="secondary">{activity.duration}min</Badge>
            </div>
            {activity.description && (
              <div className="mt-3 text-sm text-gray-600 break-words">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]} 
                  components={markdownComponents}
                  className="prose prose-sm max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
                >
                  {activity.description}
                </ReactMarkdown>
              </div>
            )}
          </>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!activity ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <ArrowRight className="h-8 w-8" />
          </div>
        ) : (
          <>
            {/* Progress section */}
            <div className={cn(
              "mt-auto",
              isActive ? "space-y-4" : "flex items-center justify-center"
            )}>
              {isActive ? (
                <>
                  <div className="w-32 h-32 mx-auto">
                    <CircularProgressbar
                      value={isOvertime ? 100 : progress}
                      text={isOvertime ? `+${Math.abs(timeRemaining)}m` : `${Math.abs(timeRemaining)}m`}
                      styles={buildStyles({
                        rotation: 0,
                        strokeLinecap: 'round',
                        textSize: '16px',
                        pathTransitionDuration: 0.5,
                        pathColor: circularProgressColor,
                        textColor: circularProgressColor,
                        trailColor: '#E5E7EB',
                      })}
                    />
                  </div>
                  
                  <div className="flex justify-center">
                    <span 
                      className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        isOvertime 
                          ? "bg-red-100 text-red-800"
                          : progress > 90
                          ? "bg-orange-100 text-orange-800"
                          : "bg-green-100 text-green-800"
                      )}
                    >
                      {isOvertime 
                        ? `${overtimeMinutes}min overtime`
                        : progress > 90
                        ? `${timeRemaining}min remaining (finishing soon)`
                        : `${timeRemaining}min remaining (on track)`
                      }
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  {activity.completed && (
                    <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                      Completed
                    </span>
                  )}
                  {!activity.completed && !isActive && (
                    <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
                      Scheduled
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}; 