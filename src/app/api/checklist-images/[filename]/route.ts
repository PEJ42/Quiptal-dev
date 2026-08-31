import { readFile } from "fs/promises";
import { notFound } from "next/navigation";
import { requireBookingAccess } from "@/lib/auth";
import { checklistUploadsDirectory } from "@/lib/app-storage";
import { prisma } from "@/lib/prisma";

const mediaTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename)) notFound();
  const photo = await prisma.bookingChecklistPhoto.findUnique({
    where: { fileReference: filename },
    include: { checklist: { select: { bookingId: true } } },
  });
  if (!photo) notFound();
  await requireBookingAccess(photo.checklist.bookingId);
  const extension = filename.split(".").pop()!;
  try {
    return new Response(await readFile(`${checklistUploadsDirectory}/${filename}`), {
      headers: { "Content-Type": mediaTypes[extension], "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    notFound();
  }
}
