export default async function PaymentStatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const completed = state === "complete";
  return (
    <main className="mx-auto max-w-xl p-8 sm:p-16">
      <section className="section-card text-center">
        <p className="page-kicker">Rental payment</p>
        <h1 className="page-title mt-2">
          {completed ? "Payment submitted" : "Payment was cancelled"}
        </h1>
        <p className="page-subtitle mt-3">
          {completed
            ? "Your payment is being confirmed by Stripe."
            : "You can return to your rental agreement to try again."}
        </p>
      </section>
    </main>
  );
}
