"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Users, ArrowRight } from "lucide-react";
import { generateId } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { WizardStepProps, FounderEntry } from "../types";

export function StepFounders({
  data,
  onDataChange,
  onNext,
  onSkipWizard,
}: Omit<WizardStepProps, "onBack">) {
  const totalOwnership = data.founders.reduce((sum, f) => sum + f.ownershipPct, 0);
  const isOverLimit = totalOwnership > 100;
  const hasValidNames = data.founders.some((f) => f.name.trim() !== "");
  const canProceed = hasValidNames && !isOverLimit;

  const handleNameChange = (id: string, name: string) => {
    const updatedFounders = data.founders.map((f) =>
      f.id === id ? { ...f, name } : f
    );
    onDataChange({ founders: updatedFounders });
  };

  const handleOwnershipChange = (id: string, value: string) => {
    const ownershipPct = parseFloat(value) || 0;
    const updatedFounders = data.founders.map((f) =>
      f.id === id ? { ...f, ownershipPct } : f
    );
    onDataChange({ founders: updatedFounders });
  };

  const handleAddFounder = () => {
    const newFounder: FounderEntry = {
      id: generateId(),
      name: "",
      ownershipPct: 0,
    };
    onDataChange({ founders: [...data.founders, newFounder] });
  };

  const handleRemoveFounder = (id: string) => {
    const updatedFounders = data.founders.filter((f) => f.id !== id);
    onDataChange({ founders: updatedFounders });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Who are the founders?</h2>
        <p className="text-muted-foreground">
          Add the founding team and their equity split
        </p>
      </div>

      {/* Founder Entries */}
      <Card className="p-6">
        <AnimatePresence mode="popLayout">
          {data.founders.map((founder, index) => (
            <motion.div
              key={founder.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-4 last:mb-0"
            >
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label htmlFor={`founder-name-${founder.id}`} className="sr-only">
                    Founder {index + 1} name
                  </Label>
                  <Input
                    id={`founder-name-${founder.id}`}
                    placeholder="Founder name"
                    value={founder.name}
                    onChange={(e) => handleNameChange(founder.id, e.target.value)}
                    aria-label={`Founder ${index + 1} name`}
                  />
                </div>
                <div className="w-28">
                  <Label htmlFor={`founder-ownership-${founder.id}`}>
                    Ownership
                  </Label>
                  <div className="relative">
                    <Input
                      id={`founder-ownership-${founder.id}`}
                      type="number"
                      min={0}
                      max={100}
                      value={founder.ownershipPct}
                      onChange={(e) => handleOwnershipChange(founder.id, e.target.value)}
                      className="pr-8 tabular-nums"
                      aria-label={`Founder ${index + 1} ownership percentage`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </div>
                {data.founders.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFounder(founder.id)}
                    className="text-destructive hover:text-destructive"
                    aria-label={`Remove founder ${founder.name || index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Founder Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddFounder}
          className="mt-4 w-full"
          disabled={data.founders.length >= 6}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Founder
        </Button>
      </Card>

      {/* Total Summary */}
      <Card className="p-4 bg-muted/50">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total</span>
          <span
            className={`text-lg font-semibold tabular-nums ${
              isOverLimit ? "text-destructive" : totalOwnership === 100 ? "text-terminal" : ""
            }`}
          >
            {totalOwnership}%
          </span>
        </div>
        {isOverLimit && (
          <p className="text-xs text-destructive mt-1">
            Total exceeds 100%. Please adjust the ownership percentages.
          </p>
        )}
        {!isOverLimit && totalOwnership < 100 && (
          <p className="text-xs text-muted-foreground mt-1">
            Remaining {100 - totalOwnership}% will be unallocated (can add later)
          </p>
        )}
      </Card>

      {/* Tip */}
      <p className="text-sm text-muted-foreground text-center">
        💡 Tip: Equal splits are common for co-founders at the start
      </p>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onSkipWizard}>
          Skip Wizard
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
