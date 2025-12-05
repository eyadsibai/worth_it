"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
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

interface FormFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  name: string;
  label: string;
  description?: string;
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
            <FormLabel>{label}</FormLabel>
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
            <FormLabel>{label}</FormLabel>
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
  options,
  placeholder = "Select an option",
}: SelectFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
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
