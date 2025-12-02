"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string;
}

function Progress({
  className,
  value,
  indicatorClassName,
  style,
  ...props
}: ProgressProps) {
  const progressBackground = style?.['--progress-background' as keyof typeof style];
  const bgColor = typeof progressBackground === 'string' ? progressBackground : 'var(--primary)';
  
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      style={style}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 transition-all", indicatorClassName)}
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          backgroundColor: bgColor
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
