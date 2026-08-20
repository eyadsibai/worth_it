import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { WaterfallChapter } from "@/components/ledger/chapters/waterfall-chapter";
import en from "@/messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("WaterfallChapter", () => {
  it("renders the Chapter heading with the translated title", () => {
    wrap(<WaterfallChapter index="05" hasTiers={false} />);

    expect(
      screen.getByRole("heading", { level: 2, name: en.chapters.waterfall.title })
    ).toBeInTheDocument();
  });

  it("points the link at the Cap Table route when there are no tiers", () => {
    wrap(<WaterfallChapter index="05" hasTiers={false} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/cap-table");
    expect(screen.getByText(en.chapters.waterfall.noTiers)).toBeInTheDocument();
  });

  it("still points at the Cap Table route when tiers exist", () => {
    wrap(<WaterfallChapter index="05" hasTiers={true} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/cap-table");
    expect(screen.getByText(en.chapters.waterfall.hasTiers)).toBeInTheDocument();
  });
});
