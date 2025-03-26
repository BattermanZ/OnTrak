import * as React from "react"
import { cn } from "../../lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  indicatorColor?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indicatorColor, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative h-2.5 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      {...props}
    >
      <div
        className={cn(
          "h-full w-full flex-1 transition-all",
          indicatorColor || "bg-primary"
        )}
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          transition: "transform 0.2s ease-in-out"
        }}
      />
    </div>
  )
)

Progress.displayName = "Progress"

export { Progress } 