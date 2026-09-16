-- Add replay-protection columns as nullable first so existing sessions
-- can be migrated safely.
ALTER TABLE "Session"
ADD COLUMN "parentSessionId" TEXT,
ADD COLUMN "refreshTokenJti" TEXT,
ADD COLUMN "replacedById" TEXT,
ADD COLUMN "reuseDetectedAt" TIMESTAMP(3),
ADD COLUMN "rotatedAt" TIMESTAMP(3),
ADD COLUMN "tokenFamilyId" TEXT;

-- Existing refresh JWT JTIs cannot be recovered from their SHA-256 hashes.
-- Give every legacy session its own deterministic, unique legacy identity
-- and its own token family. This prevents unrelated existing sessions from
-- being grouped into the same compromise domain.
UPDATE "Session"
SET
  "refreshTokenJti" = 'legacy:' || "id",
  "tokenFamilyId" = 'legacy:' || "id"
WHERE "refreshTokenJti" IS NULL
   OR "tokenFamilyId" IS NULL;

-- New application code requires these values for every session.
ALTER TABLE "Session"
ALTER COLUMN "refreshTokenJti" SET NOT NULL,
ALTER COLUMN "tokenFamilyId" SET NOT NULL;

-- Token identity must be globally unique.
CREATE UNIQUE INDEX "Session_refreshTokenJti_key"
ON "Session"("refreshTokenJti");

-- A rotated session may have at most one direct replacement.
CREATE UNIQUE INDEX "Session_replacedById_key"
ON "Session"("replacedById");

-- Family lookup is security-critical during replay response.
CREATE INDEX "Session_tokenFamilyId_idx"
ON "Session"("tokenFamilyId");

CREATE INDEX "Session_parentSessionId_idx"
ON "Session"("parentSessionId");

-- Preserve rotation-chain integrity.
ALTER TABLE "Session"
ADD CONSTRAINT "Session_parentSessionId_fkey"
FOREIGN KEY ("parentSessionId")
REFERENCES "Session"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Session"
ADD CONSTRAINT "Session_replacedById_fkey"
FOREIGN KEY ("replacedById")
REFERENCES "Session"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
