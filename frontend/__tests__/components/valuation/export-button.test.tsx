import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExportButton } from "@/components/valuation/export-button";

// Mock the API client hooks
vi.mock("@/lib/api-client", () => ({
  useExportFirstChicago: vi.fn(),
  useExportPreRevenue: vi.fn(),
}));

import { useExportFirstChicago, useExportPreRevenue } from "@/lib/api-client";

describe("ExportButton", () => {
  const mockExportFirstChicago = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockExportPreRevenue = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockBlob = new Blob(["test content"], { type: "application/pdf" });

  const defaultProps = {
    companyName: "Test Company",
    methodType: "first-chicago" as const,
    result: { valuation: 1000000 },
    params: { discount_rate: 0.25 },
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(useExportFirstChicago).mockReturnValue(
      mockExportFirstChicago as unknown as ReturnType<typeof useExportFirstChicago>
    );
    vi.mocked(useExportPreRevenue).mockReturnValue(
      mockExportPreRevenue as unknown as ReturnType<typeof useExportPreRevenue>
    );
    mockExportFirstChicago.mutateAsync.mockResolvedValue(mockBlob);
    mockExportPreRevenue.mutateAsync.mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ExportButton {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe("Rendering", () => {
    it("renders export button with correct text", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
    });

    it("renders download icon by default", () => {
      renderComponent();
      const button = screen.getByRole("button", { name: /export/i });
      expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("is disabled when disabled prop is true", () => {
      renderComponent({ disabled: true });
      expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
    });
  });

  describe("Dropdown Menu", () => {
    it("shows format options when clicked", async () => {
      const user = userEvent.setup();
      renderComponent();

      const button = screen.getByRole("button", { name: /export/i });
      await user.click(button);

      // Radix UI renders menu content in a portal, so we need to wait for it
      expect(await screen.findByRole("menuitem", { name: /pdf report/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /json data/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /csv spreadsheet/i })).toBeInTheDocument();
    });
  });

  describe("Export Functionality", () => {
    it("calls exportFirstChicago when methodType is first-chicago", async () => {
      const user = userEvent.setup();
      renderComponent({ methodType: "first-chicago" });

      const button = screen.getByRole("button", { name: /export/i });
      await user.click(button);

      const pdfOption = await screen.findByRole("menuitem", { name: /pdf report/i });
      await user.click(pdfOption);

      await waitFor(() => {
        expect(mockExportFirstChicago.mutateAsync).toHaveBeenCalledWith({
          company_name: "Test Company",
          format: "pdf",
          result: { valuation: 1000000 },
          params: { discount_rate: 0.25 },
          industry: undefined,
          monte_carlo_result: undefined,
        });
      });
    });

    it("calls exportPreRevenue when methodType is pre-revenue", async () => {
      const user = userEvent.setup();
      renderComponent({
        methodType: "pre-revenue",
        methodName: "Berkus Method",
      });

      const button = screen.getByRole("button", { name: /export/i });
      await user.click(button);

      const jsonOption = await screen.findByRole("menuitem", { name: /json data/i });
      await user.click(jsonOption);

      await waitFor(() => {
        expect(mockExportPreRevenue.mutateAsync).toHaveBeenCalledWith({
          company_name: "Test Company",
          format: "json",
          method_name: "Berkus Method",
          result: { valuation: 1000000 },
          params: { discount_rate: 0.25 },
          industry: undefined,
        });
      });
    });

    it("exports CSV format correctly", async () => {
      const user = userEvent.setup();
      renderComponent();

      const button = screen.getByRole("button", { name: /export/i });
      await user.click(button);

      const csvOption = await screen.findByRole("menuitem", { name: /csv spreadsheet/i });
      await user.click(csvOption);

      await waitFor(() => {
        expect(mockExportFirstChicago.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ format: "csv" })
        );
      });
    });

    it("includes industry when provided", async () => {
      const user = userEvent.setup();
      renderComponent({ industry: "saas" });

      const button = screen.getByRole("button", { name: /export/i });
      await user.click(button);

      const pdfOption = await screen.findByRole("menuitem", { name: /pdf report/i });
      await user.click(pdfOption);

      await waitFor(() => {
        expect(mockExportFirstChicago.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ industry: "saas" })
        );
      });
    });

    it("includes monte carlo result when provided", async () => {
      const user = userEvent.setup();
      const monteCarloResult = { mean: 1000000, std_dev: 100000 };
      renderComponent({ monteCarloResult });

      const button = screen.getByRole("button", { name: /export/i });
      await user.click(button);

      const pdfOption = await screen.findByRole("menuitem", { name: /pdf report/i });
      await user.click(pdfOption);

      await waitFor(() => {
        expect(mockExportFirstChicago.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ monte_carlo_result: monteCarloResult })
        );
      });
    });

    it("creates object URL for blob download on successful export", async () => {
      const user = userEvent.setup();
      renderComponent();

      const button = screen.getByRole("button", { name: /export/i });
      await user.click(button);

      const pdfOption = await screen.findByRole("menuitem", { name: /pdf report/i });
      await user.click(pdfOption);

      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
      });
    });
  });

  describe("Loading State", () => {
    it("shows loading spinner when export is pending", () => {
      vi.mocked(useExportFirstChicago).mockReturnValue({
        ...mockExportFirstChicago,
        isPending: true,
      } as unknown as ReturnType<typeof useExportFirstChicago>);

      renderComponent();

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      // Check for the animate-spin class on the loader icon
      expect(button.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("is disabled while export is in progress", () => {
      vi.mocked(useExportPreRevenue).mockReturnValue({
        ...mockExportPreRevenue,
        isPending: true,
      } as unknown as ReturnType<typeof useExportPreRevenue>);

      renderComponent({ methodType: "pre-revenue" });

      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("Error Handling", () => {
    it("handles export error gracefully", async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockExportFirstChicago.mutateAsync.mockRejectedValue(new Error("Export failed"));

      renderComponent();

      const button = screen.getByRole("button", { name: /export/i });
      await user.click(button);

      const pdfOption = await screen.findByRole("menuitem", { name: /pdf report/i });
      await user.click(pdfOption);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith("Export failed:", expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it("re-enables button after export error", async () => {
      const user = userEvent.setup();
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockExportFirstChicago.mutateAsync.mockRejectedValue(new Error("Export failed"));

      renderComponent();

      const button = screen.getByRole("button", { name: /export/i });
      await user.click(button);

      const pdfOption = await screen.findByRole("menuitem", { name: /pdf report/i });
      await user.click(pdfOption);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /export/i })).not.toBeDisabled();
      });
    });
  });
});
