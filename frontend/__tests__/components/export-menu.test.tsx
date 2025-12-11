/**
 * Tests for ExportMenu component
 * Following TDD - tests written first
 *
 * Note: Radix UI dropdown uses Portals which don't fully render in jsdom.
 * These tests verify component rendering and basic behavior.
 * Full E2E tests should cover the dropdown interactions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportMenu } from "@/components/cap-table/export-menu";
import type { CapTable, FundingInstrument, WaterfallDistribution } from "@/lib/schemas";

// Mock the export functions
const mockExportCapTableAsCSV = vi.fn();
const mockExportFundingHistoryAsCSV = vi.fn();
const mockExportExitScenariosAsCSV = vi.fn();
const mockExportCapTableAsPDF = vi.fn();

vi.mock("@/lib/export-utils", () => ({
  exportCapTableAsCSV: (...args: unknown[]) => mockExportCapTableAsCSV(...args),
  exportFundingHistoryAsCSV: (...args: unknown[]) => mockExportFundingHistoryAsCSV(...args),
  exportExitScenariosAsCSV: (...args: unknown[]) => mockExportExitScenariosAsCSV(...args),
  exportCapTableAsPDF: (...args: unknown[]) => mockExportCapTableAsPDF(...args),
}));

// Test data
const mockCapTable: CapTable = {
  stakeholders: [
    {
      id: "1",
      name: "Alice Founder",
      type: "founder",
      shares: 4000000,
      ownership_pct: 40,
      share_class: "common",
    },
  ],
  total_shares: 10000000,
  option_pool_pct: 10,
};

const mockInstruments: FundingInstrument[] = [
  {
    id: "safe1",
    type: "SAFE",
    investor_name: "Y Combinator",
    investment_amount: 500000,
    valuation_cap: 5000000,
    pro_rata_rights: true,
    mfn_clause: false,
    status: "outstanding",
  },
];

const mockWaterfall: WaterfallDistribution = {
  exit_valuation: 50000000,
  waterfall_steps: [],
  stakeholder_payouts: [],
  common_pct: 40,
  preferred_pct: 60,
};

describe("ExportMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders export button", () => {
    render(
      <ExportMenu
        capTable={mockCapTable}
        instruments={mockInstruments}
      />
    );

    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });

  it("export button has correct aria attributes for dropdown", () => {
    render(
      <ExportMenu
        capTable={mockCapTable}
        instruments={mockInstruments}
      />
    );

    const button = screen.getByRole("button", { name: /export/i });
    expect(button).toHaveAttribute("aria-haspopup", "menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("opens dropdown menu when clicked", async () => {
    const user = userEvent.setup();

    render(
      <ExportMenu
        capTable={mockCapTable}
        instruments={mockInstruments}
      />
    );

    const button = screen.getByRole("button", { name: /export/i });
    await user.click(button);

    // After click, aria-expanded should be true
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("calls exportCapTableAsCSV when Cap Table CSV menu item is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ExportMenu
        capTable={mockCapTable}
        instruments={mockInstruments}
      />
    );

    // Open menu
    await user.click(screen.getByRole("button", { name: /export/i }));

    // Find and click the Cap Table CSV option
    const menuItem = await screen.findByRole("menuitem", { name: /cap table.*csv/i });
    await user.click(menuItem);

    expect(mockExportCapTableAsCSV).toHaveBeenCalledWith(
      mockCapTable,
      expect.stringContaining("cap-table")
    );
  });

  it("calls exportFundingHistoryAsCSV when Funding History CSV menu item is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ExportMenu
        capTable={mockCapTable}
        instruments={mockInstruments}
      />
    );

    // Open menu
    await user.click(screen.getByRole("button", { name: /export/i }));

    // Find and click the Funding History CSV option
    const menuItem = await screen.findByRole("menuitem", { name: /funding.*csv/i });
    await user.click(menuItem);

    expect(mockExportFundingHistoryAsCSV).toHaveBeenCalledWith(
      mockInstruments,
      expect.stringContaining("funding")
    );
  });

  it("calls exportCapTableAsPDF when PDF menu item is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ExportMenu
        capTable={mockCapTable}
        instruments={mockInstruments}
        waterfall={mockWaterfall}
      />
    );

    // Open menu
    await user.click(screen.getByRole("button", { name: /export/i }));

    // Find and click the PDF option
    const menuItem = await screen.findByRole("menuitem", { name: /pdf/i });
    await user.click(menuItem);

    expect(mockExportCapTableAsPDF).toHaveBeenCalledWith(
      mockCapTable,
      mockInstruments,
      mockWaterfall
    );
  });

  it("shows exit scenarios option when valuations are provided", async () => {
    const user = userEvent.setup();

    render(
      <ExportMenu
        capTable={mockCapTable}
        instruments={mockInstruments}
        exitValuations={[10000000, 50000000, 100000000]}
      />
    );

    // Open menu
    await user.click(screen.getByRole("button", { name: /export/i }));

    // Exit scenarios option should be visible
    expect(await screen.findByRole("menuitem", { name: /exit.*csv/i })).toBeInTheDocument();
  });

  it("does not show exit scenarios option when valuations are not provided", async () => {
    const user = userEvent.setup();

    render(
      <ExportMenu
        capTable={mockCapTable}
        instruments={mockInstruments}
      />
    );

    // Open menu
    await user.click(screen.getByRole("button", { name: /export/i }));

    // Wait for menu to open and check exit scenarios is not there
    await screen.findByRole("menuitem", { name: /cap table.*csv/i });
    expect(screen.queryByRole("menuitem", { name: /exit.*csv/i })).not.toBeInTheDocument();
  });

  it("calls exportExitScenariosAsCSV when exit scenarios option is clicked", async () => {
    const user = userEvent.setup();
    const valuations = [10000000, 50000000, 100000000];

    render(
      <ExportMenu
        capTable={mockCapTable}
        instruments={mockInstruments}
        exitValuations={valuations}
      />
    );

    // Open menu
    await user.click(screen.getByRole("button", { name: /export/i }));

    // Click exit scenarios option
    const menuItem = await screen.findByRole("menuitem", { name: /exit.*csv/i });
    await user.click(menuItem);

    expect(mockExportExitScenariosAsCSV).toHaveBeenCalledWith(
      mockCapTable,
      valuations,
      expect.stringContaining("exit")
    );
  });

  it("is disabled when disabled prop is true", () => {
    render(
      <ExportMenu
        capTable={mockCapTable}
        instruments={mockInstruments}
        disabled
      />
    );

    expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
  });
});
