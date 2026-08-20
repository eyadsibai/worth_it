import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { Money } from "@/components/ledger/money";

const wrap = (ui: React.ReactNode, locale = "en") =>
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      {ui}
    </NextIntlClientProvider>
  );

describe("Money", () => {
  it("renders a signed amount inside an LTR isolate", () => {
    wrap(<Money value={22542} signed />);
    const bdi = screen.getByText("+$22,542");
    expect(bdi.tagName).toBe("BDI");
    expect(bdi).toHaveAttribute("dir", "ltr");
  });

  it("renders an unsigned amount without a leading plus", () => {
    wrap(<Money value={82985} />);
    expect(screen.getByText("$82,985")).toBeInTheDocument();
  });

  it("applies mono tabular-nums styling", () => {
    wrap(<Money value={100} />);
    const bdi = screen.getByText("$100");
    expect(bdi).toHaveClass("font-mono", "tabular-nums");
  });

  it("merges a caller-supplied className", () => {
    wrap(<Money value={100} className="text-loss" />);
    expect(screen.getByText("$100")).toHaveClass("text-loss");
  });

  it("uses Western digits under the Arabic locale", () => {
    wrap(<Money value={22542} />, "ar");
    const bdi = screen.getByText(/22,542|22542/);
    expect(bdi.textContent).not.toMatch(/[٠-٩]/);
  });
});
