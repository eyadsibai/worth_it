"use client";

import * as React from "react";
import { Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoLabel?: string | null;
  redoLabel?: string | null;
  className?: string;
  size?: "sm" | "default" | "icon";
}

export function UndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoLabel,
  redoLabel,
  className,
  size = "sm",
}: UndoRedoControlsProps) {
  // Use modern userAgentData API with fallback to deprecated navigator.platform
  const isMac =
    typeof navigator !== "undefined" &&
    (() => {
      const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
      const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
      return /mac/i.test(platform) || navigator.userAgent?.includes("Mac");
    })();
  const modifierKey = isMac ? "⌘" : "Ctrl+";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            onClick={onUndo}
            disabled={!canUndo}
            className="gap-1.5"
            aria-label={undoLabel ? `Undo: ${undoLabel}` : "Undo"}
          >
            <Undo2 className="h-4 w-4" />
            {size !== "icon" && <span className="hidden sm:inline">Undo</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm">{undoLabel ? `Undo: ${undoLabel}` : "Undo"}</p>
          <p className="text-muted-foreground text-xs">{modifierKey}Z</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            onClick={onRedo}
            disabled={!canRedo}
            className="gap-1.5"
            aria-label={redoLabel ? `Redo: ${redoLabel}` : "Redo"}
          >
            <Redo2 className="h-4 w-4" />
            {size !== "icon" && <span className="hidden sm:inline">Redo</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm">{redoLabel ? `Redo: ${redoLabel}` : "Redo"}</p>
          <p className="text-muted-foreground text-xs">{modifierKey}Shift+Z</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
