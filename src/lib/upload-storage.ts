import "server-only";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import {
  catalogUploadsDirectory,
  checklistUploadsDirectory,
  companyLogosDirectory,
} from "@/lib/app-storage";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function saveCatalogImage(file: File | null) {
  if (!file || file.size === 0) return null;
  const extension = extensions[file.type];
  if (!extension || file.size > MAX_IMAGE_BYTES) throw new Error("Invalid image upload.");
  const filename = `${randomUUID()}.${extension}`;
  await mkdir(catalogUploadsDirectory, { recursive: true });
  await writeFile(`${catalogUploadsDirectory}/${filename}`, Buffer.from(await file.arrayBuffer()));
  return filename;
}

export const catalogImageConstraints = "JPEG, PNG, or WebP; maximum 5 MB.";

export async function saveChecklistPhoto(file: File | null) {
  if (!file || file.size === 0) return null;
  const extension = extensions[file.type];
  if (!extension || file.size > MAX_IMAGE_BYTES) throw new Error("Invalid checklist photo.");
  const filename = `${randomUUID()}.${extension}`;
  await mkdir(checklistUploadsDirectory, { recursive: true });
  await writeFile(
    `${checklistUploadsDirectory}/${filename}`,
    Buffer.from(await file.arrayBuffer()),
  );
  return filename;
}

export const checklistPhotoConstraints = "JPEG, PNG, or WebP; maximum 5 MB each.";

const companyLogoExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function saveCompanyLogo(file: File | null) {
  if (!file || file.size === 0) return null;
  const extension = companyLogoExtensions[file.type];
  if (!extension || file.size > 2 * 1024 * 1024) throw new Error("Invalid company logo upload.");
  const filename = `${randomUUID()}.${extension}`;
  await mkdir(companyLogosDirectory, { recursive: true });
  await writeFile(`${companyLogosDirectory}/${filename}`, Buffer.from(await file.arrayBuffer()));
  return filename;
}

export const companyLogoConstraints = "JPEG or PNG; maximum 2 MB.";
