import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { VerdictBand } from "@/components/ledger/verdict-band";
import type { VerdictState } from "@/lib/ledger/verdict";
import type { MonteCarloPercentiles } from "@/lib/schemas";
import en from "@/messages/en.json";

const wrap = (ui: React.ReactNode, locale = "en", messages: Record<string, unknown> = en) =>
  render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );

const emptyStats = {
  probabilityOfferWins: null,
  equityAtExit: null,
  costOfLeaving: null,
  breakevenLabel: null,
};

const percentiles: MonteCarloPercentiles = {
  p10: -82985,
  p25: -40185,
  p50: 22542,
  p75: 127215,
  p90: 289615,
};

describe("VerdictBand", () => {
  it("renders the take-offer sentence with a signed amount inside a <bdi>", () => {
    const verdict: VerdictState = {
      kind: "take-offer",
      offerName: "Atlas",
      medianNet: 22542,
      runnersUp: [],
    };
    wrap(
      <VerdictBand
        verdict={verdict}
        stats={emptyStats}
        percentiles={null}
        onFocusMissing={vi.fn()}
      />
    );
    const bdi = screen.getByText("+$22,542");
    expect(bdi.tagName).toBe("BDI");
    expect(bdi.closest("h2")).not.toBeNull();
  });

  it("carries aria-live=polite on the sentence area", () => {
    const verdict: VerdictState = {
      kind: "take-offer",
      offerName: "Atlas",
      medianNet: 22542,
      runnersUp: [],
    };
    wrap(
      <VerdictBand
        verdict={verdict}
        stats={emptyStats}
        percentiles={null}
        onFocusMissing={vi.fn()}
      />
    );
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("names the runner-up and its delta when ranking multiple offers", () => {
    const verdict: VerdictState = {
      kind: "take-offer",
      offerName: "Atlas",
      medianNet: 22542,
      runnersUp: [{ name: "Borealis", delta: 9100 }],
    };
    wrap(
      <VerdictBand
        verdict={verdict}
        stats={emptyStats}
        percentiles={null}
        onFocusMissing={vi.fn()}
      />
    );
    expect(screen.getByText("+$22,542")).toBeInTheDocument();
    expect(screen.getByText("+$9,100")).toBeInTheDocument();
    expect(screen.getByText(/Borealis/)).toBeInTheDocument();
  });

  it("renders the stay sentence with a loss-colored shortfall", () => {
    const verdict: VerdictState = { kind: "stay", bestOfferName: "Atlas", bestMedianNet: -5000 };
    wrap(
      <VerdictBand
        verdict={verdict}
        stats={emptyStats}
        percentiles={null}
        onFocusMissing={vi.fn()}
      />
    );
    const amount = screen.getByText("$5,000");
    expect(amount.tagName).toBe("BDI");
    expect(amount).toHaveClass("text-loss");
  });

  it("renders the incomplete sentence as a button that fires onFocusMissing on click", async () => {
    const onFocusMissing = vi.fn();
    const verdict: VerdictState = {
      kind: "incomplete",
      offerName: "Atlas",
      missingField: "equity",
    };
    wrap(
      <VerdictBand
        verdict={verdict}
        stats={emptyStats}
        percentiles={null}
        onFocusMissing={onFocusMissing}
      />
    );
    const button = screen.getByRole("button", { name: /equity grant/i });
    button.click();
    expect(onFocusMissing).toHaveBeenCalledTimes(1);
  });

  it("omits the OutcomeBand region when percentiles is null", () => {
    const verdict: VerdictState = { kind: "stay", bestOfferName: "Atlas", bestMedianNet: -5000 };
    wrap(
      <VerdictBand
        verdict={verdict}
        stats={emptyStats}
        percentiles={null}
        onFocusMissing={vi.fn()}
      />
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the OutcomeBand when percentiles are provided", () => {
    const verdict: VerdictState = { kind: "stay", bestOfferName: "Atlas", bestMedianNet: -5000 };
    wrap(
      <VerdictBand
        verdict={verdict}
        stats={emptyStats}
        percentiles={percentiles}
        onFocusMissing={vi.fn()}
      />
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders an em dash placeholder for null stats", () => {
    const verdict: VerdictState = { kind: "stay", bestOfferName: "Atlas", bestMedianNet: -5000 };
    wrap(
      <VerdictBand
        verdict={verdict}
        stats={emptyStats}
        percentiles={null}
        onFocusMissing={vi.fn()}
      />
    );
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });

  it("renders a computed probability as a percentage and money stats with loss color when negative", () => {
    const verdict: VerdictState = { kind: "stay", bestOfferName: "Atlas", bestMedianNet: -5000 };
    wrap(
      <VerdictBand
        verdict={verdict}
        stats={{
          probabilityOfferWins: 0.62,
          equityAtExit: 40000,
          costOfLeaving: -12000,
          breakevenLabel: "Year 3",
        }}
        percentiles={null}
        onFocusMissing={vi.fn()}
      />
    );
    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(screen.getByText("Year 3")).toBeInTheDocument();
    const cost = screen.getByText("-$12,000");
    expect(cost).toHaveClass("text-loss");
  });

  it("uses Western digits under the Arabic locale", () => {
    const verdict: VerdictState = {
      kind: "take-offer",
      offerName: "أطلس",
      medianNet: 22542,
      runnersUp: [],
    };
    wrap(
      <VerdictBand
        verdict={verdict}
        stats={emptyStats}
        percentiles={null}
        onFocusMissing={vi.fn()}
      />,
      "ar",
      { verdict: (en as { verdict: Record<string, unknown> }).verdict }
    );
    const bdi = screen.getByText(/22,542|22542/);
    expect(bdi.textContent).not.toMatch(/[٠-٩]/);
  });
});
