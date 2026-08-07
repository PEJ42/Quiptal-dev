import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export default async function BundlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  await requireAdmin();
  const { q = "", archived = "active" } = await searchParams;
  redirect(`/catalog?${new URLSearchParams({ view: "bundles", q, archived }).toString()}`);
}
