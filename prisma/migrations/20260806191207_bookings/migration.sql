-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingNumber" TEXT NOT NULL,
    "title" TEXT,
    "customerId" TEXT NOT NULL,
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
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "CustomerContact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_bookingTypeId_fkey" FOREIGN KEY ("bookingTypeId") REFERENCES "BookingType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_bookingStatusId_fkey" FOREIGN KEY ("bookingStatusId") REFERENCES "BookingStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "lineType" TEXT NOT NULL,
    "sourceCatalogId" TEXT,
    "snapshotName" TEXT NOT NULL,
    "snapshotDescription" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "taxable" BOOLEAN NOT NULL,
    "lineSubtotalCents" INTEGER NOT NULL,
    "replacementCostCentsSnapshot" INTEGER,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookingLine_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingBundleComponentSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingLineId" TEXT NOT NULL,
    "sourceProductId" TEXT,
    "productNameSnapshot" TEXT NOT NULL,
    "quantityPerBundle" INTEGER NOT NULL,
    "replacementCostCentsSnapshot" INTEGER,
    "displayOrder" INTEGER NOT NULL,
    CONSTRAINT "BookingBundleComponentSnapshot_bookingLineId_fkey" FOREIGN KEY ("bookingLineId") REFERENCES "BookingLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingActivity_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BookingActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- CreateIndex
CREATE INDEX "Booking_startDate_idx" ON "Booking"("startDate");

-- CreateIndex
CREATE INDEX "Booking_bookingStatusId_idx" ON "Booking"("bookingStatusId");

-- CreateIndex
CREATE INDEX "Booking_bookingTypeId_idx" ON "Booking"("bookingTypeId");

-- CreateIndex
CREATE INDEX "Booking_archivedAt_idx" ON "Booking"("archivedAt");

-- CreateIndex
CREATE INDEX "BookingLine_bookingId_idx" ON "BookingLine"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingLine_bookingId_displayOrder_key" ON "BookingLine"("bookingId", "displayOrder");

-- CreateIndex
CREATE INDEX "BookingBundleComponentSnapshot_bookingLineId_idx" ON "BookingBundleComponentSnapshot"("bookingLineId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingBundleComponentSnapshot_bookingLineId_displayOrder_key" ON "BookingBundleComponentSnapshot"("bookingLineId", "displayOrder");

-- CreateIndex
CREATE INDEX "BookingActivity_bookingId_idx" ON "BookingActivity"("bookingId");

-- CreateIndex
CREATE INDEX "BookingActivity_userId_idx" ON "BookingActivity"("userId");
