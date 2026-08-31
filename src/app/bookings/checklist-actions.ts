"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBookingAccess } from "@/lib/auth";
import { createChecklistLink, ensureChecklist, markChecklistComplete } from "@/lib/checklists";
import { checklistSteps, isChecklistFlow, type ChecklistFlow } from "@/lib/checklist-definitions";
import { prisma } from "@/lib/prisma";
import { saveChecklistPhoto } from "@/lib/upload-storage";

const bookingIdFrom = (formData: FormData) => z.string().cuid().parse(formData.get("bookingId"));

function flowFrom(formData: FormData): ChecklistFlow {
  const value = z.string().parse(formData.get("flow"));
  if (!isChecklistFlow(value)) throw new Error("Invalid checklist flow.");
  return value;
}

function bookingPath(bookingId: string, error?: string) {
  return error ? `/bookings/${bookingId}?checklistError=${error}` : `/bookings/${bookingId}`;
}

export async function setChecklistCurrentStep(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const flow = flowFrom(formData);
  const step = z.coerce
    .number()
    .int()
    .min(0)
    .max(checklistSteps[flow].length - 1)
    .parse(formData.get("step"));
  await requireBookingAccess(bookingId);
  const checklist = await ensureChecklist(bookingId, flow);
  if (checklist.status === "COMPLETED") return;
  await prisma.bookingChecklist.update({
    where: { id: checklist.id },
    data: { currentStep: step, status: "IN_PROGRESS" },
  });
  revalidatePath(bookingPath(bookingId));
}

export async function advanceChecklistStep(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const flow = flowFrom(formData);
  await requireBookingAccess(bookingId);
  const checklist = await ensureChecklist(bookingId, flow);
  if (checklist.status === "COMPLETED") return;
  await prisma.bookingChecklist.update({
    where: { id: checklist.id },
    data: {
      currentStep: Math.min(checklist.currentStep + 1, checklistSteps[flow].length - 1),
      status: "IN_PROGRESS",
    },
  });
  revalidatePath(bookingPath(bookingId));
}

export async function uploadChecklistPhotos(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const flow = flowFrom(formData);
  const stepKey = z.string().parse(formData.get("stepKey"));
  await requireBookingAccess(bookingId);
  const checklist = await ensureChecklist(bookingId, flow);
  const step = checklist.steps.find((candidate) => candidate.stepKey === stepKey);
  if (!step || checklist.status === "COMPLETED") return;
  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);
  for (const file of files) {
    const fileReference = await saveChecklistPhoto(file);
    if (fileReference) {
      await prisma.bookingChecklistPhoto.create({
        data: { checklistId: checklist.id, stepId: step.id, fileReference },
      });
    }
  }
  if (files.length) {
    await prisma.bookingChecklist.update({
      where: { id: checklist.id },
      data: { status: "IN_PROGRESS" },
    });
  }
  revalidatePath(bookingPath(bookingId));
}

export async function completeChecklistStep(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const flow = flowFrom(formData);
  const stepKey = z.string().parse(formData.get("stepKey"));
  const { user } = await requireBookingAccess(bookingId);
  const checklist = await ensureChecklist(bookingId, flow);
  if (checklist.status === "COMPLETED") return;
  const definition = checklistSteps[flow].find((step) => step.key === stepKey);
  const step = checklist.steps.find((candidate) => candidate.stepKey === stepKey);
  if (!definition || !step) return;

  if (definition.kind === "contract") {
    const signedContract = await prisma.generatedContract.findFirst({
      where: { bookingId, status: "SIGNED" },
      select: { id: true },
    });
    if (!signedContract) redirect(bookingPath(bookingId, "contract"));
  }
  if (definition.kind === "photos" && step.photos.length === 0) {
    redirect(bookingPath(bookingId, "photos"));
  }
  if (definition.kind === "manual" && formData.get("manualConfirmed") !== "on") {
    redirect(bookingPath(bookingId, "manual"));
  }
  if (definition.kind === "confirm") {
    const incomplete = checklist.steps.some(
      (candidate) => candidate.stepKey !== stepKey && candidate.status !== "COMPLETED",
    );
    if (incomplete) redirect(bookingPath(bookingId, "steps"));
  }
  const damageReport =
    definition.kind === "damage"
      ? z
          .string()
          .trim()
          .max(5_000)
          .parse(formData.get("damageReport") || "")
      : undefined;
  await prisma.bookingChecklistStep.update({
    where: { id: step.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedByUserId: user.id,
      ...(damageReport !== undefined ? { damageReport: damageReport || null } : {}),
    },
  });
  if (definition.kind === "confirm") {
    await markChecklistComplete({ bookingId, checklistId: checklist.id, flow, userId: user.id });
  } else {
    await prisma.bookingChecklist.update({
      where: { id: checklist.id },
      data: {
        status: "IN_PROGRESS",
        currentStep: Math.min(step.displayOrder + 1, checklistSteps[flow].length - 1),
      },
    });
  }
  revalidatePath(bookingPath(bookingId));
}

export type ChecklistLinkActionState = { error?: string; token?: string };

export async function createChecklistLinkAction(
  _state: ChecklistLinkActionState,
  formData: FormData,
): Promise<ChecklistLinkActionState> {
  const bookingId = bookingIdFrom(formData);
  const flow = flowFrom(formData);
  const { user } = await requireBookingAccess(bookingId);
  const email = String(formData.get("pendingEmail") || "").trim();
  if (email && !z.email().safeParse(email).success)
    return { error: "Enter a valid email address." };
  const checklist = await ensureChecklist(bookingId, flow);
  if (checklist.status === "COMPLETED") return { error: "This checklist is already complete." };
  const token = await createChecklistLink({
    bookingId,
    flow,
    createdByUserId: user.id,
    pendingEmail: email || undefined,
  });
  revalidatePath(bookingPath(bookingId));
  return { token };
}

export async function revokeChecklistLink(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const flow = flowFrom(formData);
  await requireBookingAccess(bookingId);
  await prisma.bookingChecklistLink.updateMany({
    where: { bookingId, flow, revokedAt: null, invalidatedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath(bookingPath(bookingId));
}
