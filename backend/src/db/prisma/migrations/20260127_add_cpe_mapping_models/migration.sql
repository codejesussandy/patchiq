-- Migration: Add CPE Mapping Models for Vulnerability Correlation Improvement
-- Phase 1: Database Schema Updates

-- AlterTable: Add CPE fields to asset_software
ALTER TABLE "asset_software" ADD COLUMN     "cpe_mapping_id" TEXT,
ADD COLUMN     "cpe_product" TEXT,
ADD COLUMN     "cpe_vendor" TEXT,
ADD COLUMN     "match_confidence" DOUBLE PRECISION,
ADD COLUMN     "normalized_version" TEXT;

-- AlterTable: Add CPE fields to vulnerability_software
ALTER TABLE "vulnerability_software" ADD COLUMN     "cpe_product" TEXT,
ADD COLUMN     "cpe_uri" TEXT,
ADD COLUMN     "cpe_vendor" TEXT,
ADD COLUMN     "version_end" TEXT,
ADD COLUMN     "version_end_type" TEXT,
ADD COLUMN     "version_start" TEXT,
ADD COLUMN     "version_start_type" TEXT;

-- CreateTable: cpe_mappings - Maps agent software names to CPE identifiers
CREATE TABLE "cpe_mappings" (
    "id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "agent_vendor" TEXT,
    "platform" TEXT,
    "package_manager" TEXT,
    "cpe_vendor" TEXT NOT NULL,
    "cpe_product" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpe_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: unmatched_software - Tracks software that couldn't be mapped
CREATE TABLE "unmatched_software" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT NOT NULL DEFAULT '',
    "platform" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "unmatched_software_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: cpe_mappings indexes
CREATE INDEX "cpe_mappings_agent_name_idx" ON "cpe_mappings"("agent_name");
CREATE INDEX "cpe_mappings_cpe_vendor_cpe_product_idx" ON "cpe_mappings"("cpe_vendor", "cpe_product");
CREATE UNIQUE INDEX "cpe_mappings_agent_name_agent_vendor_platform_package_manag_key" ON "cpe_mappings"("agent_name", "agent_vendor", "platform", "package_manager");

-- CreateIndex: unmatched_software indexes
CREATE INDEX "unmatched_software_occurrences_idx" ON "unmatched_software"("occurrences" DESC);
CREATE INDEX "unmatched_software_resolved_idx" ON "unmatched_software"("resolved");
CREATE UNIQUE INDEX "unmatched_software_name_vendor_key" ON "unmatched_software"("name", "vendor");

-- CreateIndex: asset_software CPE index for correlation queries
CREATE INDEX "asset_software_cpe_vendor_cpe_product_idx" ON "asset_software"("cpe_vendor", "cpe_product");

-- CreateIndex: vulnerability_software CPE index for correlation queries
CREATE INDEX "vulnerability_software_cpe_vendor_cpe_product_idx" ON "vulnerability_software"("cpe_vendor", "cpe_product");
