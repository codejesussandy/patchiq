-- AlterTable
ALTER TABLE "patches" ADD COLUMN "superseded_at" TIMESTAMP(3);

-- CreateIndex (for querying non-superseded patches efficiently)
CREATE INDEX "patches_superseded_at_idx" ON "patches"("superseded_at");

-- Update existing superseded patches (set supersededAt to updatedAt if supersededBy is not empty)
UPDATE "patches"
SET "superseded_at" = "updated_at"
WHERE array_length("superseded_by", 1) > 0
  AND "superseded_at" IS NULL;
