import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CapTableWizard } from "@/components/cap-table/wizard";

describe("CapTableWizard", () => {
  const mockOnComplete = vi.fn();
  const mockOnSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Render", () => {
    it("renders the wizard with founders step first", () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      expect(screen.getByText(/who are the founders/i)).toBeInTheDocument();
      expect(screen.getByText(/step 1/i)).toBeInTheDocument();
    });

    it("shows skip wizard button", () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      expect(screen.getByRole("button", { name: /skip wizard/i })).toBeInTheDocument();
    });

    it("shows progress indicator", () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
  });

  describe("Skip Wizard", () => {
    it("calls onSkip when skip wizard button is clicked", () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      fireEvent.click(screen.getByRole("button", { name: /skip wizard/i }));

      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe("Navigation", () => {
    it("disables back button on first step", () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const backButton = screen.queryByRole("button", { name: /back/i });
      // Back button should not exist or be disabled on first step
      if (backButton) {
        expect(backButton).toBeDisabled();
      }
    });

    it("shows next button on first step", () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });
  });

  describe("Step Progression", () => {
    it("advances to option pool step when founders step is completed", async () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      // Fill in founder names (the default has 2 founders at 50% each)
      const nameInputs = screen.getAllByPlaceholderText(/founder name/i);
      fireEvent.change(nameInputs[0], { target: { value: "John Doe" } });
      fireEvent.change(nameInputs[1], { target: { value: "Jane Smith" } });

      // Click next
      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      // Should now be on option pool step (use findBy* to wait for animation)
      expect(await screen.findByText(/reserve equity/i)).toBeInTheDocument();
      expect(screen.getByText(/step 2/i)).toBeInTheDocument();
    });
  });

  describe("Data Persistence", () => {
    it("preserves founder data when navigating back", async () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      // Fill in founder names
      const nameInputs = screen.getAllByPlaceholderText(/founder name/i);
      fireEvent.change(nameInputs[0], { target: { value: "John Doe" } });
      fireEvent.change(nameInputs[1], { target: { value: "Jane Smith" } });

      // Go to next step
      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      // Wait for option pool step to render
      await screen.findByText(/reserve equity/i);

      // Go back
      fireEvent.click(screen.getByRole("button", { name: /back/i }));

      // Wait for founders step to render and verify names are preserved
      const updatedInputs = await screen.findAllByPlaceholderText(/founder name/i);
      expect(updatedInputs[0]).toHaveValue("John Doe");
      expect(updatedInputs[1]).toHaveValue("Jane Smith");
    });
  });

  describe("Share derivation", () => {
    /**
     * The waterfall engine distributes proceeds strictly by `shares / total_shares`.
     * A wizard-built cap table that ships `shares: 0` pays every founder nothing,
     * so the wizard must translate ownership percentages into real share counts.
     */
    async function completeWizard() {
      const nameInputs = screen.getAllByPlaceholderText(/founder name/i);
      fireEvent.change(nameInputs[0], { target: { value: "John Doe" } });
      fireEvent.change(nameInputs[1], { target: { value: "Jane Smith" } });
      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      await screen.findByText(/reserve equity/i);
      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      await screen.findByText(/do you have any advisors/i);
      fireEvent.click(screen.getByRole("button", { name: /yes, add advisors/i }));

      const advisorInput = await screen.findByPlaceholderText(/advisor name/i);
      fireEvent.change(advisorInput, { target: { value: "Ada Advisor" } });
      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      await screen.findByText(/have you raised any money/i);
      fireEvent.click(screen.getByRole("button", { name: /no, skip this/i }));

      fireEvent.click(await screen.findByRole("button", { name: /view your cap table/i }));

      return mockOnComplete.mock.calls[0][0] as import("@/lib/schemas").CapTable;
    }

    it("derives founder shares from their ownership percentage", async () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const capTable = await completeWizard();

      const john = capTable.stakeholders.find((s) => s.name === "John Doe");
      const jane = capTable.stakeholders.find((s) => s.name === "Jane Smith");
      expect(john?.shares).toBe(5_000_000);
      expect(jane?.shares).toBe(5_000_000);
    });

    it("derives advisor shares and their vesting total from ownership too", async () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const capTable = await completeWizard();

      const advisor = capTable.stakeholders.find((s) => s.name === "Ada Advisor");
      expect(advisor?.shares).toBe(50_000);
      expect(advisor?.vesting?.total_shares).toBe(50_000);
      expect(advisor?.vesting?.vested_shares).toBe(0);
    });

    it("produces non-zero pro-rata payouts for every stakeholder it creates", async () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const capTable = await completeWizard();

      // Mirror the backend engine: payout = shares / total_shares * exit_valuation
      const exit = 100_000_000;
      for (const stakeholder of capTable.stakeholders) {
        expect((stakeholder.shares / capTable.total_shares) * exit).toBeGreaterThan(0);
      }
    });
  });

  describe("Accessibility", () => {
    it("has accessible step indicator", () => {
      render(<CapTableWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuenow");
      expect(progressbar).toHaveAttribute("aria-valuemin", "0");
      expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    });
  });
});
