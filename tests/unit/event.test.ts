import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCart } from "@/lib/cart/storage";
import { createOrderSchema } from "@/lib/validation/checkout.schema";
import {
  MAX_EVENT_MERCHANTS,
  registerEventOrganizerSchema,
  setEventMerchantsSchema,
  updateEventSchema,
} from "@/lib/validation/event.schema";

const EVENT_ID = "8f9b2a3e-1c4d-4e5f-9a6b-7c8d9e0f1a2b";
const PRODUCT_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
}

describe("registerEventOrganizerSchema", () => {
  it("menerima data lengkap", () => {
    const result = registerEventOrganizerSchema.safeParse({
      organizationName: "Jelajah Tour",
      contactName: "Rina",
      phone: "081234567890",
      password: "rahasia123",
    });
    expect(result.success).toBe(true);
  });

  it("menolak nomor HP bukan format 08…", () => {
    const result = registerEventOrganizerSchema.safeParse({
      organizationName: "Jelajah Tour",
      contactName: "Rina",
      phone: "+6281234567890",
      password: "rahasia123",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateEventSchema", () => {
  it("nama wajib, deskripsi maks 1.000 karakter", () => {
    expect(
      updateEventSchema.safeParse({
        eventId: EVENT_ID,
        name: " ",
        isActive: true,
      }).success,
    ).toBe(false);
    expect(
      updateEventSchema.safeParse({
        eventId: EVENT_ID,
        name: "Event",
        description: "a".repeat(1001),
        isActive: true,
      }).success,
    ).toBe(false);
  });
});

describe("setEventMerchantsSchema", () => {
  it("boleh kosong (event tanpa Gerai)", () => {
    expect(
      setEventMerchantsSchema.safeParse({ eventId: EVENT_ID, merchantIds: [] })
        .success,
    ).toBe(true);
  });

  it("menolak Gerai dobel", () => {
    expect(
      setEventMerchantsSchema.safeParse({
        eventId: EVENT_ID,
        merchantIds: [uuid(1), uuid(1)],
      }).success,
    ).toBe(false);
  });

  it("menolak lebih dari batas Gerai per event", () => {
    const ids = Array.from({ length: MAX_EVENT_MERCHANTS + 1 }, (_, i) =>
      uuid(i + 1),
    );
    expect(
      setEventMerchantsSchema.safeParse({ eventId: EVENT_ID, merchantIds: ids })
        .success,
    ).toBe(false);
  });
});

describe("createOrderSchema dengan eventSlug", () => {
  const base = {
    merchantSlug: "bakso-pak-budi",
    buyerName: "Budi",
    items: [{ productId: PRODUCT_ID, qty: 1 }],
    eventSlug: "wisata-kuliner-bandung",
  };

  it("Ambil sendiri dari event diterima", () => {
    expect(
      createOrderSchema.safeParse({
        ...base,
        fulfillmentMethod: "ambil_sendiri",
      }).success,
    ).toBe(true);
  });

  it("Diantar dari event ditolak", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillmentMethod: "antar",
      buyerPhone: "081234567890",
      deliveryAddress: "Jl. Raya No. 1",
      deliveryLatitude: -6.9,
      deliveryLongitude: 107.6,
    });
    expect(result.success).toBe(false);
  });

  it("slug event tidak valid ditolak", () => {
    expect(
      createOrderSchema.safeParse({
        ...base,
        eventSlug: "../admin",
        fulfillmentMethod: "ambil_sendiri",
      }).success,
    ).toBe(false);
  });
});

describe("loadCart", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Keranjang lama tanpa eventSlug dinormalisasi jadi null", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () =>
          JSON.stringify({ stallSlug: "bakso-pak-budi", items: [] }),
      },
    });
    expect(loadCart().eventSlug).toBeNull();
  });

  it("eventSlug tersimpan tetap terbaca", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () =>
          JSON.stringify({
            stallSlug: "bakso-pak-budi",
            eventSlug: "wisata-kuliner-bandung",
            items: [],
          }),
      },
    });
    expect(loadCart().eventSlug).toBe("wisata-kuliner-bandung");
  });
});
