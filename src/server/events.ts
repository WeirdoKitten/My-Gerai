"use server";

import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  notInArray,
  or,
} from "drizzle-orm";
import { redirect } from "next/navigation";
import { getEventOrganizerSession } from "@/lib/auth/eo-session";
import { createMerchantSession, getMerchantSession } from "@/lib/auth/session";
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
  loadEventMerchants,
  loadPublicEvent,
} from "@/lib/event/queries";
import { summarizeEventSales } from "@/lib/event/sales-summary";
import { generateUniqueMerchantSlug } from "@/lib/merchant/slug";
import { PAID_ORDER_STATUSES } from "@/lib/utils/order-status";
import { toSubstitutionView } from "@/lib/utils/order-substitution";
import { buildEventQrPoster } from "@/lib/utils/qr-poster";
import { randomSlugSuffix, slugify } from "@/lib/utils/slug";
import {
  type CreateProxyStallInput,
  createProxyStallSchema,
  type EventFieldsInput,
  eventFieldsSchema,
  MAX_EVENT_MERCHANTS,
  type SetEventMerchantsInput,
  setEventMerchantsSchema,
  type UpdateEventInput,
  updateEventSchema,
} from "@/lib/validation/event.schema";
import type {
  CreateEventResult,
  CreateProxyStallResult,
  EventActionResult,
  EventDetailView,
  EventListItem,
  EventMerchantOption,
  EventOrderView,
  EventSalesSummary,
  MerchantEventInfo,
  PublicEventView,
} from "@/types/event";

/** Batas Pesanan yang ditampilkan di portal EO (terbaru dulu). */
const EVENT_ORDER_LIST_LIMIT = 200;
/** Batas daftar Gerai yang bisa dipilih EO (sama dengan direktori `/gerai`). */
const SELECTABLE_MERCHANT_LIMIT = 500;

const SESSION_EXPIRED = "Sesi EO berakhir, silakan login kembali.";
const EVENT_NOT_FOUND = "Event tidak ditemukan.";
const PROXY_QRIS_REQUIRED =
  "Unggah QRIS uang jasa titipan dulu sebelum membuat Gerai Titipan.";

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
      managedByOrganizerId: merchants.managedByOrganizerId,
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
    merchants: members.map(({ managedByOrganizerId, ...member }) => ({
      ...member,
      isProxy: managedByOrganizerId === session.organizerId,
    })),
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

/** Syarat Gerai yang boleh dipilih EO: `approved`, dan kalau Gerai Titipan, harus miliknya sendiri. */
function selectableBy(organizerId: string) {
  return and(
    eq(merchants.status, "approved"),
    or(
      isNull(merchants.managedByOrganizerId),
      eq(merchants.managedByOrganizerId, organizerId),
    ),
  );
}

/** Gerai `approved` yang bisa dipilih EO, termasuk Gerai Titipan miliknya. */
export async function listSelectableMerchants(): Promise<
  EventMerchantOption[]
> {
  const session = await getEventOrganizerSession();
  if (!session) return [];

  const rows = await db
    .select({
      id: merchants.id,
      slug: merchants.slug,
      stallName: merchants.stallName,
      category: merchants.category,
      managedByOrganizerId: merchants.managedByOrganizerId,
    })
    .from(merchants)
    .where(selectableBy(session.organizerId))
    .orderBy(asc(merchants.stallName))
    .limit(SELECTABLE_MERCHANT_LIMIT);
  return rows.map(({ managedByOrganizerId, ...row }) => ({
    ...row,
    isProxy: managedByOrganizerId !== null,
  }));
}

/**
 * Buat Gerai Titipan (jastip oleh EO): Lapak baru tanpa login sendiri yang
 * langsung aktif, lalu ditambahkan ke akhir daftar Gerai event. Menu & Item
 * diisi EO lewat "Kelola" (openProxyStallDashboard).
 */
export async function createProxyStall(
  input: CreateProxyStallInput,
): Promise<CreateProxyStallResult> {
  const session = await getEventOrganizerSession();
  if (!session) return { ok: false, message: SESSION_EXPIRED };

  const parsed = createProxyStallSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }
  const { eventId, stallName, category } = parsed.data;

  const event = await findOwnEvent(eventId, session.organizerId);
  if (!event) return { ok: false, message: EVENT_NOT_FOUND };

  // Gerai Titipan wajib dibayar ke QRIS "uang jasa titipan" EO (2026-10-23).
  const organizer = await db.query.eventOrganizers.findFirst({
    where: eq(eventOrganizers.id, session.organizerId),
    columns: { qrisPhotoUrl: true },
  });
  if (!organizer?.qrisPhotoUrl) {
    return { ok: false, message: PROXY_QRIS_REQUIRED, needsQris: true };
  }

  const slug = await generateUniqueMerchantSlug(stallName);
  const created = await db.transaction(async (tx) => {
    // Baca ulang QRIS EO dengan kunci baris, supaya ganti QRIS yang berjalan
    // bersamaan (uploadEventOrganizerQris) tidak meninggalkan Gerai baru
    // dengan QRIS lama.
    const [lockedOrganizer] = await tx
      .select({ qrisPhotoUrl: eventOrganizers.qrisPhotoUrl })
      .from(eventOrganizers)
      .where(eq(eventOrganizers.id, session.organizerId))
      .for("update");
    const qrisPhotoUrl =
      lockedOrganizer?.qrisPhotoUrl ?? organizer.qrisPhotoUrl;

    const [{ memberCount }] = await tx
      .select({ memberCount: count() })
      .from(eventMerchants)
      .where(eq(eventMerchants.eventId, eventId));
    if (memberCount >= MAX_EVENT_MERCHANTS) return null;

    const [merchant] = await tx
      .insert(merchants)
      .values({
        slug,
        stallName,
        ownerName: session.organizationName,
        category,
        status: "approved",
        paymentMode: "qris_pribadi",
        qrisPhotoUrl,
        managedByOrganizerId: session.organizerId,
      })
      .returning({
        id: merchants.id,
        slug: merchants.slug,
        stallName: merchants.stallName,
        category: merchants.category,
      });
    await tx
      .insert(eventMerchants)
      .values({ eventId, merchantId: merchant.id, sortOrder: memberCount });
    return merchant;
  });
  if (!created) {
    return {
      ok: false,
      message: `Maksimal ${MAX_EVENT_MERCHANTS} Gerai per event.`,
    };
  }

  invalidatePublicEventCache();
  return { ok: true, merchant: { ...created, isProxy: true } };
}

/**
 * "Kelola" Gerai Titipan: buka dashboard Pedagang untuk Gerai itu. Hanya EO
 * pengelolanya (dicek dari sesi EO di WHERE), dan hanya kalau Gerai masih
 * aktif. Sesi Pedagang yang dibuat ikut gugur kalau EO dinonaktifkan Admin
 * (lihat resolveMerchantSessionByToken).
 */
export async function openProxyStallDashboard(
  merchantId: string,
): Promise<EventActionResult> {
  const session = await getEventOrganizerSession();
  if (!session) return { ok: false, message: SESSION_EXPIRED };
  if (!/^[0-9a-f-]{36}$/i.test(merchantId)) {
    return { ok: false, message: "Gerai tidak ditemukan." };
  }

  const merchant = await db.query.merchants.findFirst({
    where: and(
      eq(merchants.id, merchantId),
      eq(merchants.managedByOrganizerId, session.organizerId),
      eq(merchants.status, "approved"),
    ),
    columns: { id: true },
  });
  if (!merchant) {
    return {
      ok: false,
      message: "Gerai tidak ditemukan atau sedang dinonaktifkan Admin.",
    };
  }

  await createMerchantSession(merchant.id);
  redirect("/dashboard");
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
          selectableBy(session.organizerId),
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
      priceSnapshot: orderItems.priceSnapshot,
      substitution: orderItems.substitution,
      substituteName: orderItems.substituteName,
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
      substitution: toSubstitutionView(item),
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

  return {
    slug: event.slug,
    name: event.name,
    description: event.description,
    location: event.location,
    isActive: event.isActive,
    merchants: event.isActive
      ? await loadEventMerchants(event.slug, event.merchantSlugs)
      : [],
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

/**
 * Ringkasan penjualan event untuk EO pemilik: jumlah Pesanan per Gerai, plus
 * omzet/modal/dikembalikan/keuntungan untuk Gerai Titipan miliknya sendiri.
 * Gerai asli hanya jumlah Pesanan — omzetnya data Pedagang (keputusan User).
 */
export async function getEventSalesSummary(
  eventId: string,
): Promise<EventSalesSummary | null> {
  const session = await getEventOrganizerSession();
  if (!session) return null;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;

  const event = await findOwnEvent(eventId, session.organizerId);
  if (!event) return null;

  const [members, paidOrders] = await Promise.all([
    db
      .select({
        merchantId: merchants.id,
        stallName: merchants.stallName,
        managedByOrganizerId: merchants.managedByOrganizerId,
      })
      .from(eventMerchants)
      .innerJoin(merchants, eq(merchants.id, eventMerchants.merchantId))
      .where(eq(eventMerchants.eventId, event.id))
      .orderBy(asc(eventMerchants.sortOrder)),
    db
      .select({
        id: orders.id,
        merchantId: orders.merchantId,
        subtotal: orders.subtotal,
        stallName: merchants.stallName,
        managedByOrganizerId: merchants.managedByOrganizerId,
      })
      .from(orders)
      .innerJoin(merchants, eq(merchants.id, orders.merchantId))
      .where(
        and(
          eq(orders.eventId, event.id),
          inArray(orders.status, [...PAID_ORDER_STATUSES]),
        ),
      ),
  ]);

  const isOwnProxy = (row: { managedByOrganizerId: string | null }) =>
    row.managedByOrganizerId === session.organizerId;
  const summaryOrders = paidOrders.map((order) => ({
    id: order.id,
    merchantId: order.merchantId,
    stallName: order.stallName,
    isProxy: isOwnProxy(order),
    subtotal: order.subtotal,
  }));
  const proxyOrderIds = summaryOrders
    .filter((order) => order.isProxy)
    .map((order) => order.id);
  const proxyItems =
    proxyOrderIds.length === 0
      ? []
      : await db
          .select({
            orderId: orderItems.orderId,
            priceSnapshot: orderItems.priceSnapshot,
            costPriceSnapshot: orderItems.costPriceSnapshot,
            qty: orderItems.qty,
            substitution: orderItems.substitution,
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, proxyOrderIds));

  return summarizeEventSales(
    members.map((member) => ({
      merchantId: member.merchantId,
      stallName: member.stallName,
      isProxy: isOwnProxy(member),
    })),
    summaryOrders,
    proxyItems,
  );
}
