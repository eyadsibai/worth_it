"use client";

import { Plus, Minus, RefreshCw, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VersionDiff, StakeholderDiff, FundingDiff } from "./types";
import type { FundingInstrument } from "@/lib/schemas";

interface VersionDiffViewProps {
  diff: VersionDiff;
}

/**
 * Format a funding instrument for display
 */
function formatInstrument(instrument: FundingInstrument): string {
  switch (instrument.type) {
    case "SAFE":
      return `SAFE: ${instrument.investor_name} ($${instrument.investment_amount.toLocaleString()})`;
    case "CONVERTIBLE_NOTE":
      return `Note: ${instrument.investor_name} ($${instrument.principal_amount.toLocaleString()})`;
    case "PRICED_ROUND":
      return `${instrument.round_name} ($${instrument.amount_raised.toLocaleString()})`;
    default:
      return "Unknown instrument";
  }
}

/**
 * Single change row component
 */
function ChangeRow({
  type,
  icon,
  label,
  detail,
}: {
  type: "added" | "removed" | "modified";
  icon: React.ReactNode;
  label: string;
  detail?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
        type === "added" && "bg-terminal/10 text-terminal",
        type === "removed" && "bg-destructive/10 text-destructive",
        type === "modified" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
      {detail && <span className="ml-auto text-xs opacity-75">{detail}</span>}
    </div>
  );
}

export function VersionDiffView({ diff }: VersionDiffViewProps) {
  const { stakeholderChanges, fundingChanges, optionPoolChange, summary } = diff;

  const hasNoChanges =
    stakeholderChanges.length === 0 && fundingChanges.length === 0 && !optionPoolChange;

  if (hasNoChanges) {
    return (
      <div className="text-muted-foreground py-6 text-center text-sm">No differences detected</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-muted/50 rounded-lg px-4 py-3">
        <p className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">Summary</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {summary.stakeholdersAdded > 0 && (
            <span className="text-terminal">
              +{summary.stakeholdersAdded} stakeholder{summary.stakeholdersAdded > 1 ? "s" : ""}
            </span>
          )}
          {summary.stakeholdersRemoved > 0 && (
            <span className="text-destructive">
              -{summary.stakeholdersRemoved} stakeholder{summary.stakeholdersRemoved > 1 ? "s" : ""}
            </span>
          )}
          {summary.stakeholdersModified > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              ~{summary.stakeholdersModified} ownership change
              {summary.stakeholdersModified > 1 ? "s" : ""}
            </span>
          )}
          {summary.fundingAdded > 0 && (
            <span className="text-terminal">+{summary.fundingAdded} funding</span>
          )}
          {summary.fundingRemoved > 0 && (
            <span className="text-destructive">-{summary.fundingRemoved} funding</span>
          )}
          {optionPoolChange && (
            <span className="text-amber-600 dark:text-amber-400">option pool changed</span>
          )}
        </div>
      </div>

      {/* Stakeholder changes */}
      {stakeholderChanges.length > 0 && (
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
            Stakeholders
          </h4>
          <div className="space-y-2">
            {stakeholderChanges.map((change, idx) => (
              <StakeholderChangeRow key={idx} change={change} />
            ))}
          </div>
        </div>
      )}

      {/* Funding changes */}
      {fundingChanges.length > 0 && (
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">Funding</h4>
          <div className="space-y-2">
            {fundingChanges.map((change, idx) => (
              <FundingChangeRow key={idx} change={change} />
            ))}
          </div>
        </div>
      )}

      {/* Option pool change */}
      {optionPoolChange && (
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
            Option Pool
          </h4>
          <ChangeRow
            type="modified"
            icon={<Percent className="h-4 w-4" />}
            label="Option pool"
            detail={`${optionPoolChange.previous}% → ${optionPoolChange.current}%`}
          />
        </div>
      )}
    </div>
  );
}

function StakeholderChangeRow({ change }: { change: StakeholderDiff }) {
  const { type, stakeholder, previousOwnership, newOwnership } = change;

  switch (type) {
    case "added":
      return (
        <ChangeRow
          type="added"
          icon={<Plus className="h-4 w-4" />}
          label={stakeholder.name}
          detail={`${stakeholder.ownership_pct}%`}
        />
      );
    case "removed":
      return (
        <ChangeRow
          type="removed"
          icon={<Minus className="h-4 w-4" />}
          label={stakeholder.name}
          detail={`${stakeholder.ownership_pct}%`}
        />
      );
    case "modified":
      return (
        <ChangeRow
          type="modified"
          icon={<RefreshCw className="h-4 w-4" />}
          label={stakeholder.name}
          detail={`${previousOwnership}% → ${newOwnership}%`}
        />
      );
    default:
      return null;
  }
}

function FundingChangeRow({ change }: { change: FundingDiff }) {
  const { type, instrument } = change;

  return (
    <ChangeRow
      type={type === "added" ? "added" : "removed"}
      icon={type === "added" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      label={formatInstrument(instrument)}
    />
  );
}
