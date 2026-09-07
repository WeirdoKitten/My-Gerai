import { PayoutsManager } from "@/components/admin/PayoutsManager";
import { TransactionList } from "@/components/admin/TransactionList";
import { PageHeader } from "@/components/ui/PageHeader";
import { listOrdersForAdmin } from "@/server/orders";
import { listMerchantBalances, listPayoutsForAdmin } from "@/server/payouts";

export default async function AdminPayoutsPage() {
  const [balances, payoutHistory, transactions] = await Promise.all([
    listMerchantBalances(),
    listPayoutsForAdmin(),
    listOrdersForAdmin(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Saldo & Pencairan" />
      <PayoutsManager
        initialBalances={balances}
        initialPayouts={payoutHistory}
      />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Daftar Transaksi</h2>
        <TransactionList orders={transactions} />
      </section>
    </div>
  );
}
