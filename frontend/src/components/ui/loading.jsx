import * as React from "react"
import { cn } from "../../lib/utils"

const LoadingSpinner = React.forwardRef(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    default: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "animate-spin rounded-full border-yellow-500 border-t-transparent",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
})
LoadingSpinner.displayName = "LoadingSpinner"

const LoadingDots = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("flex items-center justify-center gap-2", className)} {...props}>
      <div className="h-2 w-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="h-2 w-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="h-2 w-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
})
LoadingDots.displayName = "LoadingDots"

const LoadingPulse = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "h-12 w-12 rounded-full bg-gradient-to-r from-yellow-400 to-amber-600 animate-pulse-glow",
        className
      )}
      {...props}
    />
  )
})
LoadingPulse.displayName = "LoadingPulse"

const LoadingOverlay = React.forwardRef(({ className, message = "Loading...", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center glass-dark",
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl glass border border-yellow-500/30 shadow-gold-lg">
        <LoadingSpinner size="lg" />
        {message && <p className="text-lg font-semibold text-gradient-gold">{message}</p>}
      </div>
    </div>
  )
})
LoadingOverlay.displayName = "LoadingOverlay"

export { LoadingSpinner, LoadingDots, LoadingPulse, LoadingOverlay }
