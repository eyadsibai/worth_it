"use client";

import * as React from "react";
import { FileText, BarChart2, Save, MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomNavSection = "forms" | "results";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

function NavItem({ icon: Icon, label, onClick, isActive = false }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={isActive ? "true" : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] rounded-lg transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

interface BottomNavProps {
  activeSection?: BottomNavSection;
  onFormsClick: () => void;
  onResultsClick: () => void;
  onSaveClick: () => void;
  onMoreClick: () => void;
}

export function BottomNav({
  activeSection,
  onFormsClick,
  onResultsClick,
  onSaveClick,
  onMoreClick,
}: BottomNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 pb-safe md:hidden"
    >
      <div className="flex justify-around py-2">
        <NavItem
          icon={FileText}
          label="Forms"
          onClick={onFormsClick}
          isActive={activeSection === "forms"}
        />
        <NavItem
          icon={BarChart2}
          label="Results"
          onClick={onResultsClick}
          isActive={activeSection === "results"}
        />
        <NavItem
          icon={Save}
          label="Save"
          onClick={onSaveClick}
        />
        <NavItem
          icon={MoreHorizontal}
          label="More"
          onClick={onMoreClick}
        />
      </div>
    </nav>
  );
}
