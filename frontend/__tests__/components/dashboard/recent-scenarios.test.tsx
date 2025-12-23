import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecentScenarios } from "@/components/dashboard/recent-scenarios";

describe("RecentScenarios", () => {
  const mockOnLoadScenario = vi.fn();
  const mockOnViewAll = vi.fn();

  const mockScenarios = [
    {
      type: "employee" as const,
      id: "emp-1",
      name: "Startup Alpha",
      timestamp: new Date().toISOString(),
      isWorthIt: true,
      netBenefit: 50000,
    },
    {
      type: "founder" as const,
      id: "founder-1",
      name: "My Startup",
      updatedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      stakeholderCount: 5,
      totalFunding: 1000000,
    },
    {
      type: "employee" as const,
      id: "emp-2",
      name: "BigCorp Offer",
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      isWorthIt: false,
      netBenefit: -25000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title", () => {
    render(<RecentScenarios scenarios={mockScenarios} onLoadScenario={mockOnLoadScenario} />);
    expect(screen.getByText("Recent Scenarios")).toBeInTheDocument();
  });

  it("displays empty state when no scenarios", () => {
    render(<RecentScenarios scenarios={[]} onLoadScenario={mockOnLoadScenario} />);
    expect(screen.getByText("No recent scenarios")).toBeInTheDocument();
    expect(screen.getByText("Your saved work will appear here.")).toBeInTheDocument();
  });

  it("renders scenario names", () => {
    render(<RecentScenarios scenarios={mockScenarios} onLoadScenario={mockOnLoadScenario} />);
    expect(screen.getByText("Startup Alpha")).toBeInTheDocument();
    expect(screen.getByText("My Startup")).toBeInTheDocument();
    expect(screen.getByText("BigCorp Offer")).toBeInTheDocument();
  });

  it("shows worth it badge for positive employee scenarios", () => {
    render(<RecentScenarios scenarios={mockScenarios} onLoadScenario={mockOnLoadScenario} />);
    expect(screen.getByText("Worth it")).toBeInTheDocument();
    expect(screen.getByText("Not worth it")).toBeInTheDocument();
  });

  it("displays net benefit for employee scenarios", () => {
    render(<RecentScenarios scenarios={mockScenarios} onLoadScenario={mockOnLoadScenario} />);
    expect(screen.getByText("+$50,000")).toBeInTheDocument();
    expect(screen.getByText("-$25,000")).toBeInTheDocument();
  });

  it("displays stakeholder count for founder scenarios", () => {
    render(<RecentScenarios scenarios={mockScenarios} onLoadScenario={mockOnLoadScenario} />);
    expect(screen.getByText("5 stakeholders")).toBeInTheDocument();
  });

  it("calls onLoadScenario when clicking a scenario", () => {
    render(<RecentScenarios scenarios={mockScenarios} onLoadScenario={mockOnLoadScenario} />);
    fireEvent.click(screen.getByText("Startup Alpha"));
    expect(mockOnLoadScenario).toHaveBeenCalledWith("emp-1", "employee");
  });

  it("respects maxItems prop", () => {
    render(
      <RecentScenarios scenarios={mockScenarios} onLoadScenario={mockOnLoadScenario} maxItems={2} />
    );
    expect(screen.getByText("Startup Alpha")).toBeInTheDocument();
    expect(screen.getByText("My Startup")).toBeInTheDocument();
    expect(screen.queryByText("BigCorp Offer")).not.toBeInTheDocument();
  });

  it("shows View All button when scenarios exceed maxItems", () => {
    render(
      <RecentScenarios
        scenarios={mockScenarios}
        onLoadScenario={mockOnLoadScenario}
        onViewAll={mockOnViewAll}
        maxItems={2}
      />
    );
    const viewAllButton = screen.getByText("View All");
    expect(viewAllButton).toBeInTheDocument();
    fireEvent.click(viewAllButton);
    expect(mockOnViewAll).toHaveBeenCalled();
  });

  it("does not show View All button when scenarios fit", () => {
    render(
      <RecentScenarios
        scenarios={mockScenarios}
        onLoadScenario={mockOnLoadScenario}
        onViewAll={mockOnViewAll}
        maxItems={5}
      />
    );
    expect(screen.queryByText("View All")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <RecentScenarios
        scenarios={mockScenarios}
        onLoadScenario={mockOnLoadScenario}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
