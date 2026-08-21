"use client";

import { useTranslations } from "next-intl";
import { Field } from "@/components/ledger/field";
import { Money } from "@/components/ledger/money";
import { useAppStore } from "@/lib/store";
import { VALIDATION } from "@/lib/constants/validation";
import type { CurrentJobForm, InvestmentFrequency } from "@/lib/schemas";

/**
 * Seeded onto `currentJob` the first time any Stay field is edited, matching
 * the legacy Current Job form's defaults — so editing one field doesn't blank
 * out the others.
 */
const DEFAULT_SALARY_GROWTH_RATE = 3;
const DEFAULT_ASSUMED_ANNUAL_ROI = 5.4;
const DEFAULT_INVESTMENT_FREQUENCY: InvestmentFrequency = "Monthly";
const INVESTMENT_FREQUENCIES: InvestmentFrequency[] = ["Monthly", "Annually"];

/** Placeholder for the take-home footer before any offer has computed a value to derive it from. */
const EMPTY_STAT = "—";

export interface StayColumnProps {
  /**
   * Final `opportunityCost` value (the last row's cumulative figure) from the
   * leading offer's `useScenarioCalculation` result. The landing wires this
   * in once an `OfferColumn` has reported one through `onScenarioData`; an
   * em dash renders until then.
   */
  takeHomeOverHorizon?: number | null;
}

/** Fills in every `currentJob` field not present in `patch` from its current (or default) value. */
function mergeCurrentJob(
  currentJob: CurrentJobForm | null,
  patch: Partial<CurrentJobForm>
): CurrentJobForm {
  return {
    monthly_salary: currentJob?.monthly_salary ?? 0,
    annual_salary_growth_rate: currentJob?.annual_salary_growth_rate ?? DEFAULT_SALARY_GROWTH_RATE,
    assumed_annual_roi: currentJob?.assumed_annual_roi ?? DEFAULT_ASSUMED_ANNUAL_ROI,
    investment_frequency: currentJob?.investment_frequency ?? DEFAULT_INVESTMENT_FREQUENCY,
    ...patch,
  };
}

function frequencyLabelKey(frequency: InvestmentFrequency): "monthly" | "annually" {
  return frequency === "Monthly" ? "monthly" : "annually";
}

/**
 * The left-hand duel column: the user's current job, editable against the
 * surplus-investment assumptions shared with every offer comparison.
 */
export function StayColumn({ takeHomeOverHorizon = null }: StayColumnProps) {
  const t = useTranslations("duel");
  const currentJob = useAppStore((state) => state.currentJob);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);

  const updateCurrentJob = (patch: Partial<CurrentJobForm>) => {
    setCurrentJob(mergeCurrentJob(currentJob, patch));
  };

  const activeFrequency = currentJob?.investment_frequency ?? DEFAULT_INVESTMENT_FREQUENCY;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-medium">{t("stay")}</h2>
        <span className="text-annotation tracking-eyebrow text-xs uppercase">
          {t("currentJob")}
        </span>
      </div>

      <Field
        label={t("monthlySalary")}
        value={currentJob?.monthly_salary ?? null}
        onValueChange={(value) => updateCurrentJob({ monthly_salary: value ?? 0 })}
        min={0}
      />
      <Field
        label={t("annualRaise")}
        value={currentJob?.annual_salary_growth_rate ?? null}
        onValueChange={(value) => updateCurrentJob({ annual_salary_growth_rate: value ?? 0 })}
        min={VALIDATION.PCT_MIN}
        max={VALIDATION.PCT_MAX_GROWTH_FORM}
        unit="%"
      />
      <Field
        label={t("surplusRoi")}
        value={currentJob?.assumed_annual_roi ?? null}
        onValueChange={(value) => updateCurrentJob({ assumed_annual_roi: value ?? 0 })}
        min={VALIDATION.PCT_MIN}
        max={VALIDATION.PCT_MAX_ROI_FORM}
        unit="%"
      />

      <div
        role="group"
        aria-label={t("investFrequency")}
        className="border-rule flex items-center justify-between border-b py-2"
      >
        <span className="text-annotation text-sm">{t("investFrequency")}</span>
        <span className="flex gap-2">
          {INVESTMENT_FREQUENCIES.map((frequency) => (
            <button
              key={frequency}
              type="button"
              aria-pressed={activeFrequency === frequency}
              onClick={() => updateCurrentJob({ investment_frequency: frequency })}
              className="border-rule aria-pressed:border-market aria-pressed:bg-market-soft aria-pressed:text-market rounded-sm border px-2 py-0.5 font-mono text-xs"
            >
              {t(frequencyLabelKey(frequency))}
            </button>
          ))}
        </span>
      </div>

      <div className="border-ink mt-2 flex items-baseline justify-between border-t pt-2">
        <span className="text-annotation text-xs">{t("takeHome")}</span>
        {takeHomeOverHorizon === null ? (
          <span className="text-annotation font-mono text-sm">{EMPTY_STAT}</span>
        ) : (
          <Money value={takeHomeOverHorizon} className="text-sm" />
        )}
      </div>
    </div>
  );
}
