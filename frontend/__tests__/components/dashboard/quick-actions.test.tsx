import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QuickActions } from "@/components/dashboard/quick-actions";

describe("QuickActions", () => {
  const mockOnNewEmployeeAnalysis = vi.fn();
  const mockOnNewFounderAnalysis = vi.fn();
  const mockOnLoadExample = vi.fn();
  const mockOnCompareAll = vi.fn();
  const mockOnExportSummary = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    onNewEmployeeAnalysis: mockOnNewEmployeeAnalysis,
    onNewFounderAnalysis: mockOnNewFounderAnalysis,
    onLoadExample: mockOnLoadExample,
    hasScenarios: false,
  };

  it("renders title", () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  });

  it("renders New Job Analysis button", () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByText("New Job Analysis")).toBeInTheDocument();
    expect(screen.getByText("Compare offers")).toBeInTheDocument();
  });

  it("renders Cap Table button", () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByText("Cap Table")).toBeInTheDocument();
    expect(screen.getByText("Founder tools")).toBeInTheDocument();
  });

  it("renders Load Example button", () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByText("Load Example")).toBeInTheDocument();
    expect(screen.getByText("Try a demo")).toBeInTheDocument();
  });

  it("calls onNewEmployeeAnalysis when clicking New Job Analysis", () => {
    render(<QuickActions {...defaultProps} />);
    fireEvent.click(screen.getByText("New Job Analysis"));
    expect(mockOnNewEmployeeAnalysis).toHaveBeenCalled();
  });

  it("calls onNewFounderAnalysis when clicking Cap Table", () => {
    render(<QuickActions {...defaultProps} />);
    fireEvent.click(screen.getByText("Cap Table"));
    expect(mockOnNewFounderAnalysis).toHaveBeenCalled();
  });

  it("calls onLoadExample when clicking Load Example", () => {
    render(<QuickActions {...defaultProps} />);
    fireEvent.click(screen.getByText("Load Example"));
    expect(mockOnLoadExample).toHaveBeenCalled();
  });

  it("shows placeholder when no scenarios", () => {
    render(<QuickActions {...defaultProps} hasScenarios={false} />);
    expect(screen.getByText("More Actions")).toBeInTheDocument();
    expect(screen.getByText("Save scenarios first")).toBeInTheDocument();
  });

  it("shows Compare All button when hasScenarios and onCompareAll provided", () => {
    render(
      <QuickActions
        {...defaultProps}
        hasScenarios={true}
        onCompareAll={mockOnCompareAll}
      />
    );
    expect(screen.getByText("Compare All")).toBeInTheDocument();
    expect(screen.getByText("Side by side")).toBeInTheDocument();
  });

  it("calls onCompareAll when clicking Compare All", () => {
    render(
      <QuickActions
        {...defaultProps}
        hasScenarios={true}
        onCompareAll={mockOnCompareAll}
      />
    );
    fireEvent.click(screen.getByText("Compare All"));
    expect(mockOnCompareAll).toHaveBeenCalled();
  });

  it("does not show Compare All when hasScenarios but no onCompareAll", () => {
    render(
      <QuickActions
        {...defaultProps}
        hasScenarios={true}
      />
    );
    expect(screen.queryByText("Compare All")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <QuickActions {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
