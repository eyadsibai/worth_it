"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PieChart, ArrowLeft, ArrowRight } from "lucide-react";
import { OPTION_POOL_OPTIONS, type WizardStepProps } from "../types";

export function StepOptionPool({
  data,
  onDataChange,
  onNext,
  onBack,
  onSkipWizard,
}: WizardStepProps) {
  const handleOptionChange = (value: string) => {
    onDataChange({ optionPoolPct: parseInt(value, 10) });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <PieChart className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Reserve equity for employees?</h2>
        <p className="text-muted-foreground">
          Set aside shares for future employee option grants
        </p>
      </div>

      {/* Option Pool Selection */}
      <Card className="p-6">
        <RadioGroup
          value={data.optionPoolPct.toString()}
          onValueChange={handleOptionChange}
          className="space-y-3"
        >
          {OPTION_POOL_OPTIONS.map((option) => (
            <Label
              key={option.value}
              htmlFor={`pool-${option.value}`}
              className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
            >
              <RadioGroupItem
                value={option.value.toString()}
                id={`pool-${option.value}`}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  {option.value === 15 && (
                    <span className="text-xs bg-terminal/20 text-terminal px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          💡 The option pool is carved out from founder equity proportionally.
          For example, a 15% pool reduces each founder&apos;s stake by 15%.
        </p>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="ghost" onClick={onSkipWizard}>
            Skip Wizard
          </Button>
        </div>
        <Button onClick={onNext}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
