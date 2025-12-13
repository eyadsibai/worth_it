/**
 * Tests for ResponsiveTable component
 * Tests both mobile (card) and desktop (table) rendering modes
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ResponsiveTable,
  ResponsiveTableFooter,
  type Column,
} from "@/components/ui/responsive-table";

// Mock the useIsMobile hook
vi.mock("@/lib/hooks", () => ({
  useIsMobile: vi.fn(() => false),
}));

import { useIsMobile } from "@/lib/hooks";
const mockUseIsMobile = vi.mocked(useIsMobile);

interface TestData {
  id: string;
  name: string;
  value: number;
}

const testData: TestData[] = [
  { id: "1", name: "Item One", value: 100 },
  { id: "2", name: "Item Two", value: 200 },
  { id: "3", name: "Item Three", value: 300 },
];

const testColumns: Column<TestData>[] = [
  { key: "name", header: "Name", cell: (row) => row.name, primary: true },
  {
    key: "value",
    header: "Value",
    cell: (row) => `$${row.value}`,
    className: "text-right",
  },
];

describe("ResponsiveTable", () => {
  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Desktop (Table) Mode", () => {
    it("renders as a table on desktop", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("renders column headers", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Value" })).toBeInTheDocument();
    });

    it("renders all data rows", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      expect(screen.getByText("Item One")).toBeInTheDocument();
      expect(screen.getByText("Item Two")).toBeInTheDocument();
      expect(screen.getByText("Item Three")).toBeInTheDocument();
      expect(screen.getByText("$100")).toBeInTheDocument();
      expect(screen.getByText("$200")).toBeInTheDocument();
      expect(screen.getByText("$300")).toBeInTheDocument();
    });

    it("applies column className to cells", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      const cell = screen.getByText("$100").closest("td");
      expect(cell).toHaveClass("text-right");
    });

    it("applies rowClassName function to rows", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          rowClassName={(row) => (row.value > 150 ? "highlighted" : "")}
        />
      );

      const rows = screen.getAllByRole("row");
      // First row is header, so data rows start at index 1
      expect(rows[1]).not.toHaveClass("highlighted"); // 100
      expect(rows[2]).toHaveClass("highlighted"); // 200
      expect(rows[3]).toHaveClass("highlighted"); // 300
    });
  });

  describe("Mobile (Card) Mode", () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it("renders as cards on mobile", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Should render as a list, not a table
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByRole("list")).toBeInTheDocument();
    });

    it("renders list items with proper roles", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(3);
    });

    it("displays primary column prominently", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Primary column content should still be visible
      expect(screen.getByText("Item One")).toBeInTheDocument();
    });

    it("shows column headers as labels on mobile cards", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      // Value header should appear as label in card
      const valueLabels = screen.getAllByText("Value");
      expect(valueLabels.length).toBeGreaterThan(0);
    });

    it("hides columns with hideOnMobile flag", () => {
      const columnsWithHidden: Column<TestData>[] = [
        { key: "name", header: "Name", cell: (row) => row.name, primary: true },
        { key: "value", header: "Value", cell: (row) => `$${row.value}` },
        {
          key: "id",
          header: "ID",
          cell: (row) => row.id,
          hideOnMobile: true,
        },
      ];

      render(
        <ResponsiveTable
          data={testData}
          columns={columnsWithHidden}
          getRowKey={(row) => row.id}
        />
      );

      // ID column header should not appear on mobile
      expect(screen.queryByText("ID")).not.toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("shows default empty message when no data", () => {
      render(
        <ResponsiveTable
          data={[]}
          columns={testColumns}
          getRowKey={(row) => row.id}
        />
      );

      expect(screen.getByText("No data available")).toBeInTheDocument();
    });

    it("shows custom empty message when provided", () => {
      render(
        <ResponsiveTable
          data={[]}
          columns={testColumns}
          getRowKey={(row) => row.id}
          emptyMessage="No items found"
        />
      );

      expect(screen.getByText("No items found")).toBeInTheDocument();
    });
  });

  describe("Footer", () => {
    it("renders footer on desktop", () => {
      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          footer={<div data-testid="custom-footer">Total: 600</div>}
        />
      );

      expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
    });

    it("renders footer on mobile", () => {
      mockUseIsMobile.mockReturnValue(true);

      render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          footer={<div data-testid="custom-footer">Total: 600</div>}
        />
      );

      expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
    });
  });

  describe("Container className", () => {
    it("applies custom className on desktop", () => {
      const { container } = render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("applies custom className on mobile", () => {
      mockUseIsMobile.mockReturnValue(true);

      const { container } = render(
        <ResponsiveTable
          data={testData}
          columns={testColumns}
          getRowKey={(row) => row.id}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});

describe("ResponsiveTableFooter", () => {
  it("renders label-value pairs", () => {
    render(
      <ResponsiveTableFooter
        items={[
          { label: "Total", value: "$1,000" },
          { label: "Count", value: "5" },
        ]}
      />
    );

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$1,000")).toBeInTheDocument();
    expect(screen.getByText("Count")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("applies custom className to value elements", () => {
    render(
      <ResponsiveTableFooter
        items={[
          { label: "Positive", value: "+$500", className: "text-green-500" },
        ]}
      />
    );

    const valueElement = screen.getByText("+$500");
    expect(valueElement).toHaveClass("text-green-500");
  });

  it("uses label as key for stable rendering", () => {
    const { rerender } = render(
      <ResponsiveTableFooter
        items={[
          { label: "A", value: "1" },
          { label: "B", value: "2" },
        ]}
      />
    );

    // Rerender with same labels, different values
    rerender(
      <ResponsiveTableFooter
        items={[
          { label: "A", value: "10" },
          { label: "B", value: "20" },
        ]}
      />
    );

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("renders with React nodes as values", () => {
    render(
      <ResponsiveTableFooter
        items={[
          {
            label: "Status",
            value: <span data-testid="status-badge">Active</span>,
          },
        ]}
      />
    );

    expect(screen.getByTestId("status-badge")).toBeInTheDocument();
  });
});
