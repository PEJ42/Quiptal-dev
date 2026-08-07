import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveContractTemplate } from "./actions";

export default async function ContractsPage() {
  await requireAdmin();
  const [template, contracts] = await Promise.all([
    prisma.contractTemplate.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } }),
    prisma.generatedContract.findMany({
      include: { booking: { include: { customer: true } } },
      orderBy: { generatedAt: "desc" },
    }),
  ]);
  return (
    <AppShell activeItem="Contracts">
      <h1 className="text-2xl font-semibold">Contracts</h1>
      {template && (
        <section className="mt-6 rounded border bg-white p-5">
          <h2 className="font-semibold">Contract template</h2>
          <p className="mt-1 text-sm text-slate-600">
            Version {template.version}. Existing generated contracts preserve a snapshot of each
            version.
          </p>
          <form action={saveContractTemplate} className="mt-4 grid max-w-3xl gap-3">
            <input name="id" type="hidden" value={template.id} />
            <label className="text-sm">
              Title
              <input
                className="mt-1 w-full rounded border p-2"
                defaultValue={template.title}
                name="title"
                required
              />
            </label>
            <label className="text-sm">
              Legal terms
              <textarea
                className="mt-1 min-h-64 w-full rounded border p-2"
                defaultValue={template.legalTerms}
                name="legalTerms"
                required
              />
            </label>
            <label className="text-sm">
              Footer text
              <input
                className="mt-1 w-full rounded border p-2"
                defaultValue={template.footerText ?? ""}
                name="footerText"
              />
            </label>
            <button className="w-fit rounded bg-slate-900 px-4 py-2 text-sm text-white">
              Save new template version
            </button>
          </form>
        </section>
      )}
      <section className="mt-6 rounded border bg-white p-5">
        <h2 className="font-semibold">Generated contracts</h2>
        <div className="mt-4 space-y-3">
          {contracts.length === 0 ? (
            <p className="text-sm text-slate-600">No contracts generated yet.</p>
          ) : (
            contracts.map((contract) => (
              <div className="flex justify-between border-b pb-3 text-sm" key={contract.id}>
                <span>
                  {contract.booking.bookingNumber} · {contract.booking.customer.firstName}{" "}
                  {contract.booking.customer.lastName} · version {contract.version}
                </span>
                <a className="underline" href={`/api/contracts/${contract.id}`}>
                  Download
                </a>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
