"use client";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { renderHook, act } from "@testing-library/react";

// Mock scrollIntoView for cmdk
Element.prototype.scrollIntoView = vi.fn();

// Mock @/i18n/navigation (the locale-aware router the palette now uses)
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/",
}));

// Mock next-intl translations (commandPalette + masthead namespaces the
// palette reads from) — same lookup-table convention as header.test.tsx.
const commandPaletteMessages: Record<string, string> = {
  goTo: "Go to {page}",
  switchLanguage: "Switch language",
};
const mastheadMessages: Record<string, string> = {
  analysis: "Analysis",
  capTable: "Cap Table",
  valuation: "Valuation",
  about: "About",
};
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const dict = namespace === "commandPalette" ? commandPaletteMessages : mastheadMessages;
    return (key: string, values?: Record<string, string>) => {
      const template = dict[key] ?? key;
      if (!values) return template;
      return Object.entries(values).reduce(
        (result, [placeholder, value]) => result.replaceAll(`{${placeholder}}`, value),
        template
      );
    };
  },
  useLocale: () => "en",
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
const mockSetCommandPaletteOpen = vi.fn();
let mockCommandPaletteOpen = false;

vi.mock("@/lib/store", () => ({
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
        expect(screen.getByText("Shortcuts")).toBeInTheDocument();
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

    it("navigates to Cap Table page", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Go to Cap Table")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Go to Cap Table"));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/cap-table");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("navigates to Valuation page", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Go to Valuation")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Go to Valuation"));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/valuation");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("language commands", () => {
    it("switches the current path to the other locale", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Switch language")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Switch language"));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/", { locale: "ar" });
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("shortcut commands", () => {
    // The old Employee/Founder Mode commands drove `appMode`, a store flag
    // nothing in the UI reads anymore now that founder mode is its own
    // `/cap-table` route (ModeToggle is no longer rendered) — leaving them in
    // place would let the palette silently strand a user in a mode with no
    // visible way out. They're replaced with quick E/F-shortcut jumps to the
    // same two destinations the Navigation group already lists verbosely.
    it("jumps to Analysis on E", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Analysis")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Analysis"));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("jumps to Cap Table on F", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Cap Table")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Cap Table"));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/cap-table");
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
    it("displays keyboard shortcuts for the shortcut commands", async () => {
      render(<CommandPalette open={true} onOpenChange={() => {}} />);

      await waitFor(() => {
        // Check that the Analysis command has the E shortcut
        const analysisCommand = screen.getByText("Analysis").closest("[cmdk-item]");
        expect(analysisCommand).toBeInTheDocument();
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
