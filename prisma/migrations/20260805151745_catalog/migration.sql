-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "defaultRentalCents" INTEGER NOT NULL DEFAULT 0,
    "replacementCostCents" INTEGER,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "imageReference" TEXT,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fixedRentalCents" INTEGER NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "imageReference" TEXT,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BundleComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BundleComponent_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BundleComponent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_archivedAt_idx" ON "Product"("archivedAt");

-- CreateIndex
CREATE INDEX "Bundle_archivedAt_idx" ON "Bundle"("archivedAt");

-- CreateIndex
CREATE INDEX "BundleComponent_productId_idx" ON "BundleComponent"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleComponent_bundleId_displayOrder_key" ON "BundleComponent"("bundleId", "displayOrder");
