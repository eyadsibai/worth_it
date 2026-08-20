import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { OutcomeBand } from "@/components/ledger/outcome-band";
import type { MonteCarloPercentiles } from "@/lib/schemas";

const wrap = (ui: React.ReactNode, locale = "en") =>
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      {ui}
    </NextIntlClientProvider>
  );

const percentiles: MonteCarloPercentiles = {
  p10: -82985,
  p25: -40185,
  p50: 22542,
  p75: 127215,
  p90: 289615,
};

describe("OutcomeBand", () => {
  it("renders as an image with the given aria label", () => {
    wrap(<OutcomeBand percentiles={percentiles} ariaLabel="Range of outcomes" />);
    expect(screen.getByRole("img", { name: "Range of outcomes" })).toBeInTheDocument();
  });

  it("shows the signed median at the center of the distribution", () => {
    wrap(<OutcomeBand percentiles={percentiles} ariaLabel="Range of outcomes" />);
    expect(screen.getByText("+$22,542")).toBeInTheDocument();
  });

  it("colors the median loss-red when every percentile is negative", () => {
    const allNegative: MonteCarloPercentiles = {
      p10: -300000,
      p25: -200000,
      p50: -100000,
      p75: -50000,
      p90: -10000,
    };
    wrap(<OutcomeBand percentiles={allNegative} ariaLabel="Range of outcomes" />);
    expect(screen.getByText("-$100,000")).toHaveClass("text-loss");
  });

  it("does not divide by zero when p10 equals p90", () => {
    const flat: MonteCarloPercentiles = { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
    wrap(<OutcomeBand percentiles={flat} ariaLabel="Range of outcomes" />);
    expect(screen.getByRole("img", { name: "Range of outcomes" })).toBeInTheDocument();
    expect(screen.getAllByText("$0").length).toBeGreaterThan(0);
  });
});
