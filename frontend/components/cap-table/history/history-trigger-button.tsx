"use client";

import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVersionHistory } from "./use-version-history";
import { cn } from "@/lib/utils";

interface HistoryTriggerButtonProps {
  className?: string;
}

export function HistoryTriggerButton({ className }: HistoryTriggerButtonProps) {
  const { versions, openHistoryPanel } = useVersionHistory();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={openHistoryPanel}
      className={cn("gap-2", className)}
    >
      <History className="h-4 w-4" />
      <span>History</span>
      {versions.length > 0 && (
        <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
          {versions.length}
        </span>
      )}
    </Button>
  );
}
