import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { DilutionRoundFormComponent } from "@/components/forms/dilution-round-form";
import { DilutionRoundFormSchema } from "@/lib/schemas";

const TestSchema = z.object({
  dilution_rounds: z.array(DilutionRoundFormSchema),
});

type TestForm = z.infer<typeof TestSchema>;

const DEFAULT_ROUND: TestForm["dilution_rounds"][0] = {
  round_name: "Seed",
  round_type: "SAFE_NOTE",
  year: 1,
  enabled: true,
  dilution_pct: 15,
  pre_money_valuation: 8_000_000,
  amount_raised: 1_500_000,
  salary_change: 0,
  status: "upcoming",
  dilution_method: "percentage",
};

function TestWrapper({
  round = DEFAULT_ROUND,
}: {
  round?: TestForm["dilution_rounds"][0];
}) {
  const form = useForm<TestForm>({
    resolver: zodResolver(TestSchema) as unknown as undefined,
    defaultValues: {
      dilution_rounds: [round],
    },
  });

  return (
    <Form {...form}>
      <form>
        <DilutionRoundFormComponent
          form={form}
          roundIndex={0}
          roundName={round.round_name}
        />
      </form>
    </Form>
  );
}

describe("DilutionRoundFormComponent", () => {
  describe("method toggle rendering", () => {
    it("renders the dilution method radio toggle when round is enabled and settings open", async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      // Open settings
      await user.click(screen.getByRole("button", { name: /configure round/i }));

      expect(screen.getByText("Dilution Input Method")).toBeInTheDocument();
      expect(screen.getByLabelText("By Percentage")).toBeInTheDocument();
      expect(screen.getByLabelText("By Valuation")).toBeInTheDocument();
    });

    it("defaults to percentage mode", async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      await user.click(screen.getByRole("button", { name: /configure round/i }));

      const percentageRadio = screen.getByLabelText("By Percentage");
      expect(percentageRadio.closest("[data-state]")).toHaveAttribute("data-state", "checked");
    });
  });

  describe("percentage mode", () => {
    it("shows dilution slider in percentage mode", async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      await user.click(screen.getByRole("button", { name: /configure round/i }));

      expect(screen.getByText("Dilution %")).toBeInTheDocument();
    });

    it("does not show pre-money valuation or amount raised fields in percentage mode", async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      await user.click(screen.getByRole("button", { name: /configure round/i }));

      // In percentage mode, we should NOT see the valuation fields
      // The Pre-Money Valuation and Amount Raised fields should be hidden
      expect(screen.queryByText("Pre-Money Valuation")).not.toBeInTheDocument();
      expect(screen.queryByText("Amount Raised")).not.toBeInTheDocument();
    });
  });

  describe("valuation mode", () => {
    it("shows pre-money valuation and amount raised in valuation mode", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper round={{ ...DEFAULT_ROUND, dilution_method: "valuation" }} />
      );

      await user.click(screen.getByRole("button", { name: /configure round/i }));

      expect(screen.getByText("Pre-Money Valuation")).toBeInTheDocument();
      expect(screen.getByText("Amount Raised")).toBeInTheDocument();
    });

    it("shows computed dilution display in valuation mode", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper round={{ ...DEFAULT_ROUND, dilution_method: "valuation" }} />
      );

      await user.click(screen.getByRole("button", { name: /configure round/i }));

      expect(screen.getByText("Computed dilution:")).toBeInTheDocument();
    });

    it("hides the dilution slider in valuation mode", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper round={{ ...DEFAULT_ROUND, dilution_method: "valuation" }} />
      );

      await user.click(screen.getByRole("button", { name: /configure round/i }));

      // The "Dilution %" slider should not appear
      expect(screen.queryByText("Dilution %")).not.toBeInTheDocument();
    });
  });

  describe("mode switching", () => {
    it("switches from percentage to valuation mode", async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      await user.click(screen.getByRole("button", { name: /configure round/i }));

      // Initially in percentage mode
      expect(screen.getByText("Dilution %")).toBeInTheDocument();

      // Click "By Valuation" radio
      await user.click(screen.getByLabelText("By Valuation"));

      // Should now show valuation fields
      await waitFor(() => {
        expect(screen.getByText("Pre-Money Valuation")).toBeInTheDocument();
        expect(screen.getByText("Amount Raised")).toBeInTheDocument();
      });

      // Dilution slider should be gone
      expect(screen.queryByText("Dilution %")).not.toBeInTheDocument();
    });

    it("switches from valuation to percentage mode", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper round={{ ...DEFAULT_ROUND, dilution_method: "valuation" }} />
      );

      await user.click(screen.getByRole("button", { name: /configure round/i }));

      // Initially in valuation mode
      expect(screen.getByText("Pre-Money Valuation")).toBeInTheDocument();

      // Click "By Percentage" radio
      await user.click(screen.getByLabelText("By Percentage"));

      // Should now show dilution slider
      await waitFor(() => {
        expect(screen.getByText("Dilution %")).toBeInTheDocument();
      });

      // Valuation fields should be gone
      expect(screen.queryByText("Pre-Money Valuation")).not.toBeInTheDocument();
    });
  });

  describe("salary change visibility", () => {
    it("shows salary change field in percentage mode", async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      await user.click(screen.getByRole("button", { name: /configure round/i }));

      expect(screen.getByText("New Salary")).toBeInTheDocument();
    });

    it("shows salary change field in valuation mode", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper round={{ ...DEFAULT_ROUND, dilution_method: "valuation" }} />
      );

      await user.click(screen.getByRole("button", { name: /configure round/i }));

      expect(screen.getByText("New Salary")).toBeInTheDocument();
    });
  });

  describe("reactive dilution computation", () => {
    it("computes dilution_pct from pre-money valuation and amount raised", async () => {
      const user = userEvent.setup();

      // $8M pre-money + $1.5M raised = 1.5/9.5 ≈ 15.79%
      render(
        <TestWrapper
          round={{
            ...DEFAULT_ROUND,
            dilution_method: "valuation",
            pre_money_valuation: 8_000_000,
            amount_raised: 1_500_000,
            dilution_pct: 0,
          }}
        />
      );

      // Open settings panel first
      await user.click(screen.getByRole("button", { name: /configure round/i }));

      // The useEffect should compute and display the correct dilution
      await waitFor(() => {
        const computedDisplay = screen.getByTestId("round-0-computed-dilution");
        expect(computedDisplay).toHaveTextContent("15.8%");
      });
    });
  });
});
