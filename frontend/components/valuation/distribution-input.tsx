"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DistributionType = "fixed" | "normal" | "uniform" | "triangular";

export interface DistributionValue {
  type: DistributionType;
  params: Record<string, number>;
}

interface DistributionInputProps {
  name: string;
  label: string;
  value: DistributionValue;
  onChange: (value: DistributionValue) => void;
  /** Optional prefix for value display (e.g., "$" for currency) */
  prefix?: string;
  /** Optional description text shown below the label */
  description?: string;
}

const DEFAULT_PARAMS: Record<DistributionType, Record<string, number>> = {
  fixed: { value: 0 },
  normal: { mean: 0, std: 0 },
  uniform: { min: 0, max: 0 },
  triangular: { min: 0, mode: 0, max: 0 },
};

export function DistributionInput({
  name,
  label,
  value,
  onChange,
  prefix,
  description,
}: DistributionInputProps) {
  const handleTypeChange = (type: DistributionType) => {
    // Start from default params for the new type, then preserve any
    // existing parameters that are also valid for the new type (by key).
    const baseParams = { ...DEFAULT_PARAMS[type] };
    const preservedParams: Record<string, number> = { ...baseParams };

    for (const [key, existingValue] of Object.entries(value.params ?? {})) {
      if (Object.prototype.hasOwnProperty.call(baseParams, key)) {
        preservedParams[key] = existingValue;
      }
    }

    onChange({ type, params: preservedParams });
  };

  const handleParamChange = (paramName: string, paramValue: number) => {
    onChange({ ...value, params: { ...value.params, [paramName]: paramValue } });
  };

  const renderInput = (paramName: string, paramLabel: string, inputPrefix?: string) => (
    <div className="flex items-center gap-2">
      <Label className="w-16 shrink-0 text-xs">{paramLabel}</Label>
      <div className="relative flex-1">
        {inputPrefix && (
          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            {inputPrefix}
          </span>
        )}
        <Input
          type="number"
          value={value.params[paramName] ?? 0}
          onChange={(e) => handleParamChange(paramName, parseFloat(e.target.value) || 0)}
          className={inputPrefix ? "pl-7" : ""}
          id={`${name}-${paramName}`}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Label htmlFor={`${name}-type`} className="font-medium">
            {label}
          </Label>
          {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
        </div>
        <Select value={value.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-32" id={`${name}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="uniform">Uniform</SelectItem>
            <SelectItem value="triangular">Triangular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        {value.type === "fixed" && renderInput("value", "Value", prefix)}

        {value.type === "normal" && (
          <>
            {renderInput("mean", "Mean", prefix)}
            {renderInput("std", "Std Dev", prefix)}
          </>
        )}

        {value.type === "uniform" && (
          <>
            {renderInput("min", "Min", prefix)}
            {renderInput("max", "Max", prefix)}
          </>
        )}

        {value.type === "triangular" && (
          <>
            {renderInput("min", "Min", prefix)}
            {renderInput("mode", "Mode", prefix)}
            {renderInput("max", "Max", prefix)}
          </>
        )}
      </div>

      {/* Distribution type explanations */}
      <p className="text-muted-foreground text-xs">
        {value.type === "fixed" && "A single, constant value with no variation."}
        {value.type === "normal" && "Bell curve distribution centered on the mean."}
        {value.type === "uniform" && "Equal probability for any value between min and max."}
        {value.type === "triangular" && "Most likely value is mode, ranging between min and max."}
      </p>
    </div>
  );
}
