import "server-only";

import { randomBytes } from "crypto";
import { hashToken } from "@/lib/auth";
import { addBookingActivity } from "@/lib/booking-service";
import { checklistSteps, type ChecklistFlow } from "@/lib/checklist-definitions";
import { prisma } from "@/lib/prisma";

export { checklistSteps, type ChecklistFlow } from "@/lib/checklist-definitions";

export async function ensureChecklist(bookingId: string, flow: ChecklistFlow) {
  const definitions = checklistSteps[flow];
  const checklist = await prisma.bookingChecklist.upsert({
    where: { bookingId_flow: { bookingId, flow } },
    update: {},
    create: {
      bookingId,
      flow,
      steps: {
        create: definitions.map((step, displayOrder) => ({
          stepKey: step.key,
          displayOrder,
        })),
      },
    },
  });
  await Promise.all(
    definitions.map((step, displayOrder) =>
      prisma.bookingChecklistStep.upsert({
        where: { checklistId_stepKey: { checklistId: checklist.id, stepKey: step.key } },
        update: {},
        create: { checklistId: checklist.id, stepKey: step.key, displayOrder },
      }),
    ),
  );
  return prisma.bookingChecklist.findUniqueOrThrow({
    where: { id: checklist.id },
    include: { steps: { include: { photos: true }, orderBy: { displayOrder: "asc" } } },
  });
}

export async function markDropoffContractSigned({
  bookingId,
  signedAt,
}: {
  bookingId: string;
  signedAt: Date;
}) {
  const checklist = await ensureChecklist(bookingId, "DROPOFF");
  if (checklist.status === "COMPLETED") return;

  await prisma.$transaction([
    prisma.bookingChecklistStep.updateMany({
      where: {
        checklistId: checklist.id,
        stepKey: "contract-signed",
        status: { not: "COMPLETED" },
      },
      data: { status: "COMPLETED", completedAt: signedAt },
    }),
    prisma.bookingChecklist.updateMany({
      where: { id: checklist.id, currentStep: 0, status: { not: "COMPLETED" } },
      data: { currentStep: 1, status: "IN_PROGRESS" },
    }),
  ]);
}

export async function createChecklistLink({
  bookingId,
  flow,
  createdByUserId,
  pendingEmail,
}: {
  bookingId: string;
  flow: ChecklistFlow;
  createdByUserId: string;
  pendingEmail?: string;
}) {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction(async (tx) => {
    await tx.bookingChecklistLink.updateMany({
      where: { bookingId, flow, revokedAt: null, invalidatedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.bookingChecklistLink.create({
      data: { bookingId, flow, tokenHash: hashToken(token), createdByUserId },
    });
    const email = pendingEmail?.trim().toLowerCase();
    if (email) {
      await tx.pendingBookingUserEmail.upsert({
        where: { bookingId_normalizedEmail: { bookingId, normalizedEmail: email } },
        update: {},
        create: { bookingId, normalizedEmail: email },
      });
    }
  });
  await addBookingActivity(
    bookingId,
    createdByUserId,
    "CHECKLIST_LINK_CREATED",
    `${flow === "DROPOFF" ? "Dropoff" : "Pickup"} checklist link created`,
  );
  return token;
}

export async function markChecklistComplete({
  bookingId,
  checklistId,
  flow,
  userId,
}: {
  bookingId: string;
  checklistId: string;
  flow: ChecklistFlow;
  userId: string;
}) {
  const pickedUpStatus = await prisma.bookingStatus.findFirst({ where: { name: "Picked Up" } });
  await prisma.$transaction([
    prisma.bookingChecklist.update({
      where: { id: checklistId },
      data: { status: "COMPLETED", completedAt: new Date(), completedByUserId: userId },
    }),
    prisma.bookingChecklistLink.updateMany({
      where: { bookingId, flow, revokedAt: null, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    }),
    ...(pickedUpStatus
      ? [
          prisma.booking.update({
            where: { id: bookingId },
            data: { bookingStatusId: pickedUpStatus.id },
          }),
        ]
      : []),
  ]);
  await addBookingActivity(
    bookingId,
    userId,
    "CHECKLIST_COMPLETED",
    `${flow === "DROPOFF" ? "Dropoff" : "Pickup"} checklist completed`,
  );
}
