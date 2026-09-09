import { CartSummary } from "@/components/buyer/CartSummary";
import { CheckoutForm } from "@/components/buyer/CheckoutForm";
import { CheckoutGate } from "@/components/buyer/CheckoutGate";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActivePlatformConfig } from "@/server/config";

export default async function CheckoutPage() {
  const { platformFeeAmount } = await getActivePlatformConfig();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Checkout"
        subtitle="Periksa pesananmu, lalu isi nama."
      />
      <CheckoutGate>
        <CartSummary platformFeeAmount={platformFeeAmount} />
        <CheckoutForm platformFeeAmount={platformFeeAmount} />
      </CheckoutGate>
    </div>
  );
}
