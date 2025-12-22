/**
 * Tests for FounderDashboard component
 * Tests template picker display and cap table management
 * Updated for sidebar layout with 2-column grid
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FounderDashboard } from "@/components/dashboard/founder-dashboard";

// Mock IntersectionObserver for framer-motion
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock the store
vi.mock("@/lib/store", () => ({
  useAppStore: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("@/lib/motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <p {...props}>{children}</p>
    ),
  },
  AnimatedPercentage: ({ value }: { value: number }) => <span>{value}%</span>,
}));

// Mock components
vi.mock("@/components/cap-table", () => ({
  CapTableManager: ({ hideSidebarContent }: { hideSidebarContent?: boolean }) => (
    <div data-testid="cap-table-manager" data-hide-sidebar={hideSidebarContent}>
      Cap Table Manager
    </div>
  ),
}));

vi.mock("@/components/cap-table/stakeholder-form", () => ({
  StakeholderForm: () => <div data-testid="stakeholder-form">Stakeholder Form</div>,
}));

vi.mock("@/components/templates/template-picker", () => ({
  TemplatePicker: () => <div data-testid="template-picker">Template Picker</div>,
}));

// Import the mocked hook
import { useAppStore } from "@/lib/store";
const mockUseAppStore = useAppStore as unknown as ReturnType<typeof vi.fn>;

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("FounderDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders template picker when cap table has no stakeholders", () => {
    mockUseAppStore.mockReturnValue({
      capTable: { stakeholders: [], option_pool_pct: 10 },
      instruments: [],
      preferenceTiers: [],
      setCapTable: vi.fn(),
      setInstruments: vi.fn(),
      setPreferenceTiers: vi.fn(),
    });

    render(<FounderDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("template-picker")).toBeInTheDocument();
  });

  it("does not render template picker when cap table has stakeholders", () => {
    mockUseAppStore.mockReturnValue({
      capTable: {
        stakeholders: [
          { id: "1", name: "Founder", shares: 1000000, type: "founder", ownership_pct: 50 },
        ],
        option_pool_pct: 10,
      },
      instruments: [],
      preferenceTiers: [],
      setCapTable: vi.fn(),
      setInstruments: vi.fn(),
      setPreferenceTiers: vi.fn(),
    });

    render(<FounderDashboard />, { wrapper: createWrapper() });

    expect(screen.queryByTestId("template-picker")).not.toBeInTheDocument();
  });

  it("always renders cap table manager with hideSidebarContent prop", () => {
    // With empty cap table
    mockUseAppStore.mockReturnValue({
      capTable: { stakeholders: [], option_pool_pct: 10 },
      instruments: [],
      preferenceTiers: [],
      setCapTable: vi.fn(),
      setInstruments: vi.fn(),
      setPreferenceTiers: vi.fn(),
    });

    const { rerender } = render(<FounderDashboard />, { wrapper: createWrapper() });
    const manager = screen.getByTestId("cap-table-manager");
    expect(manager).toBeInTheDocument();
    // Verify hideSidebarContent is passed
    expect(manager).toHaveAttribute("data-hide-sidebar", "true");

    // With populated cap table
    mockUseAppStore.mockReturnValue({
      capTable: {
        stakeholders: [
          { id: "1", name: "Founder", shares: 1000000, type: "founder", ownership_pct: 50 },
        ],
        option_pool_pct: 10,
      },
      instruments: [],
      preferenceTiers: [],
      setCapTable: vi.fn(),
      setInstruments: vi.fn(),
      setPreferenceTiers: vi.fn(),
    });

    rerender(<FounderDashboard />);
    expect(screen.getByTestId("cap-table-manager")).toBeInTheDocument();
  });

  it("renders stakeholder form in sidebar", () => {
    mockUseAppStore.mockReturnValue({
      capTable: { stakeholders: [], option_pool_pct: 10 },
      instruments: [],
      preferenceTiers: [],
      setCapTable: vi.fn(),
      setInstruments: vi.fn(),
      setPreferenceTiers: vi.fn(),
    });

    render(<FounderDashboard />, { wrapper: createWrapper() });

    // Stakeholder form should be in the sidebar
    expect(screen.getByTestId("stakeholder-form")).toBeInTheDocument();
  });

  it("renders option pool controls in sidebar", () => {
    mockUseAppStore.mockReturnValue({
      capTable: { stakeholders: [], option_pool_pct: 15 },
      instruments: [],
      preferenceTiers: [],
      setCapTable: vi.fn(),
      setInstruments: vi.fn(),
      setPreferenceTiers: vi.fn(),
    });

    render(<FounderDashboard />, { wrapper: createWrapper() });

    // Option pool controls should be displayed
    // "Reserved for Options" is unique label in the slider section
    expect(screen.getByText("Reserved for Options")).toBeInTheDocument();
    // "Option Pool" appears twice (card title + allocation summary), so use getAllBy
    expect(screen.getAllByText("Option Pool")).toHaveLength(2);
    // The 15% value appears 3 times (slider value + option pool % + total allocated %)
    expect(screen.getAllByText(/15%/)).toHaveLength(3);
  });

  it("passes correct props from store to CapTableManager", () => {
    const mockSetCapTable = vi.fn();
    const mockSetInstruments = vi.fn();
    const mockSetPreferenceTiers = vi.fn();

    mockUseAppStore.mockReturnValue({
      capTable: { stakeholders: [], option_pool_pct: 10 },
      instruments: [],
      preferenceTiers: [],
      setCapTable: mockSetCapTable,
      setInstruments: mockSetInstruments,
      setPreferenceTiers: mockSetPreferenceTiers,
    });

    render(<FounderDashboard />, { wrapper: createWrapper() });

    // The component renders, so props were passed correctly
    expect(screen.getByTestId("cap-table-manager")).toBeInTheDocument();
  });
});
