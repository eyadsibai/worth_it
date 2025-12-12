import * as React from "react";
import { cn } from "@/lib/utils";

export interface InformationBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  variant?: "default" | "muted";
}

/**
 * A styled container for displaying preview/status information in forms
 * Consolidates the common `p-4 border rounded-lg bg-muted/50` pattern
 */
export function InformationBox({
  children,
  className,
  title,
  variant = "muted",
  ...props
}: InformationBoxProps) {
  return (
    <div
      className={cn(
        "p-4 border rounded-lg",
        variant === "muted" ? "bg-muted/50" : "bg-background",
        className
      )}
      {...props}
    >
      {title && (
        <h4 className="text-sm font-medium mb-2 text-muted-foreground">{title}</h4>
      )}
      {children}
    </div>
  );
}
