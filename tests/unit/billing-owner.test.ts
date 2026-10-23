import { describe, expect, it } from "vitest";
import { groupAccrualsByBillingOwner } from "@/lib/billing/owner";

describe("groupAccrualsByBillingOwner", () => {
  it("Lapak biasa ditagih per Lapak, Gerai Titipan digabung per EO", () => {
    const groups = groupAccrualsByBillingOwner([
      { merchantId: "lapak-a", organizerId: null, total: 3000 },
      { merchantId: "titip-1", organizerId: "eo-x", total: 2000 },
      { merchantId: "titip-2", organizerId: "eo-x", total: 5000 },
      { merchantId: "titip-3", organizerId: "eo-y", total: 1000 },
    ]);
    expect(groups).toEqual([
      { owner: { kind: "merchant", merchantId: "lapak-a" }, total: 3000 },
      { owner: { kind: "organizer", organizerId: "eo-x" }, total: 7000 },
      { owner: { kind: "organizer", organizerId: "eo-y" }, total: 1000 },
    ]);
  });

  it("membuang pemilik dengan total 0", () => {
    expect(
      groupAccrualsByBillingOwner([
        { merchantId: "lapak-a", organizerId: null, total: 0 },
        { merchantId: "titip-1", organizerId: "eo-x", total: 0 },
      ]),
    ).toEqual([]);
  });
});
