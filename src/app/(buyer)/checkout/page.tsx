import { CartSummary } from "@/components/buyer/CartSummary";
import { CheckoutForm } from "@/components/buyer/CheckoutForm";
import { CheckoutGate } from "@/components/buyer/CheckoutGate";

export default function CheckoutPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Checkout
      </h1>
      <CheckoutGate>
        <CartSummary />
        <CheckoutForm />
      </CheckoutGate>
    </div>
  );
}
