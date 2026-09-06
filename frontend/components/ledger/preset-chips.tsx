"use client";

import { cn } from "@/lib/utils";

interface PresetOption {
  label: string;
  value: number;
}

interface PresetChipsProps {
  options: PresetOption[];
  selected?: number;
  onSelect: (value: number) => void;
  className?: string;
}

/** A row of quick-pick amounts. The chip matching `selected` carries `aria-pressed`. */
export function PresetChips({ options, selected, onSelect, className }: PresetChipsProps) {
  return (
    <div role="group" className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === selected}
          onClick={() => onSelect(option.value)}
          className="border-rule aria-pressed:border-market aria-pressed:bg-market-soft aria-pressed:text-market rounded-sm border px-2 py-0.5 font-mono text-xs"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
