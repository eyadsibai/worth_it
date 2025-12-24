"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { HelpCircle } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  parseShorthand,
  formatNumberWithSeparators,
  formatLargeNumber,
  linearToLog,
  logToLinear,
} from "@/lib/format-utils";
import { Button } from "@/components/ui/button";
import { ValidationIndicator } from "./validation-indicator";
import { FormWarning } from "@/components/ui/form-warning";
import { getFieldWarning, type WarningContext } from "@/lib/hooks/use-field-warnings";

interface FormFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  name: string;
  label: string;
  description?: string;
  tooltip?: string;
  /** Context for field warnings (e.g., related field values) */
  warningContext?: WarningContext;
}

/**
 * FormLabel with optional tooltip icon
 * Shows a help icon next to the label that displays the tooltip on hover
 */
function LabelWithTooltip({ label, tooltip }: { label: string; tooltip?: string }) {
  if (!tooltip) {
    return <FormLabel className="whitespace-nowrap">{label}</FormLabel>;
  }

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <FormLabel>{label}</FormLabel>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center transition-colors"
            aria-label={`Help for ${label}`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs" sideOffset={4}>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

interface NumberInputFieldProps extends FormFieldProps {
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  formatDisplay?: boolean;
  /** Hint text displayed below the input (e.g., "Tech average: $8K-15K") */
  hint?: string;
  /** Example value shown as placeholder when no placeholder is set */
  exampleValue?: number;
}

export function NumberInputField({
  form,
  name,
  label,
  description,
  tooltip,
  min,
  max,
  step = 1,
  placeholder,
  prefix,
  suffix,
  formatDisplay = false,
  warningContext,
  hint,
  exampleValue,
}: NumberInputFieldProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  // Track raw input value for shorthand parsing (e.g., "50K")
  const [rawInput, setRawInput] = React.useState("");

  // Compute placeholder: explicit placeholder takes precedence, then exampleValue
  const computedPlaceholder =
    placeholder ??
    (exampleValue !== undefined ? `e.g. ${formatNumberWithSeparators(exampleValue)}` : undefined);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        // Determine display value based on focus state
        let displayValue: string | number;
        if (isFocused) {
          // While focused, show raw input or current number value
          displayValue = rawInput || (field.value ?? "");
        } else if (formatDisplay && typeof field.value === "number") {
          // When blurred with formatDisplay, show thousand separators
          displayValue = formatNumberWithSeparators(field.value);
        } else {
          displayValue = field.value ?? "";
        }

        // Get warning for this field
        const warning = getFieldWarning(name, field.value, warningContext);
        const hasWarning = !!warning && !fieldState.error;

        // Calculate right padding for validation indicator
        const hasIndicator = fieldState.isTouched && fieldState.isDirty;
        const rightPadding = suffix ? "pr-16" : hasIndicator ? "pr-10" : "";

        return (
          <FormItem>
            <LabelWithTooltip label={label} tooltip={tooltip} />
            <FormControl>
              <div className="relative">
                {prefix && (
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                    {prefix}
                  </span>
                )}
                <Input
                  // Use text type when formatDisplay enabled to allow shorthand input (e.g., "50K")
                  type={formatDisplay ? "text" : "number"}
                  placeholder={computedPlaceholder}
                  min={!formatDisplay ? min : undefined}
                  max={!formatDisplay ? max : undefined}
                  step={!formatDisplay ? step : undefined}
                  className={`${prefix ? "pl-7" : ""} ${rightPadding}`}
                  value={displayValue}
                  onFocus={() => {
                    setIsFocused(true);
                    // When focusing, set raw input to current formatted value for editing
                    if (formatDisplay && typeof field.value === "number") {
                      setRawInput(formatNumberWithSeparators(field.value));
                    }
                  }}
                  onBlur={() => {
                    setIsFocused(false);
                    // On blur, parse shorthand notation and update form value
                    if (formatDisplay && rawInput) {
                      const parsed = parseShorthand(rawInput);
                      if (!isNaN(parsed)) {
                        field.onChange(parsed);
                      }
                    }
                    setRawInput("");
                    field.onBlur();
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (formatDisplay) {
                      // Store raw input for shorthand parsing on blur
                      setRawInput(value);
                      // Try to parse immediately for form state
                      const parsed = parseShorthand(value);
                      if (!isNaN(parsed)) {
                        field.onChange(parsed);
                      }
                    } else {
                      // Standard number input behavior
                      field.onChange(value === "" ? undefined : Number(value));
                    }
                  }}
                />
                {suffix && (
                  <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
                    {suffix}
                  </span>
                )}
                {/* Validation indicator - positioned after suffix if present */}
                <span
                  className={`absolute top-1/2 -translate-y-1/2 ${suffix ? "right-10" : "right-3"}`}
                >
                  <ValidationIndicator
                    isValid={!fieldState.error && !hasWarning}
                    hasError={!!fieldState.error}
                    hasWarning={hasWarning}
                    isTouched={fieldState.isTouched}
                    isDirty={fieldState.isDirty}
                  />
                </span>
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
            {hasWarning && <FormWarning>{warning}</FormWarning>}
            {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
          </FormItem>
        );
      }}
    />
  );
}

interface SliderFieldProps extends FormFieldProps {
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
}

export function SliderField({
  form,
  name,
  label,
  description,
  tooltip,
  min,
  max,
  step = 1,
  formatValue,
  warningContext,
}: SliderFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Track if edit was cancelled to prevent blur handler from applying changes
  const editCancelledRef = React.useRef(false);

  // Focus input when entering edit mode (React-idiomatic approach)
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const warning = getFieldWarning(name, field.value, warningContext);
        const hasWarning = !!warning && !fieldState.error;

        const handleDecrement = () => {
          const newValue = Math.max(min, field.value - step);
          field.onChange(newValue);
        };

        const handleIncrement = () => {
          const newValue = Math.min(max, field.value + step);
          field.onChange(newValue);
        };

        const handleEditClick = () => {
          editCancelledRef.current = false;
          setEditValue(String(field.value));
          setIsEditing(true);
        };

        // Helper to parse and clamp value (eliminates duplication)
        const commitValue = () => {
          // Handle empty or whitespace-only input - keep previous value
          if (editValue.trim() === "") {
            setIsEditing(false);
            return;
          }
          const parsed = Number(editValue);
          // Handle invalid (non-numeric) input - keep previous value
          if (isNaN(parsed)) {
            setIsEditing(false);
            return;
          }
          const clamped = Math.max(min, Math.min(max, parsed));
          field.onChange(clamped);
          setIsEditing(false);
        };

        const handleInputBlur = () => {
          // Don't apply changes if edit was cancelled (Escape key)
          if (editCancelledRef.current) {
            editCancelledRef.current = false;
            return;
          }
          commitValue();
        };

        const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitValue();
          } else if (e.key === "Escape") {
            e.preventDefault();
            // Mark as cancelled so blur handler doesn't apply changes
            editCancelledRef.current = true;
            setIsEditing(false);
          }
        };

        return (
          <FormItem className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <LabelWithTooltip label={label} tooltip={tooltip} />
                <ValidationIndicator
                  isValid={!fieldState.error && !hasWarning}
                  hasError={!!fieldState.error}
                  hasWarning={hasWarning}
                  isTouched={fieldState.isTouched}
                  isDirty={fieldState.isDirty}
                />
              </div>
              {/* Touch-friendly value controls */}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={field.value <= min}
                  aria-label={`Decrease ${label}`}
                  className="border-input bg-background hover:bg-accent hover:text-accent-foreground touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
                >
                  −
                </button>
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    min={min}
                    max={max}
                    step={step}
                    className="border-input bg-background focus:ring-ring h-8 w-16 shrink-0 rounded-md border px-2 text-center text-sm font-medium focus:ring-2 focus:outline-none"
                    aria-label={`${label} value`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    aria-label={`Edit ${label} value`}
                    className="border-input bg-background hover:bg-accent hover:text-accent-foreground touch-target h-8 min-w-[4.5rem] shrink-0 rounded-md border px-2 text-center text-sm font-medium whitespace-nowrap"
                  >
                    {formatValue ? formatValue(field.value) : field.value}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={field.value >= max}
                  aria-label={`Increase ${label}`}
                  className="border-input bg-background hover:bg-accent hover:text-accent-foreground touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
            <FormControl>
              <Slider
                min={min}
                max={max}
                step={step}
                value={[field.value]}
                onValueChange={([value]) => field.onChange(value)}
                getValueLabel={(value) => (formatValue ? formatValue(value) : String(value))}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
            {hasWarning && <FormWarning>{warning}</FormWarning>}
          </FormItem>
        );
      }}
    />
  );
}

interface CurrencySliderFieldProps extends FormFieldProps {
  min: number;
  max: number;
  step?: number;
  /** Format for display: "compact" shows $10K, "full" shows $10,000 */
  displayFormat?: "compact" | "full";
}

/**
 * Currency slider with +/- buttons and shorthand input support.
 * Designed for salary, prices, and smaller currency values with bounded ranges.
 * Supports shorthand input (e.g., "50K", "1.5M") when editing directly.
 */
export function CurrencySliderField({
  form,
  name,
  label,
  description,
  tooltip,
  min,
  max,
  step = 100,
  displayFormat = "compact",
  warningContext,
}: CurrencySliderFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const editCancelledRef = React.useRef(false);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const formatCurrencyValue = (value: number): string => {
    if (displayFormat === "compact") {
      return formatLargeNumber(value);
    }
    return `$${formatNumberWithSeparators(value)}`;
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const warning = getFieldWarning(name, field.value, warningContext);
        const hasWarning = !!warning && !fieldState.error;

        const handleDecrement = () => {
          const newValue = Math.max(min, field.value - step);
          field.onChange(newValue);
        };

        const handleIncrement = () => {
          const newValue = Math.min(max, field.value + step);
          field.onChange(newValue);
        };

        const handleEditClick = () => {
          editCancelledRef.current = false;
          // Show current value in shorthand format for easier editing
          setEditValue(formatLargeNumber(field.value).replace("$", ""));
          setIsEditing(true);
        };

        const commitValue = () => {
          if (editValue.trim() === "") {
            setIsEditing(false);
            return;
          }
          // Parse shorthand notation (e.g., "50K", "1.5M")
          const parsed = parseShorthand(editValue);
          if (isNaN(parsed)) {
            setIsEditing(false);
            return;
          }
          const clamped = Math.max(min, Math.min(max, parsed));
          field.onChange(clamped);
          setIsEditing(false);
        };

        const handleInputBlur = () => {
          if (editCancelledRef.current) {
            editCancelledRef.current = false;
            return;
          }
          commitValue();
        };

        const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitValue();
          } else if (e.key === "Escape") {
            e.preventDefault();
            editCancelledRef.current = true;
            setIsEditing(false);
          }
        };

        return (
          <FormItem className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <LabelWithTooltip label={label} tooltip={tooltip} />
                <ValidationIndicator
                  isValid={!fieldState.error && !hasWarning}
                  hasError={!!fieldState.error}
                  hasWarning={hasWarning}
                  isTouched={fieldState.isTouched}
                  isDirty={fieldState.isDirty}
                />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={field.value <= min}
                  aria-label={`Decrease ${label}`}
                  className="border-input bg-background hover:bg-accent hover:text-accent-foreground touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
                >
                  −
                </button>
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    placeholder="e.g. 10K"
                    className="border-input bg-background focus:ring-ring h-8 w-20 shrink-0 rounded-md border px-2 text-center text-sm font-medium focus:ring-2 focus:outline-none"
                    aria-label={`${label} value`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    aria-label={`Edit ${label} value`}
                    className="border-input bg-background hover:bg-accent hover:text-accent-foreground touch-target h-8 min-w-[5rem] shrink-0 rounded-md border px-2 text-center text-sm font-medium whitespace-nowrap tabular-nums"
                  >
                    {formatCurrencyValue(field.value)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={field.value >= max}
                  aria-label={`Increase ${label}`}
                  className="border-input bg-background hover:bg-accent hover:text-accent-foreground touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
            <FormControl>
              <Slider
                min={min}
                max={max}
                step={step}
                value={[field.value]}
                onValueChange={([value]) => field.onChange(value)}
                getValueLabel={(value) => formatCurrencyValue(value)}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
            {hasWarning && <FormWarning>{warning}</FormWarning>}
          </FormItem>
        );
      }}
    />
  );
}

interface LogarithmicSliderFieldProps extends FormFieldProps {
  min: number;
  max: number;
  /** Quick select buttons for common values */
  quickSelects?: { label: string; value: number }[];
}

/** Default quick selects for exit valuation ($1M - $10B range) */
const DEFAULT_VALUATION_QUICK_SELECTS = [
  { label: "$10M", value: 10_000_000 },
  { label: "$50M", value: 50_000_000 },
  { label: "$100M", value: 100_000_000 },
  { label: "$500M", value: 500_000_000 },
  { label: "$1B", value: 1_000_000_000 },
];

/**
 * Logarithmic slider for large value ranges like exit valuations ($1M - $10B).
 * Uses logarithmic scale so each order of magnitude gets equal slider space.
 * Includes quick-select buttons for common values.
 */
export function LogarithmicSliderField({
  form,
  name,
  label,
  description,
  tooltip,
  min,
  max,
  quickSelects = DEFAULT_VALUATION_QUICK_SELECTS,
  warningContext,
}: LogarithmicSliderFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const editCancelledRef = React.useRef(false);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Filter quick selects to only show values within range
  const visibleQuickSelects = quickSelects.filter((qs) => qs.value >= min && qs.value <= max);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const warning = getFieldWarning(name, field.value, warningContext);
        const hasWarning = !!warning && !fieldState.error;

        // Convert between actual value and slider position (0-100)
        const sliderPosition = logToLinear(field.value, min, max) * 100;

        const handleSliderChange = (values: number[]) => {
          const position = values[0] / 100;
          const newValue = linearToLog(position, min, max);
          // Round to nearest reasonable step based on magnitude
          const magnitude = Math.pow(10, Math.floor(Math.log10(newValue)));
          const rounded = Math.round(newValue / magnitude) * magnitude;
          field.onChange(Math.max(min, Math.min(max, rounded)));
        };

        const handleEditClick = () => {
          editCancelledRef.current = false;
          setEditValue(formatLargeNumber(field.value).replace("$", ""));
          setIsEditing(true);
        };

        const commitValue = () => {
          if (editValue.trim() === "") {
            setIsEditing(false);
            return;
          }
          const parsed = parseShorthand(editValue);
          if (isNaN(parsed)) {
            setIsEditing(false);
            return;
          }
          const clamped = Math.max(min, Math.min(max, parsed));
          field.onChange(clamped);
          setIsEditing(false);
        };

        const handleInputBlur = () => {
          if (editCancelledRef.current) {
            editCancelledRef.current = false;
            return;
          }
          commitValue();
        };

        const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitValue();
          } else if (e.key === "Escape") {
            e.preventDefault();
            editCancelledRef.current = true;
            setIsEditing(false);
          }
        };

        // Calculate step sizes for +/- buttons based on current magnitude
        const getStepSize = (value: number): number => {
          if (value >= 1_000_000_000) return 100_000_000; // $100M steps above $1B
          if (value >= 100_000_000) return 10_000_000; // $10M steps above $100M
          if (value >= 10_000_000) return 1_000_000; // $1M steps above $10M
          return 100_000; // $100K steps for smaller values
        };

        const handleDecrement = () => {
          const stepSize = getStepSize(field.value);
          const newValue = Math.max(min, field.value - stepSize);
          field.onChange(newValue);
        };

        const handleIncrement = () => {
          const stepSize = getStepSize(field.value);
          const newValue = Math.min(max, field.value + stepSize);
          field.onChange(newValue);
        };

        return (
          <FormItem className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <LabelWithTooltip label={label} tooltip={tooltip} />
                <ValidationIndicator
                  isValid={!fieldState.error && !hasWarning}
                  hasError={!!fieldState.error}
                  hasWarning={hasWarning}
                  isTouched={fieldState.isTouched}
                  isDirty={fieldState.isDirty}
                />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={field.value <= min}
                  aria-label={`Decrease ${label}`}
                  className="border-input bg-background hover:bg-accent hover:text-accent-foreground touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
                >
                  −
                </button>
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    placeholder="e.g. 100M"
                    className="border-input bg-background focus:ring-ring h-8 w-24 shrink-0 rounded-md border px-2 text-center text-sm font-medium focus:ring-2 focus:outline-none"
                    aria-label={`${label} value`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    aria-label={`Edit ${label} value`}
                    className="border-input bg-background hover:bg-accent hover:text-accent-foreground touch-target h-8 min-w-[5.5rem] shrink-0 rounded-md border px-2 text-center text-sm font-medium whitespace-nowrap tabular-nums"
                  >
                    {formatLargeNumber(field.value)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={field.value >= max}
                  aria-label={`Increase ${label}`}
                  className="border-input bg-background hover:bg-accent hover:text-accent-foreground touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
            <FormControl>
              <Slider
                min={0}
                max={100}
                step={0.1}
                value={[sliderPosition]}
                onValueChange={handleSliderChange}
                getValueLabel={() => formatLargeNumber(field.value)}
              />
            </FormControl>
            {/* Quick select buttons */}
            {visibleQuickSelects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {visibleQuickSelects.map((qs) => (
                  <Button
                    key={qs.value}
                    type="button"
                    variant={field.value === qs.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => field.onChange(qs.value)}
                    className="h-7 px-2 text-xs tabular-nums"
                  >
                    {qs.label}
                  </Button>
                ))}
              </div>
            )}
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
            {hasWarning && <FormWarning>{warning}</FormWarning>}
          </FormItem>
        );
      }}
    />
  );
}

interface SelectFieldProps extends FormFieldProps {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({
  form,
  name,
  label,
  description,
  tooltip,
  options,
  placeholder = "Select an option",
}: SelectFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <LabelWithTooltip label={label} tooltip={tooltip} />
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface TextInputFieldProps extends FormFieldProps {
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url";
}

/**
 * Simple text input field wrapper
 * Consolidates FormField + FormItem + FormLabel + FormControl + Input pattern
 */
export function TextInputField({
  form,
  name,
  label,
  description,
  tooltip,
  placeholder,
  type = "text",
}: TextInputFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const hasIndicator = fieldState.isTouched && fieldState.isDirty;
        return (
          <FormItem>
            <LabelWithTooltip label={label} tooltip={tooltip} />
            <div className="relative">
              <FormControl>
                <Input
                  type={type}
                  placeholder={placeholder}
                  className={hasIndicator ? "pr-10" : ""}
                  {...field}
                />
              </FormControl>
              <span className="absolute top-1/2 right-3 -translate-y-1/2">
                <ValidationIndicator
                  isValid={!fieldState.error}
                  hasError={!!fieldState.error}
                  hasWarning={false}
                  isTouched={fieldState.isTouched}
                  isDirty={fieldState.isDirty}
                />
              </span>
            </div>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * Checkbox field wrapper with label and description
 * Consolidates the common checkbox + label + description pattern
 */
export function CheckboxField({ form, name, label, description, tooltip }: FormFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-y-0 space-x-3">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <div className="space-y-1 leading-none">
            <LabelWithTooltip label={label} tooltip={tooltip} />
            {description && <FormDescription>{description}</FormDescription>}
          </div>
        </FormItem>
      )}
    />
  );
}
