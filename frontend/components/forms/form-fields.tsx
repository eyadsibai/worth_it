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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FormFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  name: string;
  label: string;
  description?: string;
  tooltip?: string;
}

/**
 * FormLabel with optional tooltip icon
 * Shows a help icon next to the label that displays the tooltip on hover
 */
function LabelWithTooltip({ label, tooltip }: { label: string; tooltip?: string }) {
  if (!tooltip) {
    return <FormLabel>{label}</FormLabel>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <FormLabel>{label}</FormLabel>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
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
}: NumberInputFieldProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        // Format the display value with thousand separators when not focused
        const displayValue = !isFocused && formatDisplay && typeof field.value === "number"
          ? field.value.toLocaleString("en-US")
          : field.value ?? "";

        return (
          <FormItem>
            <LabelWithTooltip label={label} tooltip={tooltip} />
            <FormControl>
              <div className="relative">
                {prefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {prefix}
                  </span>
                )}
                <Input
                  type={isFocused || !formatDisplay ? "number" : "text"}
                  placeholder={placeholder}
                  min={min}
                  max={max}
                  step={step}
                  className={prefix ? "pl-12" : suffix ? "pr-12" : ""}
                  value={displayValue}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    setIsFocused(false);
                    field.onBlur();
                  }}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, ""); // Remove commas if user pastes formatted number
                    field.onChange(value === "" ? undefined : Number(value));
                  }}
                />
                {suffix && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {suffix}
                  </span>
                )}
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
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
}: SliderFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <LabelWithTooltip label={label} tooltip={tooltip} />
            <span className="text-sm font-medium">
              {formatValue ? formatValue(field.value) : field.value}
            </span>
          </div>
          <FormControl>
            <Slider
              min={min}
              max={max}
              step={step}
              value={[field.value]}
              onValueChange={([value]) => field.onChange(value)}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
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
      render={({ field }) => (
        <FormItem>
          <LabelWithTooltip label={label} tooltip={tooltip} />
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Checkbox field wrapper with label and description
 * Consolidates the common checkbox + label + description pattern
 */
export function CheckboxField({
  form,
  name,
  label,
  description,
  tooltip,
}: FormFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
