"use client";

import * as React from "react";

interface SidebarContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const value = React.useMemo(
    () => ({ isOpen, setIsOpen, toggle }),
    [isOpen, toggle]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext);
  // Return a no-op implementation if used outside provider
  // This allows components like Header to be used standalone
  if (!context) {
    return {
      isOpen: false,
      setIsOpen: () => {},
      toggle: () => {},
    };
  }
  return context;
}
