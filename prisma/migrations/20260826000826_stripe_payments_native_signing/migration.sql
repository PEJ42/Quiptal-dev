-- CreateTable
CREATE TABLE "SigningLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" DATETIME,
    "expiresAt" DATETIME,
    "viewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SigningLink_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SigningLink_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "GeneratedContract" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContractSignature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'native',
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consentText" TEXT NOT NULL,
    "consentedAt" DATETIME NOT NULL,
    "contentHash" TEXT NOT NULL,
    "signedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractSignature_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "GeneratedContract" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "contractId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "ownerAccountReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "providerCustomerId" TEXT,
    "providerCheckoutSessionId" TEXT,
    "providerPaymentIntentId" TEXT,
    "paymentUrl" TEXT,
    "amountRequestedCents" INTEGER NOT NULL,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "amountRefundedCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "refundedAt" DATETIME,
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "GeneratedContract" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedPaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerCustomerId" TEXT NOT NULL,
    "providerPaymentMethodId" TEXT NOT NULL,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "consentedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedPaymentMethod_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SavedPaymentMethod_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DepositAuthorization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "savedPaymentMethodId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "status" TEXT NOT NULL DEFAULT 'NO_CARD',
    "providerPaymentIntentId" TEXT,
    "amountAuthorizedCents" INTEGER NOT NULL DEFAULT 0,
    "amountCapturedCents" INTEGER NOT NULL DEFAULT 0,
    "amountRefundedCents" INTEGER NOT NULL DEFAULT 0,
    "authorizationExpiresAt" DATETIME,
    "authorizedAt" DATETIME,
    "releasedAt" DATETIME,
    "capturedAt" DATETIME,
    "refundedAt" DATETIME,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DepositAuthorization_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GeneratedContract" (
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
    "pricingSnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "contentHash" TEXT,
    "signedAt" DATETIME,
    "requiresResignature" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadedAt" DATETIME,
    CONSTRAINT "GeneratedContract_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeneratedContract_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GeneratedContract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GeneratedContract" ("bookingId", "downloadedAt", "fileReference", "footerTextSnapshot", "generatedAt", "generatedByUserId", "id", "legalTermsSnapshot", "status", "templateId", "templateTitleSnapshot", "version") SELECT "bookingId", "downloadedAt", "fileReference", "footerTextSnapshot", "generatedAt", "generatedByUserId", "id", "legalTermsSnapshot", "status", "templateId", "templateTitleSnapshot", "version" FROM "GeneratedContract";
DROP TABLE "GeneratedContract";
ALTER TABLE "new_GeneratedContract" RENAME TO "GeneratedContract";
CREATE UNIQUE INDEX "GeneratedContract_fileReference_key" ON "GeneratedContract"("fileReference");
CREATE INDEX "GeneratedContract_bookingId_idx" ON "GeneratedContract"("bookingId");
CREATE UNIQUE INDEX "GeneratedContract_bookingId_version_key" ON "GeneratedContract"("bookingId", "version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SigningLink_tokenHash_key" ON "SigningLink"("tokenHash");

-- CreateIndex
CREATE INDEX "SigningLink_bookingId_idx" ON "SigningLink"("bookingId");

-- CreateIndex
CREATE INDEX "SigningLink_contractId_idx" ON "SigningLink"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractSignature_contractId_key" ON "ContractSignature"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerCheckoutSessionId_key" ON "Payment"("providerCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentIntentId_key" ON "Payment"("providerPaymentIntentId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_contractId_idx" ON "Payment"("contractId");

-- CreateIndex
CREATE INDEX "Payment_provider_status_idx" ON "Payment"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPaymentMethod_providerPaymentMethodId_key" ON "SavedPaymentMethod"("providerPaymentMethodId");

-- CreateIndex
CREATE INDEX "SavedPaymentMethod_bookingId_idx" ON "SavedPaymentMethod"("bookingId");

-- CreateIndex
CREATE INDEX "SavedPaymentMethod_customerId_idx" ON "SavedPaymentMethod"("customerId");

-- CreateIndex
CREATE INDEX "SavedPaymentMethod_provider_providerCustomerId_idx" ON "SavedPaymentMethod"("provider", "providerCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "DepositAuthorization_providerPaymentIntentId_key" ON "DepositAuthorization"("providerPaymentIntentId");

-- CreateIndex
CREATE INDEX "DepositAuthorization_bookingId_idx" ON "DepositAuthorization"("bookingId");

-- CreateIndex
CREATE INDEX "DepositAuthorization_provider_status_idx" ON "DepositAuthorization"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_providerEventId_key" ON "PaymentWebhookEvent"("providerEventId");
