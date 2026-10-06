"use server";

import { and, asc, count, desc, eq, inArray, notInArray } from "drizzle-orm";
import { getEventOrganizerSession } from "@/lib/auth/eo-session";
import { getMerchantSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  eventMerchants,
  eventOrganizers,
  events,
  merchants,
  orderItems,
  orderItemVariantSelections,
  orders,
} from "@/lib/db/schema";
import {
  invalidatePublicEventCache,
  loadPublicEvent,
} from "@/lib/event/queries";
import { buildEventQrPoster } from "@/lib/utils/qr-poster";
import { randomSlugSuffix, slugify } from "@/lib/utils/slug";
import {
  type EventFieldsInput,
  eventFieldsSchema,
  type SetEventMerchantsInput,
  setEventMerchantsSchema,
  type UpdateEventInput,
  updateEventSchema,
} from "@/lib/validation/event.schema";
import { listAllApprovedMerchants } from "@/server/merchants";
import type {
  CreateEventResult,
  EventActionResult,
  EventDetailView,
  EventListItem,
  EventMerchantOption,
  EventOrderView,
  MerchantEventInfo,
  PublicEventView,
} from "@/types/event";

/** Batas Pesanan yang ditampilkan di portal EO (terbaru dulu). */
const EVENT_ORDER_LIST_LIMIT = 200;
/** Batas daftar Gerai yang bisa dipilih EO (sama dengan direktori `/gerai`). */
const SELECTABLE_MERCHANT_LIMIT = 500;

const SESSION_EXPIRED = "Sesi EO berakhir, silakan login kembali.";
const EVENT_NOT_FOUND = "Event tidak ditemukan.";

async function generateUniqueEventSlug(name: string): Promise<string> {
  const base = slugify(name) || "event";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSlugSuffix(4)}`;
    const existing = await db.query.events.findFirst({
      where: eq(events.slug, candidate),
      columns: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${base}-${randomSlugSuffix(6)}`;
}

/** Event milik EO yang sedang login — `null` kalau bukan miliknya. */
async function findOwnEvent(eventId: string, organizerId: string) {
  return db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.organizerId, organizerId)),
  });
}

function emptyToNull(value: string | undefined): string | null {
  return value ? value : null;
}

export async function listMyEvents(): Promise<EventListItem[]> {
  const session = await getEventOrganizerSession();
  if (!session) return [];

  const rows = await db
    .select({
      id: events.id,
      slug: events.slug,
      name: events.name,
      isActive: events.isActive,
      createdAt: events.createdAt,
      merchantCount: count(eventMerchants.merchantId),
    })
    .from(events)
    .leftJoin(eventMerchants, eq(eventMerchants.eventId, events.id))
    .where(eq(events.organizerId, session.organizerId))
    .groupBy(events.id)
    .orderBy(desc(events.createdAt));
  return rows;
}

export async function createEvent(
  input: EventFieldsInput,
): Promise<CreateEventResult> {
  const session = await getEventOrganizerSession();
  if (!session) return { ok: false, message: SESSION_EXPIRED };

  const parsed = eventFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  const [created] = await db
    .insert(events)
    .values({
      organizerId: session.organizerId,
      slug: await generateUniqueEventSlug(parsed.data.name),
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      location: emptyToNull(parsed.data.location),
    })
    .returning({ id: events.id });
  return { ok: true, eventId: created.id };
}

export async function getEventDetail(
  eventId: string,
): Promise<EventDetailView | null> {
  const session = await getEventOrganizerSession();
  if (!session) return null;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;

  const event = await findOwnEvent(eventId, session.organizerId);
  if (!event) return null;

  const members = await db
    .select({
      id: merchants.id,
      slug: merchants.slug,
      stallName: merchants.stallName,
      category: merchants.category,
    })
    .from(eventMerchants)
    .innerJoin(merchants, eq(merchants.id, eventMerchants.merchantId))
    .where(eq(eventMerchants.eventId, event.id))
    .orderBy(asc(eventMerchants.sortOrder));

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const url = `${appUrl}/e/${event.slug}`;

  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    description: event.description,
    location: event.location,
    isActive: event.isActive,
    url,
    qrImageUrl: await buildEventQrPoster(url, event.name),
    merchants: members,
  };
}

export async function updateEvent(
  input: UpdateEventInput,
): Promise<EventActionResult> {
  const session = await getEventOrganizerSession();
  if (!session) return { ok: false, message: SESSION_EXPIRED };

  const parsed = updateEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  const [updated] = await db
    .update(events)
    .set({
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      location: emptyToNull(parsed.data.location),
      isActive: parsed.data.isActive,
    })
    .where(
      and(
        eq(events.id, parsed.data.eventId),
        eq(events.organizerId, session.organizerId),
      ),
    )
    .returning({ id: events.id });
  if (!updated) return { ok: false, message: EVENT_NOT_FOUND };

  invalidatePublicEventCache();
  return { ok: true };
}

/** Gerai `approved` yang bisa dipilih EO. */
export async function listSelectableMerchants(): Promise<
  EventMerchantOption[]
> {
  const session = await getEventOrganizerSession();
  if (!session) return [];

  return db
    .select({
      id: merchants.id,
      slug: merchants.slug,
      stallName: merchants.stallName,
      category: merchants.category,
    })
    .from(merchants)
    .where(eq(merchants.status, "approved"))
    .orderBy(asc(merchants.stallName))
    .limit(SELECTABLE_MERCHANT_LIMIT);
}

/** Ganti seluruh daftar Gerai event (urutan = urutan tampil ke Pembeli). */
export async function setEventMerchants(
  input: SetEventMerchantsInput,
): Promise<EventActionResult> {
  const session = await getEventOrganizerSession();
  if (!session) return { ok: false, message: SESSION_EXPIRED };

  const parsed = setEventMerchantsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { eventId, merchantIds } = parsed.data;

  const event = await findOwnEvent(eventId, session.organizerId);
  if (!event) return { ok: false, message: EVENT_NOT_FOUND };

  if (merchantIds.length > 0) {
    const approved = await db
      .select({ id: merchants.id })
      .from(merchants)
      .where(
        and(
          inArray(merchants.id, merchantIds),
          eq(merchants.status, "approved"),
        ),
      );
    if (approved.length !== merchantIds.length) {
      return {
        ok: false,
        message: "Ada Gerai yang tidak ditemukan atau belum aktif.",
      };
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(eventMerchants).where(eq(eventMerchants.eventId, eventId));
    if (merchantIds.length > 0) {
      await tx.insert(eventMerchants).values(
        merchantIds.map((merchantId, index) => ({
          eventId,
          merchantId,
          sortOrder: index,
        })),
      );
    }
  });

  invalidatePublicEventCache();
  return { ok: true };
}

/**
 * Pesanan event (read-only) untuk EO pemilik — hanya yang sudah dibayar ke
 * atas (menunggu pembayaran/kedaluwarsa disembunyikan). Sengaja tanpa no HP
 * & alamat Pembeli: EO cukup tahu kode, nama, Gerai, Item, dan status.
 */
export async function listEventOrders(
  eventId: string,
): Promise<EventOrderView[] | null> {
  const session = await getEventOrganizerSession();
  if (!session) return null;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;

  const event = await findOwnEvent(eventId, session.organizerId);
  if (!event) return null;

  const rows = await db
    .select({
      id: orders.id,
      orderCode: orders.orderCode,
      buyerName: orders.buyerName,
      status: orders.status,
      createdAt: orders.createdAt,
      scheduledFor: orders.scheduledFor,
      stallName: merchants.stallName,
    })
    .from(orders)
    .innerJoin(merchants, eq(merchants.id, orders.merchantId))
    .where(
      and(
        eq(orders.eventId, event.id),
        notInArray(orders.status, ["menunggu_pembayaran", "kedaluwarsa"]),
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(EVENT_ORDER_LIST_LIMIT);
  if (rows.length === 0) return [];

  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      name: orderItems.productNameSnapshot,
      qty: orderItems.qty,
    })
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((row) => row.id),
      ),
    );
  const selections =
    items.length === 0
      ? []
      : await db
          .select({
            orderItemId: orderItemVariantSelections.orderItemId,
            optionName: orderItemVariantSelections.optionNameSnapshot,
          })
          .from(orderItemVariantSelections)
          .where(
            inArray(
              orderItemVariantSelections.orderItemId,
              items.map((item) => item.id),
            ),
          )
          .orderBy(asc(orderItemVariantSelections.sortOrder));

  const variantsByItem = new Map<string, string[]>();
  for (const selection of selections) {
    const list = variantsByItem.get(selection.orderItemId) ?? [];
    list.push(selection.optionName);
    variantsByItem.set(selection.orderItemId, list);
  }
  const itemsByOrder = new Map<string, EventOrderView["items"]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push({
      name: item.name,
      qty: item.qty,
      variants: variantsByItem.get(item.id) ?? [],
    });
    itemsByOrder.set(item.orderId, list);
  }

  return rows.map((row) => ({
    ...row,
    items: itemsByOrder.get(row.id) ?? [],
  }));
}

/** Halaman publik event — tanpa sesi. Gerai tampil sesuai urutan EO. */
export async function getPublicEvent(
  slug: string,
): Promise<PublicEventView | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;

  const event = await loadPublicEvent(slug);
  if (!event) return null;

  const allMerchants = event.isActive ? await listAllApprovedMerchants() : [];
  const bySlug = new Map(allMerchants.map((m) => [m.slug, m]));

  return {
    slug: event.slug,
    name: event.name,
    description: event.description,
    location: event.location,
    isActive: event.isActive,
    merchants: event.merchantSlugs.flatMap((merchantSlug) => {
      const merchant = bySlug.get(merchantSlug);
      return merchant ? [merchant] : [];
    }),
  };
}

/** Event yang diikuti Gerai sendiri (info di Profil Pedagang). */
export async function getMyMerchantEvents(): Promise<MerchantEventInfo[]> {
  const session = await getMerchantSession();
  if (!session) return [];

  return db
    .select({
      name: events.name,
      slug: events.slug,
      organizationName: eventOrganizers.organizationName,
      isActive: events.isActive,
    })
    .from(eventMerchants)
    .innerJoin(events, eq(events.id, eventMerchants.eventId))
    .innerJoin(eventOrganizers, eq(eventOrganizers.id, events.organizerId))
    .where(eq(eventMerchants.merchantId, session.merchantId))
    .orderBy(desc(events.isActive), desc(events.createdAt));
}
