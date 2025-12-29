/**
 * Tests for IndustrySelector component
 * Following TDD - tests written first
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IndustrySelector } from "@/components/valuation/industry-selector";

// Mock the API client hooks
vi.mock("@/lib/api-client", () => ({
  useListIndustries: vi.fn(),
  useIndustryBenchmark: vi.fn(),
}));

import { useListIndustries, useIndustryBenchmark } from "@/lib/api-client";
const mockUseListIndustries = useListIndustries as unknown as ReturnType<typeof vi.fn>;
const mockUseIndustryBenchmark = useIndustryBenchmark as unknown as ReturnType<typeof vi.fn>;

// Test data
const mockIndustries = [
  { code: "saas", name: "SaaS / Software" },
  { code: "fintech", name: "Fintech" },
  { code: "ecommerce", name: "E-Commerce / Retail" },
];

const mockBenchmark = {
  code: "saas",
  name: "SaaS / Software",
  description: "Software-as-a-Service companies",
  metrics: {
    revenue_multiple: {
      name: "revenue_multiple",
      min_value: 1.0,
      typical_low: 4.0,
      median: 6.0,
      typical_high: 12.0,
      max_value: 25.0,
      unit: "x",
    },
    discount_rate: {
      name: "discount_rate",
      min_value: 0.12,
      typical_low: 0.18,
      median: 0.25,
      typical_high: 0.35,
      max_value: 0.5,
      unit: "",
    },
  },
};

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("IndustrySelector", () => {
  const mockOnChange = vi.fn();
  const mockOnBenchmarksLoaded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock returns
    mockUseListIndustries.mockReturnValue({
      data: mockIndustries,
      isLoading: false,
      error: null,
    });

    mockUseIndustryBenchmark.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  it("renders select with placeholder", () => {
    render(<IndustrySelector value={null} onChange={mockOnChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Select your industry")).toBeInTheDocument();
  });

  // Note: Full dropdown open/selection is tested in E2E tests due to Radix Portal limitations in jsdom
  it("has correct accessibility attributes", () => {
    render(<IndustrySelector value={null} onChange={mockOnChange} />, {
      wrapper: createWrapper(),
    });

    const combobox = screen.getByRole("combobox");
    expect(combobox).toHaveAttribute("aria-autocomplete", "none");
  });

  it("displays loading state while fetching industries", () => {
    mockUseListIndustries.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<IndustrySelector value={null} onChange={mockOnChange} />, {
      wrapper: createWrapper(),
    });

    // The component should still render with the select disabled during loading
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows benchmark details when industry is selected", async () => {
    mockUseIndustryBenchmark.mockReturnValue({
      data: mockBenchmark,
      isLoading: false,
      error: null,
    });

    render(<IndustrySelector value="saas" onChange={mockOnChange} showBenchmarkDetails />, {
      wrapper: createWrapper(),
    });

    // Check benchmark details are shown
    await waitFor(() => {
      expect(screen.getByText("SaaS / Software Benchmarks")).toBeInTheDocument();
      expect(screen.getByText("Revenue Multiple")).toBeInTheDocument();
      expect(screen.getByText("Discount Rate")).toBeInTheDocument();
    });
  });

  it("calls onBenchmarksLoaded when benchmarks are loaded", async () => {
    mockUseIndustryBenchmark.mockReturnValue({
      data: mockBenchmark,
      isLoading: false,
      error: null,
    });

    render(
      <IndustrySelector
        value="saas"
        onChange={mockOnChange}
        onBenchmarksLoaded={mockOnBenchmarksLoaded}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockOnBenchmarksLoaded).toHaveBeenCalledWith(mockBenchmark.metrics);
    });
  });

  it("does not show benchmark details when showBenchmarkDetails is false", () => {
    mockUseIndustryBenchmark.mockReturnValue({
      data: mockBenchmark,
      isLoading: false,
      error: null,
    });

    render(<IndustrySelector value="saas" onChange={mockOnChange} showBenchmarkDetails={false} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByText("SaaS / Software Benchmarks")).not.toBeInTheDocument();
  });

  it("formats percentage metrics correctly", async () => {
    mockUseIndustryBenchmark.mockReturnValue({
      data: mockBenchmark,
      isLoading: false,
      error: null,
    });

    render(<IndustrySelector value="saas" onChange={mockOnChange} showBenchmarkDetails />, {
      wrapper: createWrapper(),
    });

    // Discount rate should be formatted as percentage (18% - 35%)
    await waitFor(() => {
      expect(screen.getByText("18% - 35%")).toBeInTheDocument();
    });
  });

  it("formats multiplier metrics correctly", async () => {
    mockUseIndustryBenchmark.mockReturnValue({
      data: mockBenchmark,
      isLoading: false,
      error: null,
    });

    render(<IndustrySelector value="saas" onChange={mockOnChange} showBenchmarkDetails />, {
      wrapper: createWrapper(),
    });

    // Revenue multiple should be formatted with x (4x - 12x)
    await waitFor(() => {
      expect(screen.getByText("4x - 12x")).toBeInTheDocument();
    });
  });

  it("shows loading indicator while fetching benchmark", () => {
    mockUseIndustryBenchmark.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<IndustrySelector value="saas" onChange={mockOnChange} showBenchmarkDetails />, {
      wrapper: createWrapper(),
    });

    // Should show loading state (using aria-busy or similar)
    expect(screen.getByTestId("benchmark-loading")).toBeInTheDocument();
  });

  it("renders with the correct selected value", () => {
    render(<IndustrySelector value="fintech" onChange={mockOnChange} />, {
      wrapper: createWrapper(),
    });

    // The select should show the selected industry name
    expect(screen.getByRole("combobox")).toHaveTextContent("Fintech");
  });
});
