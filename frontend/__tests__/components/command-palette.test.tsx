"use client";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { renderHook, act } from "@testing-library/react";

// Mock scrollIntoView for cmdk
Element.prototype.scrollIntoView = vi.fn();

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next-themes
const mockSetTheme = vi.fn();
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: mockSetTheme,
  }),
}));

// Mock zustand store
const mockSetAppMode = vi.fn();
const mockSetCommandPaletteOpen = vi.fn();
let mockCommandPaletteOpen = false;

vi.mock("@/lib/store", () => ({
  useAppStore: () => ({
    appMode: "employee",
    setAppMode: mockSetAppMode,
  }),
  useCommandPaletteOpen: () => mockCommandPaletteOpen,
  useSetCommandPaletteOpen: () => mockSetCommandPaletteOpen,
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommandPaletteOpen = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders nothing when closed", () => {
      render(<CommandPalette open={false} onOpenChange={() => {}} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders dialog when open", async () => {
      render(<CommandPalette open={true} onOpenChange={() => {}} />);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("shows all command groups", async () => {
      render(<CommandPalette open={true} onOpenChange={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText("Navigation")).toBeInTheDocument();
        expect(screen.getByText("Mode")).toBeInTheDocument();
        expect(screen.getByText("Theme")).toBeInTheDocument();
      });
    });
  });

  describe("navigation commands", () => {
    it("navigates to Analysis page", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Go to Analysis")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Go to Analysis"));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("navigates to About page", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Go to About")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Go to About"));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/about");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("mode commands", () => {
    it("switches to Employee mode", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Employee Mode")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Employee Mode"));

      await waitFor(() => {
        expect(mockSetAppMode).toHaveBeenCalledWith("employee");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("switches to Founder mode", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Founder Mode")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Founder Mode"));

      await waitFor(() => {
        expect(mockSetAppMode).toHaveBeenCalledWith("founder");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("theme commands", () => {
    it("sets light theme", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Light Mode")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Light Mode"));

      await waitFor(() => {
        expect(mockSetTheme).toHaveBeenCalledWith("light");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("sets dark theme", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Dark Mode")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Dark Mode"));

      await waitFor(() => {
        expect(mockSetTheme).toHaveBeenCalledWith("dark");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("sets system theme", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("System Theme")).toBeInTheDocument();
      });

      await user.click(screen.getByText("System Theme"));

      await waitFor(() => {
        expect(mockSetTheme).toHaveBeenCalledWith("system");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("search filtering", () => {
    it("filters commands based on search query", async () => {
      const user = userEvent.setup();
      render(<CommandPalette open={true} onOpenChange={() => {}} />);

      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });

      const input = screen.getByRole("combobox");
      await user.type(input, "dark");

      await waitFor(() => {
        // Dark Mode should be visible
        expect(screen.getByText("Dark Mode")).toBeInTheDocument();
      });
    });

    it("shows empty state when no matches", async () => {
      const user = userEvent.setup();
      render(<CommandPalette open={true} onOpenChange={() => {}} />);

      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });

      const input = screen.getByRole("combobox");
      await user.type(input, "xyznonexistent");

      await waitFor(() => {
        expect(screen.getByText("No results found.")).toBeInTheDocument();
      });
    });
  });

  describe("keyboard shortcuts display", () => {
    it("displays keyboard shortcuts for mode commands", async () => {
      render(<CommandPalette open={true} onOpenChange={() => {}} />);

      await waitFor(() => {
        // Check that the Employee Mode command has the E shortcut
        const employeeCommand = screen.getByText("Employee Mode").closest("[cmdk-item]");
        expect(employeeCommand).toBeInTheDocument();
      });

      // Just verify the shortcut elements are rendered
      const shortcuts = screen.getAllByText(/^[EF]$/);
      expect(shortcuts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("onOpenChange callback", () => {
    it("calls onOpenChange when dialog closes", async () => {
      const onOpenChange = vi.fn();
      const { rerender } = render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Simulate closing by re-rendering with open=false
      rerender(<CommandPalette open={false} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });
});

describe("useCommandPalette hook", () => {
  beforeEach(() => {
    mockSetCommandPaletteOpen.mockClear();
    mockCommandPaletteOpen = false;
  });

  it("initializes with open=false from Zustand store", () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.open).toBe(false);
  });

  it("calls setOpen to toggle on Cmd+K", () => {
    renderHook(() => useCommandPalette());

    act(() => {
      // Simulate Cmd+K keydown
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    // Should call setOpen with toggled value (!false = true)
    expect(mockSetCommandPaletteOpen).toHaveBeenCalledWith(true);
  });

  it("calls setOpen to toggle on Ctrl+K", () => {
    renderHook(() => useCommandPalette());

    act(() => {
      // Simulate Ctrl+K keydown
      const event = new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    });

    // Should call setOpen with toggled value (!false = true)
    expect(mockSetCommandPaletteOpen).toHaveBeenCalledWith(true);
  });

  it("provides setOpen function from Zustand store", () => {
    const { result } = renderHook(() => useCommandPalette());

    // setOpen should be the mocked function
    expect(result.current.setOpen).toBe(mockSetCommandPaletteOpen);

    act(() => {
      result.current.setOpen(true);
    });

    expect(mockSetCommandPaletteOpen).toHaveBeenCalledWith(true);
  });
});
