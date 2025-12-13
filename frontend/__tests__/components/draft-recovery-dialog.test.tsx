/**
 * Tests for DraftRecoveryDialog component
 * Following TDD - tests written first
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DraftRecoveryDialog } from "@/components/draft-recovery-dialog";
import type { DraftData } from "@/lib/hooks/use-draft-auto-save";

describe("DraftRecoveryDialog", () => {
  const mockDraft: DraftData = {
    data: {
      globalSettings: { exit_year: 2028 },
      currentJob: { monthly_salary: 12000 },
      equityDetails: {
        equity_type: "RSU" as const,
        monthly_salary: 10000,
        total_equity_grant_pct: 0.5,
        vesting_period: 4,
        cliff_period: 1,
        exit_valuation: 100000000,
        simulate_dilution: false,
      },
    },
    savedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open is true", () => {
    render(
      <DraftRecoveryDialog
        open={true}
        draft={mockDraft}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/resume where you left off/i)).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <DraftRecoveryDialog
        open={false}
        draft={mockDraft}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("displays time since save", () => {
    render(
      <DraftRecoveryDialog
        open={true}
        draft={mockDraft}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    // Should show relative time like "5 minutes ago"
    expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument();
  });

  it("displays draft summary", () => {
    render(
      <DraftRecoveryDialog
        open={true}
        draft={mockDraft}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    // Should show some summary of the saved data
    expect(screen.getByText(/\$12,000/)).toBeInTheDocument(); // Current job salary
    expect(screen.getByText(/0\.5%/)).toBeInTheDocument(); // Equity percentage
  });

  it("calls onRestore when Restore Draft is clicked", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();

    render(
      <DraftRecoveryDialog
        open={true}
        draft={mockDraft}
        onRestore={onRestore}
        onDiscard={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /restore draft/i }));

    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it("calls onDiscard when Discard is clicked", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();

    render(
      <DraftRecoveryDialog
        open={true}
        draft={mockDraft}
        onRestore={vi.fn()}
        onDiscard={onDiscard}
      />
    );

    await user.click(screen.getByRole("button", { name: /discard/i }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("handles draft with stock options equity type", () => {
    const stockOptionsDraft: DraftData = {
      data: {
        globalSettings: { exit_year: 2030 },
        currentJob: { monthly_salary: 15000 },
        equityDetails: {
          equity_type: "STOCK_OPTIONS" as const,
          monthly_salary: 12000,
          num_options: 50000,
          strike_price: 1.5,
          exit_price_per_share: 10,
          vesting_period: 4,
          cliff_period: 1,
        },
      },
      savedAt: new Date().toISOString(),
    };

    render(
      <DraftRecoveryDialog
        open={true}
        draft={stockOptionsDraft}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    expect(screen.getByText(/50,000 options/i)).toBeInTheDocument();
  });

  it("handles partial draft data gracefully", () => {
    const partialDraft: DraftData = {
      data: {
        globalSettings: { exit_year: 2028 },
        currentJob: null,
        equityDetails: null,
      },
      savedAt: new Date().toISOString(),
    };

    render(
      <DraftRecoveryDialog
        open={true}
        draft={partialDraft}
        onRestore={vi.fn()}
        onDiscard={vi.fn()}
      />
    );

    expect(screen.getByText(/exit year: 2028/i)).toBeInTheDocument();
  });
});
