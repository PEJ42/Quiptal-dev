import { readFile } from "fs/promises";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addBookingActivity } from "@/lib/booking-service";
import { contractsDirectory } from "@/lib/app-storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const id = (await params).id;
  const contract = await prisma.generatedContract.findUnique({
    where: { id },
    include: { booking: true },
  });
  if (!contract || !/^[a-f0-9-]{36}\.pdf$/.test(contract.fileReference)) notFound();
  try {
    const bytes = await readFile(`${contractsDirectory}/${contract.fileReference}`);
    await prisma.generatedContract.update({ where: { id }, data: { downloadedAt: new Date() } });
    await addBookingActivity(
      contract.bookingId,
      user.id,
      "CONTRACT_DOWNLOADED",
      `Contract version ${contract.version} downloaded`,
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="booking-${contract.booking.bookingNumber}-contract-${contract.version}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    notFound();
  }
}
