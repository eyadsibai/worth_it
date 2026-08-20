import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Chapter } from "@/components/ledger/chapter";

describe("Chapter", () => {
  it("renders a discoverable section with a serif h2 and a mono index", () => {
    render(
      <Chapter index="01" title="The Offer">
        <p>Body content</p>
      </Chapter>
    );

    const heading = screen.getByRole("heading", { level: 2, name: "The Offer" });
    expect(heading.tagName).toBe("H2");
    expect(heading).toHaveClass("font-serif");

    const index = screen.getByText("01");
    expect(index).toHaveClass("font-mono");

    const section = screen.getByRole("region", { name: "The Offer" });
    expect(section.tagName).toBe("SECTION");
    expect(section).toContainElement(heading);
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("pushes the sub content to the inline end", () => {
    render(
      <Chapter index="02" title="Equity" sub="Optional">
        <p>Body content</p>
      </Chapter>
    );

    expect(screen.getByText("Optional")).toHaveClass("ms-auto");
  });

  it("renders without a sub when none is given", () => {
    render(
      <Chapter index="03" title="Taxes">
        <p>Body content</p>
      </Chapter>
    );

    expect(screen.queryByText("Optional")).not.toBeInTheDocument();
  });
});
