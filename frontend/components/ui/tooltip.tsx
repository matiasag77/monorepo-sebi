"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
}

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

interface TooltipProps {
  children: React.ReactNode
}

function Tooltip({ children }: TooltipProps) {
  return <div className="relative inline-flex group">{children}</div>
}

function TooltipTrigger({
  children,
  asChild,
  ...props
}: {
  children: React.ReactNode
  asChild?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="inline-flex" {...props}>
      {children}
    </div>
  )
}

function TooltipContent({
  children,
  className,
  side = "top",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { side?: "top" | "bottom" | "left" | "right" }) {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }

  return (
    <div
      className={cn(
        "absolute z-50 hidden group-hover:block overflow-hidden rounded-md bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 shadow-md whitespace-nowrap",
        positionClasses[side],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
