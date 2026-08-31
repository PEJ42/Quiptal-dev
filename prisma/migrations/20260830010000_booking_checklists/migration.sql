CREATE TABLE "PendingBookingUserEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PendingBookingUserEmail_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BookingChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "flow" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "completedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookingChecklist_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingChecklist_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "BookingChecklistStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checklistId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "damageReport" TEXT,
    "completedAt" DATETIME,
    "completedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookingChecklistStep_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "BookingChecklist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingChecklistStep_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "BookingChecklistPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checklistId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "fileReference" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingChecklistPhoto_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "BookingChecklist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingChecklistPhoto_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "BookingChecklistStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BookingChecklistLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "flow" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "invalidatedAt" DATETIME,
    CONSTRAINT "BookingChecklistLink_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingChecklistLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PendingBookingUserEmail_bookingId_normalizedEmail_key" ON "PendingBookingUserEmail"("bookingId", "normalizedEmail");
CREATE INDEX "PendingBookingUserEmail_normalizedEmail_idx" ON "PendingBookingUserEmail"("normalizedEmail");
CREATE UNIQUE INDEX "BookingChecklist_bookingId_flow_key" ON "BookingChecklist"("bookingId", "flow");
CREATE INDEX "BookingChecklist_bookingId_idx" ON "BookingChecklist"("bookingId");
CREATE UNIQUE INDEX "BookingChecklistStep_checklistId_stepKey_key" ON "BookingChecklistStep"("checklistId", "stepKey");
CREATE UNIQUE INDEX "BookingChecklistStep_checklistId_displayOrder_key" ON "BookingChecklistStep"("checklistId", "displayOrder");
CREATE INDEX "BookingChecklistStep_checklistId_idx" ON "BookingChecklistStep"("checklistId");
CREATE UNIQUE INDEX "BookingChecklistPhoto_fileReference_key" ON "BookingChecklistPhoto"("fileReference");
CREATE INDEX "BookingChecklistPhoto_checklistId_idx" ON "BookingChecklistPhoto"("checklistId");
CREATE INDEX "BookingChecklistPhoto_stepId_idx" ON "BookingChecklistPhoto"("stepId");
CREATE UNIQUE INDEX "BookingChecklistLink_tokenHash_key" ON "BookingChecklistLink"("tokenHash");
CREATE INDEX "BookingChecklistLink_bookingId_flow_idx" ON "BookingChecklistLink"("bookingId", "flow");
CREATE UNIQUE INDEX "BookingChecklistLink_active_booking_flow_key"
ON "BookingChecklistLink"("bookingId", "flow")
WHERE "revokedAt" IS NULL AND "invalidatedAt" IS NULL;
