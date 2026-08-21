"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTheme } from "next-themes";
import { Home, Info, Moon, Sun, Monitor, PieChart, Calculator, Languages } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandPaletteOpen, useSetCommandPaletteOpen } from "@/lib/store";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The other of the two supported locales — mirrors `Masthead`'s own helper of the same name. */
function otherLocale(locale: string): "en" | "ar" {
  return locale === "en" ? "ar" : "en";
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("commandPalette");
  const tMasthead = useTranslations("masthead");
  const { setTheme } = useTheme();

  const runCommand = React.useCallback(
    (command: () => void) => {
      // Execute command first, then close dialog for better UX
      // This ensures the command completes before the dialog disappears
      command();
      onOpenChange(false);
    },
    [onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <Home className="mr-2 h-4 w-4" />
            {t("goTo", { page: tMasthead("analysis") })}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/cap-table"))}>
            <PieChart className="mr-2 h-4 w-4" />
            {t("goTo", { page: tMasthead("capTable") })}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/valuation"))}>
            <Calculator className="mr-2 h-4 w-4" />
            {t("goTo", { page: tMasthead("valuation") })}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/about"))}>
            <Info className="mr-2 h-4 w-4" />
            {t("goTo", { page: tMasthead("about") })}
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => router.replace(pathname, { locale: otherLocale(locale) }))
            }
          >
            <Languages className="mr-2 h-4 w-4" />
            {t("switchLanguage")}
          </CommandItem>
        </CommandGroup>

        {/* Replaces the old Employee/Founder Mode commands, which drove the
            store's `appMode` flag — nothing reads that anymore now that
            founder mode is its own `/cap-table` route (ModeToggle is no
            longer rendered), so those commands could silently strand a user
            in a "mode" with no visible UI. These jump to the same two
            destinations directly, keeping the E/F muscle-memory shortcuts. */}
        <CommandGroup heading="Shortcuts">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <Home className="mr-2 h-4 w-4" />
            {tMasthead("analysis")}
            <CommandShortcut>E</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/cap-table"))}>
            <PieChart className="mr-2 h-4 w-4" />
            {tMasthead("capTable")}
            <CommandShortcut>F</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            Light Mode
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            Dark Mode
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <Monitor className="mr-2 h-4 w-4" />
            System Theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Hook to manage command palette state with keyboard shortcut.
 * Uses Zustand store for global state management, ensuring state is shared
 * across all components that use this hook.
 */
export function useCommandPalette() {
  const open = useCommandPaletteOpen();
  const setOpen = useSetCommandPaletteOpen();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  return { open, setOpen };
}
