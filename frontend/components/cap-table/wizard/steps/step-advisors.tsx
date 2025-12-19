"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Target, ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { generateId } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { WizardStepProps, AdvisorEntry } from "../types";

type AdvisorStepMode = "ask" | "form";

export function StepAdvisors({
  data,
  onDataChange,
  onNext,
  onBack,
  onSkipWizard,
}: WizardStepProps) {
  const [mode, setMode] = React.useState<AdvisorStepMode>(
    data.advisors.length > 0 ? "form" : "ask"
  );

  const handleYes = () => {
    if (data.advisors.length === 0) {
      // Add a default empty advisor
      onDataChange({
        advisors: [{ id: generateId(), name: "", ownershipPct: 0.5 }],
      });
    }
    setMode("form");
  };

  const handleSkip = () => {
    onDataChange({ advisors: [] });
    onNext();
  };

  const handleNameChange = (id: string, name: string) => {
    const updatedAdvisors = data.advisors.map((a) =>
      a.id === id ? { ...a, name } : a
    );
    onDataChange({ advisors: updatedAdvisors });
  };

  const handleOwnershipChange = (id: string, value: string) => {
    const ownershipPct = parseFloat(value) || 0;
    const updatedAdvisors = data.advisors.map((a) =>
      a.id === id ? { ...a, ownershipPct } : a
    );
    onDataChange({ advisors: updatedAdvisors });
  };

  const handleAddAdvisor = () => {
    const newAdvisor: AdvisorEntry = {
      id: generateId(),
      name: "",
      ownershipPct: 0.25,
    };
    onDataChange({ advisors: [...data.advisors, newAdvisor] });
  };

  const handleRemoveAdvisor = (id: string) => {
    const updatedAdvisors = data.advisors.filter((a) => a.id !== id);
    onDataChange({ advisors: updatedAdvisors });
    if (updatedAdvisors.length === 0) {
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
            <Target className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Do you have any advisors?</h2>
          <p className="text-muted-foreground">
            Advisors typically receive 0.25% - 1% equity with vesting
          </p>
        </div>

        {/* Choice Buttons */}
        <div className="flex justify-center gap-4 pt-4">
          <Button variant="outline" size="lg" onClick={handleSkip}>
            No, skip this
          </Button>
          <Button size="lg" onClick={handleYes}>
            Yes, add advisors
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

  // Form mode - add advisors
  const hasValidAdvisors = data.advisors.some((a) => a.name.trim() !== "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Add your advisors</h2>
        <p className="text-muted-foreground">
          Advisors will have standard 4-year vesting with 1-year cliff
        </p>
      </div>

      {/* Advisor Entries */}
      <Card className="p-6">
        <AnimatePresence mode="popLayout">
          {data.advisors.map((advisor, index) => (
            <motion.div
              key={advisor.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-4 last:mb-0"
            >
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label htmlFor={`advisor-name-${advisor.id}`} className="sr-only">
                    Advisor {index + 1} name
                  </Label>
                  <Input
                    id={`advisor-name-${advisor.id}`}
                    placeholder="Advisor name"
                    value={advisor.name}
                    onChange={(e) => handleNameChange(advisor.id, e.target.value)}
                    aria-label={`Advisor ${index + 1} name`}
                  />
                </div>
                <div className="w-24">
                  <Label htmlFor={`advisor-ownership-${advisor.id}`}>
                    Equity
                  </Label>
                  <div className="relative">
                    <Input
                      id={`advisor-ownership-${advisor.id}`}
                      type="number"
                      min={0}
                      max={5}
                      step={0.25}
                      value={advisor.ownershipPct}
                      onChange={(e) => handleOwnershipChange(advisor.id, e.target.value)}
                      className="pr-8 tabular-nums"
                      aria-label={`Advisor ${index + 1} equity percentage`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveAdvisor(advisor.id)}
                  className="text-destructive hover:text-destructive"
                  aria-label={`Remove advisor ${advisor.name || index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Advisor Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddAdvisor}
          className="mt-4 w-full"
          disabled={data.advisors.length >= 5}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Advisor
        </Button>
      </Card>

      {/* Info */}
      <p className="text-sm text-muted-foreground text-center">
        💡 Typical advisor equity: 0.25% - 1% depending on involvement level
      </p>

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
        <Button onClick={onNext} disabled={!hasValidAdvisors}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
