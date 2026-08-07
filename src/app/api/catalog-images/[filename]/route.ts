import { readFile } from "fs/promises";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catalogUploadsDirectory } from "@/lib/app-storage";

const mediaTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_: Request, { params }: { params: Promise<{ filename: string }> }) {
  await requireAdmin();
  const { filename } = await params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(filename)) notFound();
  const exists =
    (await prisma.product.count({ where: { imageReference: filename } })) ||
    (await prisma.bundle.count({ where: { imageReference: filename } }));
  if (!exists) notFound();
  const extension = filename.split(".").pop()!;
  try {
    return new Response(await readFile(`${catalogUploadsDirectory}/${filename}`), {
      headers: { "Content-Type": mediaTypes[extension], "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    notFound();
  }
}
