import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingChecklists } from "@/components/booking-checklists";
import { currentUser, hashToken } from "@/lib/auth";
import { isChecklistFlow } from "@/lib/checklist-definitions";
import { prisma } from "@/lib/prisma";

export default async function SharedChecklistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { token } = await params;
  const link = await prisma.bookingChecklistLink.findFirst({
    where: { tokenHash: hashToken(token), revokedAt: null, invalidatedAt: null },
    select: { bookingId: true, flow: true },
  });
  if (!link || !isChecklistFlow(link.flow)) notFound();
  const booking = await prisma.booking.findFirst({
    where: {
      id: link.bookingId,
      team: { memberships: { some: { userId: user.id } } },
      OR: [
        { createdByUserId: user.id },
        { ownerUserId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      checklists: {
        include: {
          completedByUser: { select: { email: true } },
          steps: { include: { photos: true }, orderBy: { displayOrder: "asc" } },
        },
      },
    },
  });
  if (!booking) notFound();
  return (
    <main className="mx-auto max-w-5xl p-5 pb-16 md:p-9">
      <Link className="back-link" href={`/bookings/${booking.id}`}>
        ← Back to booking
      </Link>
      <header className="page-header mt-4">
        <div>
          <p className="page-kicker">{booking.bookingNumber}</p>
          <h1 className="page-title">{link.flow === "DROPOFF" ? "Dropoff" : "Pickup"} checklist</h1>
          <p className="page-subtitle">
            {booking.title || `${booking.customer.firstName} ${booking.customer.lastName}`}
          </p>
        </div>
      </header>
      <BookingChecklists
        activeFlows={[link.flow]}
        bookingId={booking.id}
        checklists={booking.checklists}
        flows={[link.flow]}
        showLinkControls={false}
      />
    </main>
  );
}
