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

/** Reads the `left` inline style of an element as a bare number of pixels. */
function leftPx(element: HTMLElement): number {
  return parseFloat(element.style.left);
}

describe("OutcomeBand", () => {
  it("renders as an image with the given aria label", () => {
    wrap(<OutcomeBand percentiles={percentiles} ariaLabel="Range of outcomes" />);
    expect(screen.getByRole("img", { name: "Range of outcomes" })).toBeInTheDocument();
  });

  it("shows the signed median at the center of the distribution", () => {
    wrap(<OutcomeBand percentiles={percentiles} ariaLabel="Range of outcomes" />);
    expect(screen.getByText("+$22,542")).toBeInTheDocument();
  });

  it("signs every label, not just the median — sign never rides on color alone", () => {
    wrap(<OutcomeBand percentiles={percentiles} ariaLabel="Range of outcomes" />);
    expect(screen.getByText("-$82,985")).toBeInTheDocument();
    expect(screen.getByText("+$22,542")).toBeInTheDocument();
    expect(screen.getByText("+$289,615")).toBeInTheDocument();
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
    expect(screen.getAllByText("$0")).toHaveLength(3);
  });

  it("renders a zero tick when the range straddles zero", () => {
    wrap(<OutcomeBand percentiles={percentiles} ariaLabel="Range of outcomes" />);
    expect(screen.getByTestId("zero-tick")).toBeInTheDocument();
  });

  it("omits the zero tick when the entire range is positive", () => {
    const allPositive: MonteCarloPercentiles = {
      p10: 10000,
      p25: 20000,
      p50: 30000,
      p75: 40000,
      p90: 50000,
    };
    wrap(<OutcomeBand percentiles={allPositive} ariaLabel="Range of outcomes" />);
    expect(screen.queryByTestId("zero-tick")).not.toBeInTheDocument();
  });

  it("orders the label positions left-to-right as p10 < p50 < p90", () => {
    wrap(<OutcomeBand percentiles={percentiles} ariaLabel="Range of outcomes" />);
    const x10 = leftPx(screen.getByTestId("label-p10"));
    const x50 = leftPx(screen.getByTestId("label-median"));
    const x90 = leftPx(screen.getByTestId("label-p90"));
    expect(x10).toBeLessThan(x50);
    expect(x50).toBeLessThan(x90);
  });
});
