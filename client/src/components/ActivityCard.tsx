import React from 'react';
import { format, parse, addMinutes } from 'date-fns';
import { Activity } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "../lib/utils";
import { Clock, CheckCircle2, ArrowRight } from "lucide-react";
// @ts-ignore
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';

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
  const [sideCardsHeight, setSideCardsHeight] = React.useState<number>(200);
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
        setSideCardsHeight(maxHeight);
        
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
        
        // Get scheduled start and end times
        const scheduledStartTime = parse(activity.startTime, 'HH:mm', new Date());
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
  }, [isActive, activity, onProgressUpdate]);

  if (!activity) {
    return (
      <Card 
        ref={isActive ? undefined : (title === "Previous" ? leftCardRef : rightCardRef)}
        className="min-h-[200px] transition-all hover:-translate-y-1 hover:shadow-lg bg-gray-50 flex flex-col"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-blue-900">{title}</CardTitle>
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

  const startTime = parse(activity.startTime, 'HH:mm', new Date());
  const endTime = addMinutes(startTime, activity.duration);

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
      <CardHeader className="pb-2">
        <CardTitle className={isActive ? "text-blue-600" : "text-blue-900"}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <div>
          <h3 className={cn(
            "font-medium mb-1",
            isActive ? "text-lg" : "text-base"
          )}>{activity.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
              {activity.duration}min
            </span>
          </div>
        </div>
        
        {activity.description && (
          <div className="text-sm text-gray-600 border-l-2 border-gray-200 pl-3 overflow-auto break-words">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              components={markdownComponents}
              className="prose prose-sm max-w-none prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
            >
              {activity.description}
            </ReactMarkdown>
          </div>
        )}
        
        <div className={cn(
          "mt-auto",
          isActive ? "space-y-4" : "flex items-center justify-center"
        )}>
          {isActive ? (
            <>
              <div className="w-32 h-32 mx-auto">
                <CircularProgressbar
                  value={Math.min(progress, 100)}
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
            isCompleted || activity.completed ? (
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Scheduled</span>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 