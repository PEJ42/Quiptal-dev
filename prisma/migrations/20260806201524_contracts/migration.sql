-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Equipment Rental Agreement',
    "legalTerms" TEXT NOT NULL DEFAULT 'This agreement governs the rental of the listed equipment.',
    "footerText" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GeneratedContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "templateTitleSnapshot" TEXT NOT NULL,
    "legalTermsSnapshot" TEXT NOT NULL,
    "footerTextSnapshot" TEXT,
    "fileReference" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadedAt" DATETIME,
    CONSTRAINT "GeneratedContract_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeneratedContract_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeneratedContract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ContractTemplate_isActive_idx" ON "ContractTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedContract_fileReference_key" ON "GeneratedContract"("fileReference");

-- CreateIndex
CREATE INDEX "GeneratedContract_bookingId_idx" ON "GeneratedContract"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedContract_bookingId_version_key" ON "GeneratedContract"("bookingId", "version");
