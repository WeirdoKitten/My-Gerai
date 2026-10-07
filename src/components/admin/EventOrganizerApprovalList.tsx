"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarIcon } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/Textarea";
import {
  approveEventOrganizer,
  listEventOrganizersForAdmin,
  rejectEventOrganizer,
} from "@/server/event-organizers";
import type { AdminEventOrganizerView } from "@/types/event";
import { MerchantStatusBadge } from "./MerchantStatusBadge";

/** Persetujuan akun Event Organizer — pola sama dengan MerchantApprovalList. */
export function EventOrganizerApprovalList({
  initialOrganizers,
}: {
  initialOrganizers: AdminEventOrganizerView[];
}) {
  const [organizers, setOrganizers] = useState(initialOrganizers);

  async function refresh() {
    setOrganizers(await listEventOrganizersForAdmin());
  }

  const pending = organizers.filter((o) => o.status === "pending");
  const others = organizers.filter((o) => o.status !== "pending");

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">
          Menunggu Persetujuan ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-muted">Tidak ada EO yang menunggu.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((organizer) => (
              <EventOrganizerApprovalRow
                key={organizer.id}
                organizer={organizer}
                onChanged={refresh}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Semua EO</h2>
        {others.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="size-10" />}
            title="Belum ada EO"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {others.map((organizer) => (
              <Card
                key={organizer.id}
                pad="sm"
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {organizer.organizationName}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {organizer.contactName} · {organizer.phone} ·{" "}
                    {organizer.eventCount} event
                    {organizer.status === "rejected" &&
                    organizer.rejectionReason
                      ? `: ${organizer.rejectionReason}`
                      : ""}
                  </p>
                </div>
                <MerchantStatusBadge status={organizer.status} />
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventOrganizerApprovalRow({
  organizer,
  onChanged,
}: {
  organizer: AdminEventOrganizerView;
  onChanged: () => void;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    const result = await approveEventOrganizer({ organizerId: organizer.id });
    if (!result.ok) {
      setError(result.message ?? "Gagal menyetujui.");
      setSubmitting(false);
      return;
    }
    onChanged();
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await rejectEventOrganizer({
      organizerId: organizer.id,
      reason,
    });
    if (!result.ok) {
      setError(result.message ?? "Gagal menolak.");
      setSubmitting(false);
      return;
    }
    onChanged();
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <p className="font-semibold text-ink">{organizer.organizationName}</p>
        <p className="text-sm text-ink-muted">
          {organizer.contactName} · {organizer.phone}
        </p>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {showRejectForm ? (
        <form onSubmit={handleReject} className="flex flex-col gap-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={3}
            placeholder="Alasan penolakan (ditampilkan ke EO)..."
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="danger"
              size="sm"
              fullWidth
              loading={submitting}
            >
              {submitting ? "Memproses..." : "Konfirmasi Tolak"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowRejectForm(false)}
            >
              Batal
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            fullWidth
            loading={submitting}
            onClick={handleApprove}
          >
            Setujui
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={submitting}
            onClick={() => setShowRejectForm(true)}
          >
            Tolak
          </Button>
        </div>
      )}
    </Card>
  );
}
