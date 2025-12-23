"use client";

import * as React from "react";
import { type FieldValues, type UseFormReturn, type Path } from "react-hook-form";
import { FormField } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface DistributionSectionProps<T extends FieldValues> {
  /** React Hook Form instance */
  form: UseFormReturn<T>;
  /** Field name for the enabled toggle (must be a boolean field) */
  enabledFieldName: Path<T>;
  /** Section title */
  title: string;
  /** Section description */
  description: string;
  /** Distribution type label shown in parentheses */
  distributionType: "PERT" | "Normal";
  /** Section content (typically NumberInputFields) */
  children: React.ReactNode;
  /** Number of columns for the grid layout (default: 3) */
  columns?: 2 | 3;
  /** Additional className for the container */
  className?: string;
}

/**
 * DistributionSection - A collapsible section for Monte Carlo distribution parameters.
 *
 * Encapsulates the common pattern of:
 * - Toggle switch to enable/disable the distribution
 * - Collapsible content with grid layout for min/mode/max or mean/std fields
 * - Consistent styling with dark mode support
 *
 * @example
 * <DistributionSection
 *   form={form}
 *   enabledFieldName="growth_rate_enabled"
 *   title="Salary Growth Rate Distribution"
 *   description="Simulate uncertainty in salary growth rates"
 *   distributionType="PERT"
 * >
 *   <NumberInputField name="growth_rate_min" label="Minimum" ... />
 *   <NumberInputField name="growth_rate_mode" label="Most Likely" ... />
 *   <NumberInputField name="growth_rate_max" label="Maximum" ... />
 * </DistributionSection>
 */
export function DistributionSection<T extends FieldValues>({
  form,
  enabledFieldName,
  title,
  description,
  distributionType,
  children,
  columns = 3,
  className,
}: DistributionSectionProps<T>) {
  const isEnabled = form.watch(enabledFieldName);

  return (
    <Collapsible open={isEnabled as boolean}>
      <div
        className={cn(
          "space-y-4 p-4 border border-border rounded-lg",
          "bg-muted/50 dark:bg-muted/30",
          className
        )}
      >
        <FormField
          control={form.control}
          name={enabledFieldName}
          render={({ field }) => (
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">
                  {title} ({distributionType})
                </h4>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={field.value as boolean}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />

        <CollapsibleContent className="space-y-4">
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              columns === 2 ? "sm:grid-cols-2 sm:gap-6" : "sm:grid-cols-3"
            )}
          >
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
