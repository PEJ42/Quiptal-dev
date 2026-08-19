ALTER TABLE "Booking" ADD COLUMN "securityDepositOverrideCents" INTEGER;

-- Preserve any existing non-zero deposit as an explicit override. A zero-value
-- deposit begins using the calculated recommendation after this migration.
UPDATE "Booking"
SET "securityDepositOverrideCents" = "securityDepositCents"
WHERE "securityDepositCents" > 0;
