import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { VestingChapter } from "@/components/ledger/chapters/vesting-chapter";
import type { MonthlyDataGridResponse } from "@/lib/schemas";
import en from "@/messages/en.json";

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

const EXIT_YEAR = 5;
const MONTHS_PER_YEAR = 12;

const monthlyData: MonthlyDataGridResponse = {
  data: Array.from({ length: EXIT_YEAR * MONTHS_PER_YEAR }, () => ({})),
};

describe("VestingChapter", () => {
  it("renders the Chapter heading with the translated title", () => {
    wrap(
      <VestingChapter
        index="01"
        monthlyData={monthlyData}
        vestingPeriod={4}
        cliffPeriod={1}
        exitYear={EXIT_YEAR}
      />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: en.chapters.vesting.title })
    ).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("renders an svg chart of the vesting schedule", () => {
    const { container } = wrap(
      <VestingChapter
        index="01"
        monthlyData={monthlyData}
        vestingPeriod={4}
        cliffPeriod={1}
        exitYear={EXIT_YEAR}
      />
    );

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders the cliff annotation text naming the cliff period", () => {
    wrap(
      <VestingChapter
        index="01"
        monthlyData={monthlyData}
        vestingPeriod={4}
        cliffPeriod={1}
        exitYear={EXIT_YEAR}
      />
    );

    expect(screen.getByText(/year 1/i)).toBeInTheDocument();
  });
});
