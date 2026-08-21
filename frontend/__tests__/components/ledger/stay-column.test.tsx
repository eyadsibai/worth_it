import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { StayColumn } from "@/components/ledger/stay-column";
import { useAppStore } from "@/lib/store";
import en from "@/messages/en.json";

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  useAppStore.setState({ currentJob: null, globalSettings: null });
});

describe("StayColumn", () => {
  it("renders 'Stay' as an h2, a peer of OfferColumn under the page h1 (not a skipped h3)", () => {
    wrap(<StayColumn />);

    const heading = screen.getByRole("heading", { level: 2, name: "Stay" });
    expect(heading.tagName).toBe("H2");
  });

  it("renders the monthly salary, annual raise, and surplus ROI fields with translated labels", () => {
    wrap(<StayColumn />);

    expect(screen.getByRole("textbox", { name: /Monthly salary/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Annual raise/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Surplus ROI/i })).toBeInTheDocument();
  });

  it("calls the store's setCurrentJob when the salary field is edited", async () => {
    // zustand's internal actions close over the `set` reference captured at
    // store creation, not the `api.setState` property (see vanilla.mjs), so
    // `vi.spyOn(useAppStore, "setState")` can never observe a write an action
    // like `setCurrentJob` triggers. Assert against real state instead,
    // matching the convention in __tests__/lib/store-offers.test.ts.
    const user = userEvent.setup();
    wrap(<StayColumn />);

    const input = screen.getByRole("textbox", { name: /Monthly salary/i });
    await user.type(input, "9000");
    await user.tab();

    expect(useAppStore.getState().currentJob?.monthly_salary).toBe(9000);
  });

  it("seeds the untouched fields with their defaults on the first edit", async () => {
    const user = userEvent.setup();
    wrap(<StayColumn />);

    const input = screen.getByRole("textbox", { name: /Monthly salary/i });
    await user.type(input, "9000");
    await user.tab();

    const { currentJob } = useAppStore.getState();
    expect(currentJob?.annual_salary_growth_rate).toBe(3);
    expect(currentJob?.assumed_annual_roi).toBe(5.4);
    expect(currentJob?.investment_frequency).toBe("Monthly");
  });

  it("switches the investment frequency and persists it to the store", async () => {
    const user = userEvent.setup();
    wrap(<StayColumn />);

    await user.click(screen.getByRole("button", { name: "Annually" }));

    expect(useAppStore.getState().currentJob?.investment_frequency).toBe("Annually");
    expect(screen.getByRole("button", { name: "Annually" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("shows an em dash for take-home when no value is available yet", () => {
    wrap(<StayColumn />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders the take-home figure once it is supplied", () => {
    wrap(<StayColumn takeHomeOverHorizon={42000} />);

    expect(screen.getByText("$42,000")).toBeInTheDocument();
  });
});
