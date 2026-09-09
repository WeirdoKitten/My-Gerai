"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Tombol "Keluar" dengan konfirmasi — cegah logout tak sengaja dari header
 * dashboard. `action` adalah Server Action logout (Pedagang/Admin) yang
 * dilempar dari layout.
 */
export function LogoutButton({ action }: { action: () => Promise<void> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="dangerOutline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Keluar
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Yakin Ingin Keluar?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Kamu akan keluar dan perlu login lagi dengan nomor HP & password
            untuk masuk kembali.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <form action={action}>
              <Button type="submit" variant="danger" size="sm">
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </Modal>
    </>
  );
}
