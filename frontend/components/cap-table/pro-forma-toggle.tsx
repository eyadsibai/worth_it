"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ProFormaToggleProps {
  isProForma: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

export function ProFormaToggle({
  isProForma,
  onToggle,
  disabled = false,
}: ProFormaToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Switch
          id="pro-forma-toggle"
          checked={isProForma}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
        <Label htmlFor="pro-forma-toggle" className="cursor-pointer">
          {isProForma ? (
            <Badge variant="secondary" className="font-medium">
              Pro-forma
            </Badge>
          ) : (
            <Badge variant="outline" className="font-medium">
              Current
            </Badge>
          )}
        </Label>
      </div>
      <span className="text-xs text-muted-foreground">
        {isProForma
          ? "Showing ownership after SAFE/Note conversion"
          : "View ownership after conversion"}
      </span>
    </div>
  );
}
