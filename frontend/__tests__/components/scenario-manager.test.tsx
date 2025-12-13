/**
 * Tests for ScenarioManager component
 * Following TDD - tests written first
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScenarioManager } from "@/components/cap-table/scenario-manager";
import type { CapTable, FundingInstrument, PreferenceTier, FounderScenario } from "@/lib/schemas";

// Mock scenario utilities
const mockLoadFounderScenarios = vi.fn();
const mockSaveFounderScenario = vi.fn();
const mockDeleteFounderScenario = vi.fn();
const mockCreateFounderScenario = vi.fn();
const mockExportFounderScenario = vi.fn();
const mockImportFounderScenario = vi.fn();

vi.mock("@/lib/scenario-utils", () => ({
  loadFounderScenarios: () => mockLoadFounderScenarios(),
  saveFounderScenario: (scenario: FounderScenario) => mockSaveFounderScenario(scenario),
  deleteFounderScenario: (id: string) => mockDeleteFounderScenario(id),
  createFounderScenario: (...args: unknown[]) => mockCreateFounderScenario(...args),
  exportFounderScenario: (scenario: FounderScenario) => mockExportFounderScenario(scenario),
  importFounderScenario: (file: File) => mockImportFounderScenario(file),
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

const mockPreferenceTiers: PreferenceTier[] = [];

const mockScenario: FounderScenario = {
  id: "test-scenario-1",
  name: "Test Scenario",
  description: "A test scenario",
  capTable: mockCapTable,
  instruments: mockInstruments,
  preferenceTiers: mockPreferenceTiers,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("ScenarioManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadFounderScenarios.mockReturnValue([]);
  });

  it("renders save button", () => {
    render(
      <ScenarioManager
        currentCapTable={mockCapTable}
        currentInstruments={mockInstruments}
        currentPreferenceTiers={mockPreferenceTiers}
        onLoadScenario={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("shows scenario name input when save is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ScenarioManager
        currentCapTable={mockCapTable}
        currentInstruments={mockInstruments}
        currentPreferenceTiers={mockPreferenceTiers}
        onLoadScenario={() => {}}
      />
    );

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(screen.getByPlaceholderText(/scenario name/i)).toBeInTheDocument();
  });

  it("saves scenario with provided name", async () => {
    const user = userEvent.setup();
    const newScenario = { ...mockScenario, id: "new-uuid" };
    mockCreateFounderScenario.mockReturnValue(newScenario);

    render(
      <ScenarioManager
        currentCapTable={mockCapTable}
        currentInstruments={mockInstruments}
        currentPreferenceTiers={mockPreferenceTiers}
        onLoadScenario={() => {}}
      />
    );

    await user.click(screen.getByRole("button", { name: /save/i }));
    await user.type(screen.getByPlaceholderText(/scenario name/i), "My Scenario");
    await user.click(screen.getByRole("button", { name: /confirm|save scenario/i }));

    expect(mockCreateFounderScenario).toHaveBeenCalledWith(
      "My Scenario",
      mockCapTable,
      mockInstruments,
      mockPreferenceTiers,
      undefined
    );
    expect(mockSaveFounderScenario).toHaveBeenCalledWith(newScenario);
  });

  it("displays list of saved scenarios", async () => {
    mockLoadFounderScenarios.mockReturnValue([mockScenario]);

    render(
      <ScenarioManager
        currentCapTable={mockCapTable}
        currentInstruments={mockInstruments}
        currentPreferenceTiers={mockPreferenceTiers}
        onLoadScenario={() => {}}
      />
    );

    expect(screen.getByText("Test Scenario")).toBeInTheDocument();
  });

  it("calls onLoadScenario when load button is clicked", async () => {
    const user = userEvent.setup();
    const onLoadScenario = vi.fn();
    mockLoadFounderScenarios.mockReturnValue([mockScenario]);

    render(
      <ScenarioManager
        currentCapTable={mockCapTable}
        currentInstruments={mockInstruments}
        currentPreferenceTiers={mockPreferenceTiers}
        onLoadScenario={onLoadScenario}
      />
    );

    await user.click(screen.getByRole("button", { name: /load/i }));

    expect(onLoadScenario).toHaveBeenCalledWith(mockScenario);
  });

  it("deletes scenario when delete button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    mockLoadFounderScenarios.mockReturnValue([mockScenario]);

    render(
      <ScenarioManager
        currentCapTable={mockCapTable}
        currentInstruments={mockInstruments}
        currentPreferenceTiers={mockPreferenceTiers}
        onLoadScenario={() => {}}
      />
    );

    // Click delete button to open confirmation dialog
    await user.click(screen.getByRole("button", { name: /delete test scenario/i }));

    // Wait for dialog and confirm
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(mockDeleteFounderScenario).toHaveBeenCalledWith(mockScenario.id);
  });

  it("exports scenario when export button is clicked", async () => {
    const user = userEvent.setup();
    mockLoadFounderScenarios.mockReturnValue([mockScenario]);

    render(
      <ScenarioManager
        currentCapTable={mockCapTable}
        currentInstruments={mockInstruments}
        currentPreferenceTiers={mockPreferenceTiers}
        onLoadScenario={() => {}}
      />
    );

    await user.click(screen.getByRole("button", { name: /export.*json/i }));

    expect(mockExportFounderScenario).toHaveBeenCalledWith(mockScenario);
  });

  it("shows empty state when no scenarios exist", () => {
    mockLoadFounderScenarios.mockReturnValue([]);

    render(
      <ScenarioManager
        currentCapTable={mockCapTable}
        currentInstruments={mockInstruments}
        currentPreferenceTiers={mockPreferenceTiers}
        onLoadScenario={() => {}}
      />
    );

    expect(screen.getByText(/no saved scenarios/i)).toBeInTheDocument();
  });

  it("refreshes scenario list after save", async () => {
    const user = userEvent.setup();
    const newScenario = { ...mockScenario, id: "new-uuid", name: "New Scenario" };
    mockCreateFounderScenario.mockReturnValue(newScenario);
    mockLoadFounderScenarios
      .mockReturnValueOnce([])
      .mockReturnValueOnce([newScenario]);

    render(
      <ScenarioManager
        currentCapTable={mockCapTable}
        currentInstruments={mockInstruments}
        currentPreferenceTiers={mockPreferenceTiers}
        onLoadScenario={() => {}}
      />
    );

    await user.click(screen.getByRole("button", { name: /save/i }));
    await user.type(screen.getByPlaceholderText(/scenario name/i), "New Scenario");
    await user.click(screen.getByRole("button", { name: /confirm|save scenario/i }));

    await waitFor(() => {
      expect(screen.getByText("New Scenario")).toBeInTheDocument();
    });
  });

  it("refreshes scenario list after delete", async () => {
    const user = userEvent.setup();
    mockLoadFounderScenarios
      .mockReturnValueOnce([mockScenario])
      .mockReturnValueOnce([]);

    render(
      <ScenarioManager
        currentCapTable={mockCapTable}
        currentInstruments={mockInstruments}
        currentPreferenceTiers={mockPreferenceTiers}
        onLoadScenario={() => {}}
      />
    );

    expect(screen.getByText("Test Scenario")).toBeInTheDocument();

    // Click delete button to open confirmation dialog
    await user.click(screen.getByRole("button", { name: /delete test scenario/i }));

    // Wait for dialog and confirm
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no saved scenarios/i)).toBeInTheDocument();
    });
  });
});
