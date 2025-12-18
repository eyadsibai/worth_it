"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpCircle, CheckCircle2, Circle, RotateCcw } from "lucide-react";
import { useWalkthrough } from "@/lib/walkthrough";
import { tourList } from "@/lib/walkthrough/tours";
import { cn } from "@/lib/utils";

interface TourLauncherProps {
  className?: string;
}

export function TourLauncher({ className }: TourLauncherProps) {
  const { startTour, isTourCompleted, availableTours, resetProgress, progress } =
    useWalkthrough();

  const completedCount = Object.values(progress.completed).filter(Boolean).length;
  const totalTours = tourList.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label="Help and tutorials"
        >
          <HelpCircle className="h-5 w-5" />
          {availableTours.length > 0 && !progress.dismissedAll && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-terminal animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Guided Tours</span>
          <span className="text-xs text-muted-foreground font-normal">
            {completedCount}/{totalTours} completed
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tourList.map((tour) => {
          const completed = isTourCompleted(tour.id);
          const hasUnmetPrereqs =
            tour.prerequisites?.some(
              (prereqId) => !progress.completed[prereqId]
            ) ?? false;

          return (
            <DropdownMenuItem
              key={tour.id}
              onClick={() => startTour(tour.id)}
              disabled={hasUnmetPrereqs}
              className="flex items-start gap-2 py-2"
            >
              {completed ? (
                <CheckCircle2 className="h-4 w-4 text-terminal mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{tour.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {tour.description}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        {completedCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={resetProgress}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset all progress</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
