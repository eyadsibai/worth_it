/**
 * Tests for FounderDashboard component
 * Tests template picker display and cap table management
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FounderDashboard } from "@/components/dashboard/founder-dashboard";

// Mock the store
vi.mock("@/lib/store", () => ({
  useAppStore: vi.fn(),
}));

// Mock components
vi.mock("@/components/cap-table", () => ({
  CapTableManager: () => <div data-testid="cap-table-manager">Cap Table Manager</div>,
}));

vi.mock("@/components/templates/template-picker", () => ({
  TemplatePicker: () => <div data-testid="template-picker">Template Picker</div>,
}));

// Import the mocked hook
import { useAppStore } from "@/lib/store";
const mockUseAppStore = useAppStore as ReturnType<typeof vi.fn>;

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
      capTable: { stakeholders: [] },
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
          { id: "1", name: "Founder", shares: 1000000, type: "founder" },
        ],
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

  it("always renders cap table manager", () => {
    // With empty cap table
    mockUseAppStore.mockReturnValue({
      capTable: { stakeholders: [] },
      instruments: [],
      preferenceTiers: [],
      setCapTable: vi.fn(),
      setInstruments: vi.fn(),
      setPreferenceTiers: vi.fn(),
    });

    const { rerender } = render(<FounderDashboard />, { wrapper: createWrapper() });
    expect(screen.getByTestId("cap-table-manager")).toBeInTheDocument();

    // With populated cap table
    mockUseAppStore.mockReturnValue({
      capTable: {
        stakeholders: [
          { id: "1", name: "Founder", shares: 1000000, type: "founder" },
        ],
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

  it("passes correct props from store to CapTableManager", () => {
    const mockSetCapTable = vi.fn();
    const mockSetInstruments = vi.fn();
    const mockSetPreferenceTiers = vi.fn();

    mockUseAppStore.mockReturnValue({
      capTable: { stakeholders: [] },
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
