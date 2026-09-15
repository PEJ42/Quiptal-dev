-- Keep existing historical records, but make the newest unsigned version the only pending one.
UPDATE "GeneratedContract" AS current
SET "status" = 'SUPERSEDED', "requiresResignature" = false
WHERE current."status" = 'AWAITING_SIGNATURE'
  AND EXISTS (
    SELECT 1
    FROM "GeneratedContract" AS newer
    WHERE newer."bookingId" = current."bookingId"
      AND newer."version" > current."version"
  );

UPDATE "SigningLink"
SET "revokedAt" = CURRENT_TIMESTAMP
WHERE "revokedAt" IS NULL
  AND "contractId" IN (
    SELECT "id" FROM "GeneratedContract" WHERE "status" = 'SUPERSEDED'
  );

-- SQLite supports partial indexes. This makes it impossible for the database to retain
-- more than one pending-signature contract for a booking, even under concurrent requests.
CREATE UNIQUE INDEX "GeneratedContract_one_pending_signature_per_booking"
ON "GeneratedContract" ("bookingId")
WHERE "status" = 'AWAITING_SIGNATURE';
