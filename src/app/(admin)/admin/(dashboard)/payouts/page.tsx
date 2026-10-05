import type { Route } from "next";
import { PayoutsManager } from "@/components/admin/PayoutsManager";
import { TransactionList } from "@/components/admin/TransactionList";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { listOrdersForAdmin } from "@/server/orders";
import { listMerchantBalances, listPayoutsForAdmin } from "@/server/payouts";

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ halaman?: string }>;
}) {
  const { halaman } = await searchParams;
  const [balances, payoutHistory, transactions] = await Promise.all([
    listMerchantBalances(),
    listPayoutsForAdmin(),
    listOrdersForAdmin(Number(halaman) || 1),
  ]);
  const { page, hasNextPage } = transactions;
  const pageHref = (target: number) =>
    `/admin/payouts?halaman=${target}#transaksi` as Route;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Saldo & Pencairan" />
      <PayoutsManager
        initialBalances={balances}
        initialPayouts={payoutHistory}
      />
      <section id="transaksi" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Daftar Transaksi</h2>
        <TransactionList orders={transactions.orders} />
        {page > 1 || hasNextPage ? (
          <nav
            aria-label="Halaman Daftar Transaksi"
            className="flex items-center justify-between gap-3"
          >
            {page > 1 ? (
              <ButtonLink
                href={pageHref(page - 1)}
                variant="secondary"
                size="sm"
              >
                Sebelumnya
              </ButtonLink>
            ) : (
              <span />
            )}
            <span className="text-sm tabular-nums text-ink-muted">
              Halaman {page}
            </span>
            {hasNextPage ? (
              <ButtonLink
                href={pageHref(page + 1)}
                variant="secondary"
                size="sm"
              >
                Berikutnya
              </ButtonLink>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
