import { CartSummary } from "@/components/buyer/CartSummary";
import { CheckoutForm } from "@/components/buyer/CheckoutForm";
import { CheckoutGate } from "@/components/buyer/CheckoutGate";
import { PageHeader } from "@/components/ui/PageHeader";

export default function CheckoutPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <PageHeader
        title="Checkout"
        subtitle="Periksa pesananmu, lalu isi nama."
      />
      <CheckoutGate>
        <CartSummary />
        <CheckoutForm />
      </CheckoutGate>
    </div>
  );
}
