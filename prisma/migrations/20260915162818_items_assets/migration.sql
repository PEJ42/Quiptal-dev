-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "category" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "assetNumber" TEXT,
    "notes" TEXT,
    "photoReference" TEXT,
    "originalQuantity" INTEGER NOT NULL DEFAULT 1,
    "currentQuantity" INTEGER NOT NULL DEFAULT 1,
    "purchaseDate" DATETIME,
    "purchasePriceCents" INTEGER,
    "vendor" TEXT,
    "purchaseSource" TEXT,
    "purchaseCondition" TEXT,
    "currentCondition" TEXT,
    "shippingCostCents" INTEGER NOT NULL DEFAULT 0,
    "salesTaxCents" INTEGER NOT NULL DEFAULT 0,
    "otherFeesCents" INTEGER NOT NULL DEFAULT 0,
    "totalAcquisitionOverrideCents" INTEGER,
    "businessUsePercent" INTEGER NOT NULL DEFAULT 100,
    "accountingCategory" TEXT,
    "purchaseNotes" TEXT,
    "replacementValueCents" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "archiveReason" TEXT,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Item_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "fileReference" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "documentType" TEXT,
    "description" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'NOT_PROCESSED',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemDocument_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemDisposition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "dispositionDate" DATETIME NOT NULL,
    "grossAmountCents" INTEGER NOT NULL DEFAULT 0,
    "sellingFeesCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCostCents" INTEGER NOT NULL DEFAULT 0,
    "netAmountCents" INTEGER NOT NULL DEFAULT 0,
    "buyer" TEXT,
    "platform" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemDisposition_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingNumber" TEXT NOT NULL,
    "title" TEXT,
    "customerId" TEXT NOT NULL,
    "teamId" TEXT,
    "createdByUserId" TEXT,
    "ownerUserId" TEXT,
    "primaryContactId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "bookingTypeId" TEXT NOT NULL,
    "bookingStatusId" TEXT NOT NULL,
    "eventAddressLine1" TEXT,
    "eventAddressLine2" TEXT,
    "eventCity" TEXT,
    "eventRegion" TEXT,
    "eventPostalCode" TEXT,
    "eventCountry" TEXT,
    "billingAddressLine1Snapshot" TEXT,
    "billingAddressLine2Snapshot" TEXT,
    "billingCitySnapshot" TEXT,
    "billingRegionSnapshot" TEXT,
    "billingPostalCodeSnapshot" TEXT,
    "billingCountrySnapshot" TEXT,
    "notes" TEXT,
    "discountType" TEXT,
    "discountValue" INTEGER NOT NULL DEFAULT 0,
    "taxRateBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "securityDepositCents" INTEGER NOT NULL DEFAULT 0,
    "securityDepositOverrideCents" INTEGER,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "CustomerContact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_bookingTypeId_fkey" FOREIGN KEY ("bookingTypeId") REFERENCES "BookingType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_bookingStatusId_fkey" FOREIGN KEY ("bookingStatusId") REFERENCES "BookingStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("archivedAt", "billingAddressLine1Snapshot", "billingAddressLine2Snapshot", "billingCitySnapshot", "billingCountrySnapshot", "billingPostalCodeSnapshot", "billingRegionSnapshot", "bookingNumber", "bookingStatusId", "bookingTypeId", "createdAt", "createdByUserId", "customerId", "discountCents", "discountType", "discountValue", "endDate", "eventAddressLine1", "eventAddressLine2", "eventCity", "eventCountry", "eventPostalCode", "eventRegion", "id", "notes", "ownerUserId", "primaryContactId", "securityDepositCents", "securityDepositOverrideCents", "startDate", "subtotalCents", "taxCents", "taxRateBasisPoints", "teamId", "title", "totalCents", "updatedAt") SELECT "archivedAt", "billingAddressLine1Snapshot", "billingAddressLine2Snapshot", "billingCitySnapshot", "billingCountrySnapshot", "billingPostalCodeSnapshot", "billingRegionSnapshot", "bookingNumber", "bookingStatusId", "bookingTypeId", "createdAt", "createdByUserId", "customerId", "discountCents", "discountType", "discountValue", "endDate", "eventAddressLine1", "eventAddressLine2", "eventCity", "eventCountry", "eventPostalCode", "eventRegion", "id", "notes", "ownerUserId", "primaryContactId", "securityDepositCents", "securityDepositOverrideCents", "startDate", "subtotalCents", "taxCents", "taxRateBasisPoints", "teamId", "title", "totalCents", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_teamId_idx" ON "Booking"("teamId");
CREATE INDEX "Booking_createdByUserId_idx" ON "Booking"("createdByUserId");
CREATE INDEX "Booking_ownerUserId_idx" ON "Booking"("ownerUserId");
CREATE INDEX "Booking_startDate_idx" ON "Booking"("startDate");
CREATE INDEX "Booking_bookingStatusId_idx" ON "Booking"("bookingStatusId");
CREATE INDEX "Booking_bookingTypeId_idx" ON "Booking"("bookingTypeId");
CREATE INDEX "Booking_archivedAt_idx" ON "Booking"("archivedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Item_teamId_status_idx" ON "Item"("teamId", "status");

-- CreateIndex
CREATE INDEX "Item_ownerId_idx" ON "Item"("ownerId");

-- CreateIndex
CREATE INDEX "Item_productId_idx" ON "Item"("productId");

-- CreateIndex
CREATE INDEX "Item_serialNumber_idx" ON "Item"("serialNumber");

-- CreateIndex
CREATE INDEX "Item_assetNumber_idx" ON "Item"("assetNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDocument_fileReference_key" ON "ItemDocument"("fileReference");

-- CreateIndex
CREATE INDEX "ItemDocument_itemId_idx" ON "ItemDocument"("itemId");

-- CreateIndex
CREATE INDEX "ItemDisposition_itemId_dispositionDate_idx" ON "ItemDisposition"("itemId", "dispositionDate");
