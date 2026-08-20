import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { AddOfferSlot } from "@/components/ledger/add-offer-slot";
import { useAppStore, MAX_OFFERS } from "@/lib/store";
import en from "@/messages/en.json";

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  useAppStore.setState({ offers: [{ id: "offer-1", name: "", equityDetails: null }] });
});

describe("AddOfferSlot", () => {
  it("adds an offer to the store when clicked", async () => {
    const user = userEvent.setup();
    wrap(<AddOfferSlot />);

    await user.click(screen.getByRole("button", { name: "Add another offer" }));

    expect(useAppStore.getState().offers).toHaveLength(2);
  });

  it("is disabled once the offer cap is reached", () => {
    useAppStore.setState({
      offers: Array.from({ length: MAX_OFFERS }, (_, index) => ({
        id: `offer-${index}`,
        name: "",
        equityDetails: null,
      })),
    });
    wrap(<AddOfferSlot />);

    expect(screen.getByRole("button", { name: "Add another offer" })).toBeDisabled();
  });
});
