import { PayoutsManager } from "@/components/admin/PayoutsManager";
import { TransactionList } from "@/components/admin/TransactionList";
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
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Saldo & Pencairan
      </h1>
      <PayoutsManager
        initialBalances={balances}
        initialPayouts={payoutHistory}
      />
      <div>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Daftar Transaksi
        </h2>
        <TransactionList orders={transactions} />
      </div>
    </div>
  );
}
