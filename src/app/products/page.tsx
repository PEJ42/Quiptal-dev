import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; archived?: string }>;
}) {
  await requireAdmin();
  const { q = "", categoryId, archived = "active" } = await searchParams;
  const parameters = new URLSearchParams({ view: "products", q, archived });
  if (categoryId) parameters.set("categoryId", categoryId);
  redirect(`/catalog?${parameters.toString()}`);
}
