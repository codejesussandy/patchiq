-- AlterTable
ALTER TABLE "agent_versions" ADD COLUMN     "download_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_deprecated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_recommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "release_notes" TEXT;

-- CreateTable
CREATE TABLE "distribution_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "url" TEXT NOT NULL,
    "version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "distribution_servers_name_key" ON "distribution_servers"("name");

-- CreateIndex
CREATE INDEX "distribution_servers_status_idx" ON "distribution_servers"("status");
