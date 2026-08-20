"use client";

import { Fragment, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Money } from "@/components/ledger/money";
import { OutcomeBand } from "@/components/ledger/outcome-band";
import type { MonteCarloPercentiles } from "@/lib/schemas";
import type { VerdictState } from "@/lib/ledger/verdict";

export interface VerdictStats {
  probabilityOfferWins: number | null;
  equityAtExit: number | null;
  costOfLeaving: number | null;
  breakevenLabel: string | null;
}

interface VerdictBandProps {
  verdict: VerdictState;
  stats: VerdictStats;
  percentiles: MonteCarloPercentiles | null;
  onFocusMissing: () => void;
}

// Sentinel tokens swapped into a translated sentence, then replaced with a
// rendered `<Money>`. Private-use-area characters so they can never collide
// with real message content and need no regex escaping.
const AMOUNT_TOKEN = "";
const DELTA_TOKEN = "";
/** Converts a 0-1 win probability into a whole-number percentage. */
const PERCENT_MULTIPLIER = 100;
/** Shown for a stat that hasn't been computed yet. */
const EMPTY_STAT = "—";

/**
 * Splits a fully-interpolated translation on sentinel tokens and re-inserts
 * the given nodes in their place. The sentinels travel through `t()` as
 * plain strings so ICU argument order — and RTL word order in Arabic — is
 * resolved by next-intl before this ever touches the string. `t.rich`'s
 * function values are reserved for `<tag>chunks</tag>` elements and are
 * never invoked for plain `{argument}` placeholders, which is what this
 * catalog uses throughout; this sidesteps that instead of fighting it.
 */
function interpolate(template: string, replacements: Record<string, ReactNode>): ReactNode[] {
  const tokens = Object.keys(replacements);
  const pattern = new RegExp(`(${tokens.join("|")})`, "g");
  return template
    .split(pattern)
    .filter((part) => part !== "")
    .map((part, index) => (
      <Fragment key={index}>{part in replacements ? replacements[part] : part}</Fragment>
    ));
}

function formatProbability(value: number | null): ReactNode {
  return value === null ? EMPTY_STAT : `${Math.round(value * PERCENT_MULTIPLIER)}%`;
}

function formatMoneyStat(value: number | null): ReactNode {
  if (value === null) {
    return EMPTY_STAT;
  }
  return <Money value={value} signed className={value < 0 ? "text-loss" : undefined} />;
}

interface StatProps {
  label: string;
  value: ReactNode;
}

function Stat({ label, value }: StatProps) {
  return (
    <div>
      <dt className="text-annotation tracking-eyebrow text-xs">{label}</dt>
      <dd className="font-mono text-lg tabular-nums">{value}</dd>
    </div>
  );
}

/** Type of the translator returned by `useTranslations("verdict")`. */
type VerdictTranslator = ReturnType<typeof useTranslations<"verdict">>;

function renderSentence(verdict: VerdictState, t: VerdictTranslator): ReactNode {
  switch (verdict.kind) {
    case "incomplete":
      return t("incomplete", {
        field: t(`fields.${verdict.missingField}`),
        offer: verdict.offerName,
      });
    case "stay": {
      const template = t("stay", { offer: verdict.bestOfferName, amount: AMOUNT_TOKEN });
      return interpolate(template, {
        [AMOUNT_TOKEN]: <Money value={Math.abs(verdict.bestMedianNet)} className="text-loss" />,
      });
    }
    case "take-offer": {
      const runnerUp = verdict.runnersUp[0];
      if (!runnerUp) {
        const template = t("takeOffer", { offer: verdict.offerName, amount: AMOUNT_TOKEN });
        return interpolate(template, {
          [AMOUNT_TOKEN]: <Money value={verdict.medianNet} signed className="text-market" />,
        });
      }
      const template = t("takeOfferRanked", {
        offer: verdict.offerName,
        amount: AMOUNT_TOKEN,
        delta: DELTA_TOKEN,
        runnerUp: runnerUp.name,
      });
      return interpolate(template, {
        [AMOUNT_TOKEN]: <Money value={verdict.medianNet} signed className="text-market" />,
        [DELTA_TOKEN]: <Money value={runnerUp.delta} signed className="text-market" />,
      });
    }
  }
}

/**
 * The product's spine: a serif verdict sentence over a stat row and the
 * OutcomeBand. An incomplete verdict renders the sentence as a button that
 * focuses the missing field instead of stating a conclusion it can't reach.
 */
export function VerdictBand({ verdict, stats, percentiles, onFocusMissing }: VerdictBandProps) {
  const t = useTranslations("verdict");
  const sentence = renderSentence(verdict, t);
  const sentenceClassName = "font-serif text-4xl font-medium leading-tight text-balance";

  return (
    <section className="border-ink from-market-soft border-y bg-gradient-to-b to-transparent">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-center">
        <div className="flex-1">
          <div aria-live="polite">
            {verdict.kind === "incomplete" ? (
              <button
                type="button"
                onClick={onFocusMissing}
                className={`${sentenceClassName} text-start`}
              >
                {sentence}
              </button>
            ) : (
              <h2 className={sentenceClassName}>{sentence}</h2>
            )}
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Stat
              label={t("stats.probability")}
              value={formatProbability(stats.probabilityOfferWins)}
            />
            <Stat label={t("stats.equityAtExit")} value={formatMoneyStat(stats.equityAtExit)} />
            <Stat label={t("stats.costOfLeaving")} value={formatMoneyStat(stats.costOfLeaving)} />
            <Stat label={t("stats.breakeven")} value={stats.breakevenLabel ?? EMPTY_STAT} />
          </dl>
        </div>
        {percentiles ? (
          <div className="border-rule border-s ps-7">
            <OutcomeBand percentiles={percentiles} ariaLabel={t("outcomeRange")} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
