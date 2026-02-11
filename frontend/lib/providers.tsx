"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { WalkthroughProvider } from "@/lib/walkthrough";
import { WalkthroughOverlay } from "@/components/walkthrough";

/** Default stale time for queries (1 minute in ms) */
const DEFAULT_STALE_TIME_MS = 60000;

function CommandPaletteWrapper() {
  const { open, setOpen } = useCommandPalette();
  return <CommandPalette open={open} onOpenChange={setOpen} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: DEFAULT_STALE_TIME_MS,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <WalkthroughProvider>
          {children}
          <WalkthroughOverlay />
          <CommandPaletteWrapper />
        </WalkthroughProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
