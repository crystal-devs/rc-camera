"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  indicatorColor?: string
}

const Progress = React.forwardRef<
  HTMLDivElement,
  ProgressProps
>(({ className, value, max = 100, indicatorColor, ...props }, ref) => {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100)
  
  return (
    <div
      ref={ref}
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn("h-full transition-all", indicatorColor || "bg-primary")}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
})
Progress.displayName = "Progress"

export { Progress }
