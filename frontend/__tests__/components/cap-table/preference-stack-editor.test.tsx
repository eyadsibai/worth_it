/**
 * Tests for PreferenceStackEditor stakeholder assignment
 * Following TDD - tests written first
 *
 * A preference tier is meaningless unless it names the stakeholders that hold it.
 * These tests pin down that the editor lets a user assign stakeholders and that
 * the assignment actually reaches `stakeholder_ids`.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreferenceStackEditor } from "@/components/cap-table/preference-stack-editor";
import type { PreferenceTier, Stakeholder } from "@/lib/schemas";

const mockStakeholders: Stakeholder[] = [
  {
    id: "founder-1",
    name: "Alice Founder",
    type: "founder",
    shares: 6_000_000,
    ownership_pct: 60,
    share_class: "common",
  },
  {
    id: "investor-a",
    name: "Acme Ventures",
    type: "investor",
    shares: 2_000_000,
    ownership_pct: 20,
    share_class: "preferred",
  },
  {
    id: "investor-b",
    name: "Beta Capital",
    type: "investor",
    shares: 2_000_000,
    ownership_pct: 20,
    share_class: "preferred",
  },
];

const existingTier: PreferenceTier = {
  id: "tier-1",
  name: "Series A",
  seniority: 1,
  investment_amount: 5_000_000,
  liquidation_multiplier: 1,
  participating: false,
  stakeholder_ids: ["investor-a"],
};

describe("PreferenceStackEditor stakeholder assignment", () => {
  it("lists every cap table stakeholder as a labelled checkbox on the add form", () => {
    render(
      <PreferenceStackEditor tiers={[]} onTiersChange={vi.fn()} stakeholders={mockStakeholders} />
    );

    expect(screen.getByRole("checkbox", { name: "Alice Founder" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Acme Ventures" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Beta Capital" })).toBeInTheDocument();
  });

  it("populates stakeholder_ids with the stakeholders selected on the add form", async () => {
    const user = userEvent.setup();
    const onTiersChange = vi.fn();

    render(
      <PreferenceStackEditor
        tiers={[]}
        onTiersChange={onTiersChange}
        stakeholders={mockStakeholders}
      />
    );

    await user.type(screen.getByLabelText("Round Name"), "Series A");
    await user.click(screen.getByRole("checkbox", { name: "Acme Ventures" }));
    await user.click(screen.getByRole("button", { name: /add preference tier/i }));

    await waitFor(() => expect(onTiersChange).toHaveBeenCalled());

    const submittedTiers = onTiersChange.mock.calls[0][0] as PreferenceTier[];
    expect(submittedTiers).toHaveLength(1);
    expect(submittedTiers[0].stakeholder_ids).toEqual(["investor-a"]);
  });

  it("clears the stakeholder selection after a tier is added", async () => {
    const user = userEvent.setup();
    const onTiersChange = vi.fn();

    render(
      <PreferenceStackEditor
        tiers={[]}
        onTiersChange={onTiersChange}
        stakeholders={mockStakeholders}
      />
    );

    await user.type(screen.getByLabelText("Round Name"), "Series A");
    await user.click(screen.getByRole("checkbox", { name: "Acme Ventures" }));
    await user.click(screen.getByRole("button", { name: /add preference tier/i }));

    await waitFor(() => expect(onTiersChange).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Acme Ventures" })).not.toBeChecked()
    );
  });

  it("shows the assigned stakeholders on an existing tier", () => {
    render(
      <PreferenceStackEditor
        tiers={[existingTier]}
        onTiersChange={vi.fn()}
        stakeholders={mockStakeholders}
      />
    );

    const stack = screen.getByText(/Preference Stack \(1 tiers\)/).closest("div[data-slot='card']");
    expect(stack).not.toBeNull();
    expect(within(stack as HTMLElement).getByText("Acme Ventures")).toBeInTheDocument();
  });

  it("lets a user reassign stakeholders on an existing tier", async () => {
    const user = userEvent.setup();
    const onTiersChange = vi.fn();

    render(
      <PreferenceStackEditor
        tiers={[existingTier]}
        onTiersChange={onTiersChange}
        stakeholders={mockStakeholders}
      />
    );

    await user.click(screen.getByRole("button", { name: /Holders \(1\)\s*for Series A/i }));
    const tierGroup = screen.getByRole("group", { name: "Stakeholders assigned to Series A" });
    await user.click(within(tierGroup).getByRole("checkbox", { name: "Beta Capital" }));

    await waitFor(() => expect(onTiersChange).toHaveBeenCalled());

    const updatedTiers = onTiersChange.mock.calls[0][0] as PreferenceTier[];
    expect(updatedTiers[0].stakeholder_ids).toEqual(["investor-a", "investor-b"]);
  });

  it("lets a user unassign a stakeholder from an existing tier", async () => {
    const user = userEvent.setup();
    const onTiersChange = vi.fn();

    render(
      <PreferenceStackEditor
        tiers={[existingTier]}
        onTiersChange={onTiersChange}
        stakeholders={mockStakeholders}
      />
    );

    await user.click(screen.getByRole("button", { name: /Holders \(1\)\s*for Series A/i }));
    const tierGroup = screen.getByRole("group", { name: "Stakeholders assigned to Series A" });
    await user.click(within(tierGroup).getByRole("checkbox", { name: "Acme Ventures" }));

    await waitFor(() => expect(onTiersChange).toHaveBeenCalled());

    const updatedTiers = onTiersChange.mock.calls[0][0] as PreferenceTier[];
    expect(updatedTiers[0].stakeholder_ids).toEqual([]);
  });

  it("points the Holders toggle at the region it opens", async () => {
    // aria-expanded alone tells a screen reader that something opened, not what.
    const user = userEvent.setup();

    render(
      <PreferenceStackEditor
        tiers={[existingTier]}
        onTiersChange={vi.fn()}
        stakeholders={mockStakeholders}
      />
    );

    const toggle = screen.getByRole("button", { name: /Holders \(1\)\s*for Series A/i });
    await user.click(toggle);

    const controlledId = toggle.getAttribute("aria-controls");
    expect(controlledId).toBeTruthy();
    const region = document.getElementById(controlledId as string);
    expect(region).not.toBeNull();
    expect(
      within(region as HTMLElement).getByRole("group", {
        name: "Stakeholders assigned to Series A",
      })
    ).toBeInTheDocument();
  });

  it("explains the empty state when the cap table has no stakeholders", () => {
    render(<PreferenceStackEditor tiers={[]} onTiersChange={vi.fn()} stakeholders={[]} />);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText(/add stakeholders to your cap table/i)).toBeInTheDocument();
  });
});
