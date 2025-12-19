"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Landmark, ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { generateId } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { WizardStepProps, FundingEntry, FundingType } from "../types";

type FundingStepMode = "ask" | "form";

const FUNDING_TYPE_OPTIONS: { value: FundingType; label: string; description: string }[] = [
  { value: "SAFE", label: "SAFE", description: "Simple Agreement for Future Equity - most common for early stage" },
  { value: "CONVERTIBLE_NOTE", label: "Convertible Note", description: "Debt that converts to equity" },
  { value: "PRICED_ROUND", label: "Priced Round", description: "Direct equity purchase at set valuation" },
];

export function StepFunding({
  data,
  onDataChange,
  onNext,
  onBack,
  onSkipWizard,
}: WizardStepProps) {
  const [mode, setMode] = React.useState<FundingStepMode>(
    data.funding.length > 0 ? "form" : "ask"
  );

  const handleYes = () => {
    if (data.funding.length === 0) {
      // Add a default empty funding entry
      onDataChange({
        funding: [{
          id: generateId(),
          type: "SAFE",
          investorName: "",
          amount: 0,
          valuationCap: 0,
        }],
      });
    }
    setMode("form");
  };

  const handleSkip = () => {
    onDataChange({ funding: [] });
    onNext();
  };

  const handleTypeChange = (id: string, type: FundingType) => {
    const updatedFunding = data.funding.map((f) =>
      f.id === id ? { ...f, type } : f
    );
    onDataChange({ funding: updatedFunding });
  };

  const handleInvestorChange = (id: string, investorName: string) => {
    const updatedFunding = data.funding.map((f) =>
      f.id === id ? { ...f, investorName } : f
    );
    onDataChange({ funding: updatedFunding });
  };

  const handleAmountChange = (id: string, value: string) => {
    const amount = parseFloat(value) || 0;
    const updatedFunding = data.funding.map((f) =>
      f.id === id ? { ...f, amount } : f
    );
    onDataChange({ funding: updatedFunding });
  };

  const handleCapChange = (id: string, value: string) => {
    const valuationCap = parseFloat(value) || 0;
    const updatedFunding = data.funding.map((f) =>
      f.id === id ? { ...f, valuationCap } : f
    );
    onDataChange({ funding: updatedFunding });
  };

  const handleAddFunding = () => {
    const newFunding: FundingEntry = {
      id: generateId(),
      type: "SAFE",
      investorName: "",
      amount: 0,
      valuationCap: 0,
    };
    onDataChange({ funding: [...data.funding, newFunding] });
  };

  const handleRemoveFunding = (id: string) => {
    const updatedFunding = data.funding.filter((f) => f.id !== id);
    onDataChange({ funding: updatedFunding });
    if (updatedFunding.length === 0) {
      setMode("ask");
    }
  };

  // Ask mode - simple yes/no question
  if (mode === "ask") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Have you raised any money?</h2>
          <p className="text-muted-foreground">
            Add SAFEs, convertible notes, or priced rounds
          </p>
        </div>

        {/* Choice Buttons */}
        <div className="flex justify-center gap-4 pt-4">
          <Button variant="outline" size="lg" onClick={handleSkip}>
            No, skip this
          </Button>
          <Button size="lg" onClick={handleYes}>
            Yes, add funding
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-8">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="ghost" onClick={onSkipWizard}>
              Skip Wizard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form mode - add funding
  const hasValidFunding = data.funding.some(
    (f) => f.investorName.trim() !== "" && f.amount > 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Landmark className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Add your funding</h2>
        <p className="text-muted-foreground">
          Enter the details for each funding instrument
        </p>
      </div>

      {/* Funding Entries */}
      <AnimatePresence mode="popLayout">
        {data.funding.map((funding, index) => (
          <motion.div
            key={funding.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-medium">Investment {index + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFunding(funding.id)}
                  className="text-destructive hover:text-destructive -mt-1 -mr-2"
                  aria-label={`Remove investment ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Type Selection */}
              <div className="space-y-3 mb-4">
                <Label>Type</Label>
                <RadioGroup
                  value={funding.type}
                  onValueChange={(v) => handleTypeChange(funding.id, v as FundingType)}
                  className="grid grid-cols-3 gap-2"
                >
                  {FUNDING_TYPE_OPTIONS.map((option) => (
                    <Label
                      key={option.value}
                      htmlFor={`type-${funding.id}-${option.value}`}
                      className="flex items-center justify-center p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors text-center [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`type-${funding.id}-${option.value}`}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{option.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Investor & Amount */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor={`investor-${funding.id}`}>Investor Name</Label>
                  <Input
                    id={`investor-${funding.id}`}
                    placeholder="e.g., Acme Ventures"
                    value={funding.investorName}
                    onChange={(e) => handleInvestorChange(funding.id, e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`amount-${funding.id}`}>Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id={`amount-${funding.id}`}
                      type="number"
                      min={0}
                      placeholder="500000"
                      value={funding.amount || ""}
                      onChange={(e) => handleAmountChange(funding.id, e.target.value)}
                      className="pl-7 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Valuation Cap (for SAFE/Note) */}
              {(funding.type === "SAFE" || funding.type === "CONVERTIBLE_NOTE") && (
                <div>
                  <Label htmlFor={`cap-${funding.id}`}>Valuation Cap</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id={`cap-${funding.id}`}
                      type="number"
                      min={0}
                      placeholder="10000000"
                      value={funding.valuationCap || ""}
                      onChange={(e) => handleCapChange(funding.id, e.target.value)}
                      className="pl-7 tabular-nums"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum valuation at which the investment converts
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add More Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddFunding}
        className="w-full"
        disabled={data.funding.length >= 5}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Investment
      </Button>

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
        <Button onClick={onNext} disabled={!hasValidFunding}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
