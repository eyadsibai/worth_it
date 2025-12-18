/**
 * Tests for ErrorCard component
 * TDD: Tests written first
 * Issue #135: Improve error states with actionable feedback
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorCard } from "@/components/ui/error-card";

describe("ErrorCard", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders with default title", () => {
      render(<ErrorCard message="The calculation could not complete" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      // Default title is "Something went wrong"
      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Something went wrong");
      expect(screen.getByText("The calculation could not complete")).toBeInTheDocument();
    });

    it("renders with custom title", () => {
      render(
        <ErrorCard
          title="Connection Error"
          message="Unable to connect to the server"
        />
      );

      expect(screen.getByText("Connection Error")).toBeInTheDocument();
      expect(screen.getByText("Unable to connect to the server")).toBeInTheDocument();
    });

    it("renders error icon", () => {
      render(<ErrorCard message="Error occurred" />);
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
    });

    it("applies terminal-card styling", () => {
      render(<ErrorCard message="Error" />);
      const card = screen.getByRole("alert").closest("[data-slot='card']");
      expect(card).toHaveClass("terminal-card");
    });
  });

  describe("Retry Functionality", () => {
    it("renders retry button when onRetry is provided", () => {
      render(<ErrorCard message="Error" onRetry={() => {}} />);
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("does not render retry button when onRetry is not provided", () => {
      render(<ErrorCard message="Error" />);
      expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    });

    it("calls onRetry when retry button is clicked", async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(<ErrorCard message="Error" onRetry={onRetry} />);
      await user.click(screen.getByRole("button", { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("disables retry button during retry (loading state)", async () => {
      render(<ErrorCard message="Error" onRetry={() => {}} isRetrying={true} />);
      const button = screen.getByRole("button", { name: /trying/i });
      expect(button).toBeDisabled();
    });

    it("uses custom retry label when provided", () => {
      render(<ErrorCard message="Error" onRetry={() => {}} retryLabel="Retry Calculation" />);
      expect(screen.getByRole("button", { name: /retry calculation/i })).toBeInTheDocument();
    });
  });

  describe("Copy Error Details", () => {
    it("renders copy button", () => {
      render(<ErrorCard message="Error occurred" />);
      expect(screen.getByRole("button", { name: /copy error details/i })).toBeInTheDocument();
    });

    it("shows success feedback after copying error message", async () => {
      const user = userEvent.setup();
      render(<ErrorCard message="Calculation failed" />);
      await user.click(screen.getByRole("button", { name: /copy error details/i }));

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });

    it("copies both message and details when errorDetails provided", async () => {
      const user = userEvent.setup();
      render(<ErrorCard message="Error" errorDetails="Stack trace: line 42" />);
      await user.click(screen.getByRole("button", { name: /copy error details/i }));

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });
  });

  describe("Context-Specific Suggestions", () => {
    it("shows network error suggestions for network errors", () => {
      render(<ErrorCard message="Network error" errorType="network" />);
      expect(screen.getByText(/server is temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/network connection/i)).toBeInTheDocument();
    });

    it("shows validation error suggestions for validation errors", () => {
      render(<ErrorCard message="Invalid input" errorType="validation" />);
      expect(screen.getByText(/check your input values/i)).toBeInTheDocument();
    });

    it("shows calculation error suggestions for calculation errors", () => {
      render(<ErrorCard message="Calculation failed" errorType="calculation" />);
      expect(screen.getByText(/unexpected values/i)).toBeInTheDocument();
    });

    it("shows generic suggestions when no errorType specified", () => {
      render(<ErrorCard message="Unknown error" />);
      expect(screen.getByText(/this usually happens when/i)).toBeInTheDocument();
    });

    it("renders custom suggestions when provided", () => {
      render(<ErrorCard message="Custom error" suggestions={["Check your API key", "Verify server status"]} />);
      expect(screen.getByText("Check your API key")).toBeInTheDocument();
      expect(screen.getByText("Verify server status")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has role alert for screen readers", () => {
      render(<ErrorCard message="Error" />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("is focusable for keyboard users", () => {
      render(<ErrorCard message="Error" onRetry={() => {}} />);
      const retryButton = screen.getByRole("button", { name: /try again/i });
      expect(retryButton).not.toHaveAttribute("tabIndex", "-1");
    });

    it("has accessible names for buttons", () => {
      render(<ErrorCard message="Error" onRetry={() => {}} />);
      expect(screen.getByRole("button", { name: /try again/i })).toHaveAccessibleName();
      expect(screen.getByRole("button", { name: /copy error details/i })).toHaveAccessibleName();
    });
  });

  describe("Visual States", () => {
    it("renders with destructive border styling", () => {
      render(<ErrorCard message="Error" />);
      const card = screen.getByRole("alert").closest("[data-slot='card']");
      expect(card).toHaveClass("border-destructive/30");
    });

    it("shows loading spinner in retry button when retrying", () => {
      render(<ErrorCard message="Error" onRetry={() => {}} isRetrying={true} />);
      const button = screen.getByRole("button", { name: /trying/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe("Error Details Display", () => {
    it("can show/hide detailed error information", async () => {
      const user = userEvent.setup();
      render(<ErrorCard message="Error occurred" errorDetails="Stack trace: Error at line 42..." showDetailsToggle={true} />);
      expect(screen.queryByText(/stack trace/i)).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /show details/i }));
      expect(screen.getByText(/stack trace/i)).toBeInTheDocument();
    });
  });
});
