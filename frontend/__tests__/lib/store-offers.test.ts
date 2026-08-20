/**
 * Tests for the store's multi-offer support (up to MAX_OFFERS named offers)
 * and the v1 -> v2 persist migration that seeds `offers` from the legacy
 * singular `equityDetails`.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore, MAX_OFFERS, type Offer } from "@/lib/store";

const FIRST_OFFER_ID = "offer-1";

const mockRsuEquityDetails = {
  equity_type: "RSU" as const,
  monthly_salary: 15000,
  total_equity_grant_pct: 0.5,
  exit_valuation: 100000000,
  vesting_period: 4,
  cliff_period: 1,
  simulate_dilution: false,
  dilution_rounds: [],
};

function resetOffers(offers: Offer[]) {
  useAppStore.setState({ offers });
}

beforeEach(() => {
  resetOffers([{ id: FIRST_OFFER_ID, name: "", equityDetails: null }]);
});

describe("MAX_OFFERS", () => {
  it("is capped at three", () => {
    expect(MAX_OFFERS).toBe(3);
  });
});

describe("addOffer", () => {
  it("adds offers up to the cap", () => {
    expect(useAppStore.getState().offers).toHaveLength(1);

    expect(useAppStore.getState().addOffer()).toBe(true);
    expect(useAppStore.getState().offers).toHaveLength(2);

    expect(useAppStore.getState().addOffer()).toBe(true);
    expect(useAppStore.getState().offers).toHaveLength(MAX_OFFERS);
  });

  it("returns false and does not add a fourth offer past the cap", () => {
    useAppStore.getState().addOffer();
    useAppStore.getState().addOffer();
    expect(useAppStore.getState().offers).toHaveLength(MAX_OFFERS);

    const result = useAppStore.getState().addOffer();

    expect(result).toBe(false);
    expect(useAppStore.getState().offers).toHaveLength(MAX_OFFERS);
  });

  it("gives each new offer a unique id and empty name", () => {
    useAppStore.getState().addOffer();
    const [first, second] = useAppStore.getState().offers;

    expect(second.id).not.toBe(first.id);
    expect(second.name).toBe("");
    expect(second.equityDetails).toBeNull();
  });
});

describe("removeOffer", () => {
  it("removes the target offer", () => {
    useAppStore.getState().addOffer();
    const [first, second] = useAppStore.getState().offers;

    useAppStore.getState().removeOffer(first.id);

    expect(useAppStore.getState().offers).toHaveLength(1);
    expect(useAppStore.getState().offers[0].id).toBe(second.id);
  });

  it("is a no-op when removing the last remaining offer", () => {
    expect(useAppStore.getState().offers).toHaveLength(1);
    const onlyOfferId = useAppStore.getState().offers[0].id;

    useAppStore.getState().removeOffer(onlyOfferId);

    expect(useAppStore.getState().offers).toHaveLength(1);
    expect(useAppStore.getState().offers[0].id).toBe(onlyOfferId);
  });
});

describe("renameOffer", () => {
  it("updates only the target offer's name", () => {
    useAppStore.getState().addOffer();
    const [first, second] = useAppStore.getState().offers;

    useAppStore.getState().renameOffer(first.id, "Startup A");

    const [updatedFirst, updatedSecond] = useAppStore.getState().offers;
    expect(updatedFirst.name).toBe("Startup A");
    expect(updatedSecond.name).toBe(second.name);
  });
});

describe("setOfferEquityDetails", () => {
  it("sets equity details on the target offer only", () => {
    useAppStore.getState().addOffer();
    const [first] = useAppStore.getState().offers;

    useAppStore.getState().setOfferEquityDetails(first.id, mockRsuEquityDetails);

    const [updatedFirst, updatedSecond] = useAppStore.getState().offers;
    expect(updatedFirst.equityDetails).toEqual(mockRsuEquityDetails);
    expect(updatedSecond.equityDetails).toBeNull();
  });
});

describe("partialize", () => {
  it("includes offers in the persisted snapshot", () => {
    useAppStore.getState().renameOffer(FIRST_OFFER_ID, "Startup A");
    const { partialize } = useAppStore.persist.getOptions();
    if (!partialize) throw new Error("expected persist options to define a partialize function");

    const snapshot = partialize(useAppStore.getState());

    expect(snapshot.offers).toEqual(useAppStore.getState().offers);
  });
});

describe("Persist Migration (-> v2 offers)", () => {
  it("seeds a single empty offer for a v0 blob", async () => {
    const { migrate } = useAppStore.persist.getOptions();
    if (!migrate) throw new Error("expected persist options to define a migrate function");

    const v0Blob = {
      appMode: "employee" as const,
      capTable: { stakeholders: [], total_shares: 10000000, option_pool_pct: 10 },
      instruments: [],
      preferenceTiers: [],
    };

    const migrated = await migrate(v0Blob, 0);

    expect(migrated.offers).toHaveLength(1);
    expect(migrated.offers[0].equityDetails).toBeNull();
    expect(migrated.displayCurrency).toBe("USD");
  });

  it("seeds offers as Offer A from a v1 blob carrying legacy equityDetails", async () => {
    const { migrate } = useAppStore.persist.getOptions();
    if (!migrate) throw new Error("expected persist options to define a migrate function");

    const v1BlobWithLegacyEquityDetails = {
      appMode: "employee" as const,
      capTable: { stakeholders: [], total_shares: 10000000, option_pool_pct: 10 },
      instruments: [],
      preferenceTiers: [],
      displayCurrency: "USD" as const,
      equityDetails: mockRsuEquityDetails,
    };

    const migrated = await migrate(v1BlobWithLegacyEquityDetails, 1);

    expect(migrated.offers).toHaveLength(1);
    expect(migrated.offers[0].equityDetails).toEqual(mockRsuEquityDetails);
  });

  it("seeds a single empty offer from a v1 blob without legacy equityDetails", async () => {
    const { migrate } = useAppStore.persist.getOptions();
    if (!migrate) throw new Error("expected persist options to define a migrate function");

    const v1BlobWithoutEquityDetails = {
      appMode: "founder" as const,
      capTable: { stakeholders: [], total_shares: 5000000, option_pool_pct: 15 },
      instruments: [],
      preferenceTiers: [],
      displayCurrency: "SAR" as const,
    };

    const migrated = await migrate(v1BlobWithoutEquityDetails, 1);

    expect(migrated.offers).toHaveLength(1);
    expect(migrated.offers[0].equityDetails).toBeNull();
    expect(migrated.displayCurrency).toBe("SAR");
  });
});
