import { readFile } from "fs/promises";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { itemUploadsDirectory } from "@/lib/app-storage";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const document = await prisma.itemDocument.findFirst({
    where: { id: (await params).id, item: { teamId: user.membership.teamId } },
  });
  if (!document || !/^[a-f0-9-]+\.(pdf|jpg|png)$/.test(document.fileReference)) notFound();
  try {
    const bytes = await readFile(`${itemUploadsDirectory}/${document.fileReference}`);
    return new Response(bytes, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${document.originalFilename.replaceAll('"', "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    notFound();
  }
}
