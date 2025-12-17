import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TemplatePicker } from "@/components/templates/template-picker";
import { EXAMPLE_SCENARIOS } from "@/lib/constants/examples";
import { FOUNDER_TEMPLATES } from "@/lib/constants/founder-templates";

// Mock the store
const mockLoadExample = vi.fn();
const mockLoadFounderTemplate = vi.fn();

vi.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: unknown) => unknown) => {
    const state = {
      loadExample: mockLoadExample,
      loadFounderTemplate: mockLoadFounderTemplate,
    };
    return selector(state);
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TemplatePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Employee mode", () => {
    it("renders employee templates", () => {
      render(<TemplatePicker mode="employee" />);

      // Should show all employee scenarios
      EXAMPLE_SCENARIOS.forEach((scenario) => {
        expect(screen.getByText(scenario.name)).toBeInTheDocument();
      });
    });

    it("shows template descriptions", () => {
      render(<TemplatePicker mode="employee" />);

      EXAMPLE_SCENARIOS.forEach((scenario) => {
        expect(screen.getByText(scenario.description)).toBeInTheDocument();
      });
    });

    it("calls loadExample when template is clicked", () => {
      render(<TemplatePicker mode="employee" />);

      const firstTemplate = screen.getByText(EXAMPLE_SCENARIOS[0].name);
      fireEvent.click(firstTemplate.closest("button")!);

      expect(mockLoadExample).toHaveBeenCalledWith(EXAMPLE_SCENARIOS[0].id);
    });

    it("shows header with mode label", () => {
      render(<TemplatePicker mode="employee" />);

      expect(screen.getByText(/start from a template/i)).toBeInTheDocument();
    });
  });

  describe("Founder mode", () => {
    it("renders founder templates", () => {
      render(<TemplatePicker mode="founder" />);

      // Should show all founder templates
      FOUNDER_TEMPLATES.forEach((template) => {
        expect(screen.getByText(template.name)).toBeInTheDocument();
      });
    });

    it("shows template descriptions", () => {
      render(<TemplatePicker mode="founder" />);

      FOUNDER_TEMPLATES.forEach((template) => {
        expect(screen.getByText(template.description)).toBeInTheDocument();
      });
    });

    it("calls loadFounderTemplate when template is clicked", () => {
      render(<TemplatePicker mode="founder" />);

      const firstTemplate = screen.getByText(FOUNDER_TEMPLATES[0].name);
      fireEvent.click(firstTemplate.closest("button")!);

      expect(mockLoadFounderTemplate).toHaveBeenCalledWith(FOUNDER_TEMPLATES[0].id);
    });
  });

  describe("Accessibility", () => {
    it("has accessible button labels", () => {
      render(<TemplatePicker mode="employee" />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      // Each button should be accessible
      buttons.forEach((button) => {
        expect(button).toBeVisible();
      });
    });

    it("supports keyboard navigation", () => {
      render(<TemplatePicker mode="employee" />);

      const firstButton = screen.getAllByRole("button")[0];
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });
  });
});
