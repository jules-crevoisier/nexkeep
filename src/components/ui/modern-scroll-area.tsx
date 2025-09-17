"use client"

import * as React from "react"
import { ScrollArea, ScrollBar } from "./scroll-area"
import { cn } from "@/lib/utils"

interface ModernScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollArea> {
  variant?: "default" | "thin" | "hidden"
  orientation?: "vertical" | "horizontal" | "both"
}

const ModernScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollArea>,
  ModernScrollAreaProps
>(({ className, variant = "default", orientation = "vertical", children, ...props }, ref) => {
  return (
    <ScrollArea
      ref={ref}
      className={cn(
        // Styles de base
        "relative overflow-hidden",
        // Variantes
        variant === "thin" && "scrollbar-thin",
        variant === "hidden" && "scrollbar-none",
        className
      )}
      {...props}
    >
      {children}
      {orientation === "vertical" || orientation === "both" ? (
        <ScrollBar orientation="vertical" />
      ) : null}
      {orientation === "horizontal" || orientation === "both" ? (
        <ScrollBar orientation="horizontal" />
      ) : null}
    </ScrollArea>
  )
})
ModernScrollArea.displayName = "ModernScrollArea"

export { ModernScrollArea }
