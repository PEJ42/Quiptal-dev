import { readFile } from "fs/promises";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { companyLogosDirectory } from "@/lib/app-storage";
import { prisma } from "@/lib/prisma";

const mediaTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
};

export async function GET(_: Request, { params }: { params: Promise<{ filename: string }> }) {
  await requireAdmin();
  const { filename } = await params;
  if (!/^[a-f0-9-]{36}\.(jpg|png)$/.test(filename)) notFound();
  const company = await prisma.companySettings.findUnique({ where: { id: "default" } });
  if (company?.logoReference !== filename) notFound();
  const extension = filename.split(".").pop()!;
  try {
    return new Response(await readFile(`${companyLogosDirectory}/${filename}`), {
      headers: { "Content-Type": mediaTypes[extension], "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    notFound();
  }
}
