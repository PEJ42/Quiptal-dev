import { AppShell } from "@/components/app-shell";
import { ItemForm } from "@/components/item-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewItemPage() {
  const user = await requireAdmin();
  const [products, memberships] = await Promise.all([
    prisma.product.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.teamMembership.findMany({
      where: { teamId: user.membership.teamId },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { user: { email: "asc" } },
    }),
  ]);
  return (
    <AppShell activeItem="Items">
      <h1 className="page-title">Add item</h1>
      <p className="page-subtitle">
        Create a physical-asset record. It will not change booking inventory.
      </p>
      <ItemForm owners={memberships.map((membership) => membership.user)} products={products} />
    </AppShell>
  );
}
