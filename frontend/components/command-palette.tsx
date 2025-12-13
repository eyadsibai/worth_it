"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  Info,
  Moon,
  Sun,
  Monitor,
  Users,
  Briefcase,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useAppStore, useCommandPaletteOpen, useSetCommandPaletteOpen } from "@/lib/store";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { setAppMode } = useAppStore();

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
          <CommandItem
            onSelect={() => runCommand(() => router.push("/"))}
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Analysis
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/about"))}
          >
            <Info className="mr-2 h-4 w-4" />
            Go to About
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Mode">
          <CommandItem
            onSelect={() => runCommand(() => setAppMode("employee"))}
          >
            <Briefcase className="mr-2 h-4 w-4" />
            Employee Mode
            <CommandShortcut>E</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => setAppMode("founder"))}
          >
            <Users className="mr-2 h-4 w-4" />
            Founder Mode
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
