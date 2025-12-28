"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { NumberInputField } from "@/components/forms/form-fields";
import type { BerkusFormData } from "@/lib/schemas";

interface BerkusFormProps {
  form: UseFormReturn<BerkusFormData>;
}

/**
 * Form for the Berkus Method valuation.
 *
 * The Berkus Method assigns value to five key risk-reducing elements,
 * each worth $0 to $500K. Maximum total valuation is $2.5M.
 * Ideal for pre-seed startups with idea/prototype stage.
 */
export function BerkusForm({ form }: BerkusFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberInputField
          form={form}
          name="soundIdea"
          label="Sound Idea"
          description="Basic value of the concept"
          prefix="$"
          min={0}
          max={500_000}
          step={25_000}
          placeholder="250000"
          formatDisplay={true}
          tooltip="Does the idea address a real market need? Score from $0 (no value) to $500K (exceptional opportunity)."
        />

        <NumberInputField
          form={form}
          name="prototype"
          label="Prototype"
          description="Technology risk reduction"
          prefix="$"
          min={0}
          max={500_000}
          step={25_000}
          placeholder="250000"
          formatDisplay={true}
          tooltip="Does a working prototype or MVP exist? Score from $0 (idea only) to $500K (fully functional prototype)."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberInputField
          form={form}
          name="qualityTeam"
          label="Quality Management Team"
          description="Execution risk reduction"
          prefix="$"
          min={0}
          max={500_000}
          step={25_000}
          placeholder="250000"
          formatDisplay={true}
          tooltip="Is the team experienced and capable? Score from $0 (inexperienced) to $500K (proven entrepreneurs)."
        />

        <NumberInputField
          form={form}
          name="strategicRelationships"
          label="Strategic Relationships"
          description="Competitive risk reduction"
          prefix="$"
          min={0}
          max={500_000}
          step={25_000}
          placeholder="250000"
          formatDisplay={true}
          tooltip="Are there valuable partnerships, advisors, or distribution deals? Score from $0 (none) to $500K (game-changing relationships)."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NumberInputField
          form={form}
          name="productRollout"
          label="Product Rollout / Sales"
          description="Adoption risk reduction"
          prefix="$"
          min={0}
          max={500_000}
          step={25_000}
          placeholder="250000"
          formatDisplay={true}
          tooltip="Is there evidence of product-market fit or early sales? Score from $0 (no traction) to $500K (strong early adoption)."
        />

        <NumberInputField
          form={form}
          name="maxPerCriterion"
          label="Max Per Criterion"
          description="Adjustable cap (default $500K)"
          prefix="$"
          min={0}
          step={50_000}
          placeholder="500000"
          formatDisplay={true}
          tooltip="Maximum value per criterion. Traditional Berkus uses $500K, but can be adjusted for different markets or stages."
        />
      </div>
    </div>
  );
}
