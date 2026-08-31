-- Team membership and invitation support. Existing single-workspace data is
-- placed into a default workspace so it remains available after the upgrade.
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "TeamMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "usedAt" DATETIME,
    "revokedAt" DATETIME,
    CONSTRAINT "TeamInvitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "User" ADD COLUMN "activeTeamId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "teamId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "ownerUserId" TEXT;

CREATE TABLE "BookingMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingMember_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TeamMembership_userId_teamId_key" ON "TeamMembership"("userId", "teamId");
CREATE INDEX "TeamMembership_teamId_role_idx" ON "TeamMembership"("teamId", "role");
CREATE UNIQUE INDEX "TeamInvitation_tokenHash_key" ON "TeamInvitation"("tokenHash");
CREATE INDEX "TeamInvitation_teamId_recipientEmail_idx" ON "TeamInvitation"("teamId", "recipientEmail");
CREATE INDEX "TeamInvitation_recipientEmail_idx" ON "TeamInvitation"("recipientEmail");
CREATE UNIQUE INDEX "BookingMember_bookingId_userId_key" ON "BookingMember"("bookingId", "userId");
CREATE INDEX "BookingMember_userId_idx" ON "BookingMember"("userId");
CREATE INDEX "Booking_teamId_idx" ON "Booking"("teamId");
CREATE INDEX "Booking_createdByUserId_idx" ON "Booking"("createdByUserId");
CREATE INDEX "Booking_ownerUserId_idx" ON "Booking"("ownerUserId");

INSERT INTO "Team" ("id", "name", "updatedAt")
VALUES ('legacy-default-team', 'Default workspace', CURRENT_TIMESTAMP);

INSERT INTO "TeamMembership" ("id", "userId", "teamId", "role")
SELECT 'legacy-membership-' || "id", "id", 'legacy-default-team',
       CASE WHEN "role" = 'ADMIN' THEN 'ADMIN' ELSE 'MEMBER' END
FROM "User";

UPDATE "User" SET "activeTeamId" = 'legacy-default-team';

UPDATE "Booking"
SET "teamId" = 'legacy-default-team',
    "createdByUserId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1),
    "ownerUserId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
