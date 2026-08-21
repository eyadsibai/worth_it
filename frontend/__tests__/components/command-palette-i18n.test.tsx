import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { CommandPalette } from "@/components/command-palette";
import ar from "@/messages/ar.json";

// Mock scrollIntoView for cmdk
Element.prototype.scrollIntoView = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("@/lib/store", () => ({
  useCommandPaletteOpen: () => true,
  useSetCommandPaletteOpen: () => vi.fn(),
}));

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="ar" messages={ar}>
      {ui}
    </NextIntlClientProvider>
  );
}

/**
 * Regression for I3: the palette's input placeholder, group headings, and
 * theme items were hardcoded English strings, invisible to `next-intl`
 * entirely — so switching to `/ar` still showed "Navigation", "Light Mode",
 * etc. This renders against the REAL `ar.json` catalog (not a test-local
 * lookup table) so a future edit to the catalog can't silently regress this.
 */
describe("CommandPalette under the real Arabic catalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("translates the input placeholder", async () => {
    wrap(<CommandPalette open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(ar.commandPalette.placeholder)).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("Type a command or search...")).not.toBeInTheDocument();
  });

  it("translates every group heading", async () => {
    wrap(<CommandPalette open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(ar.commandPalette.groups.navigation)).toBeInTheDocument();
      expect(screen.getByText(ar.commandPalette.groups.shortcuts)).toBeInTheDocument();
      expect(screen.getByText(ar.commandPalette.groups.theme)).toBeInTheDocument();
    });
    expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
    expect(screen.queryByText("Shortcuts")).not.toBeInTheDocument();
    expect(screen.queryByText("Theme")).not.toBeInTheDocument();
  });

  it("translates the theme items", async () => {
    wrap(<CommandPalette open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(ar.commandPalette.theme.light)).toBeInTheDocument();
      expect(screen.getByText(ar.commandPalette.theme.dark)).toBeInTheDocument();
      expect(screen.getByText(ar.commandPalette.theme.system)).toBeInTheDocument();
    });
    expect(screen.queryByText("Light Mode")).not.toBeInTheDocument();
    expect(screen.queryByText("Dark Mode")).not.toBeInTheDocument();
    expect(screen.queryByText("System Theme")).not.toBeInTheDocument();
  });

  /**
   * Regression for Minor 2 (final-fixes-rereview.md): `CommandDialog`'s
   * `title`/`description` props default to hardcoded English
   * ("Command Palette" / "Search for a command to run...") in
   * `components/ui/command.tsx`, and `CommandPalette` didn't override them —
   * so the dialog's `aria-labelledby`/`aria-describedby` resolved to English
   * even on `/ar`, announcing the palette in the wrong language to a screen
   * reader user.
   */
  it("gives the dialog a translated accessible name and description", async () => {
    wrap(<CommandPalette open={true} onOpenChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: ar.commandPalette.title })).toBeInTheDocument();
    });
    expect(screen.getByText(ar.commandPalette.description)).toBeInTheDocument();
    expect(screen.queryByText("Command Palette")).not.toBeInTheDocument();
    expect(screen.queryByText("Search for a command to run...")).not.toBeInTheDocument();
  });
});
