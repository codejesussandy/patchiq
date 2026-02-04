-- Migration: Add PatchBundle model and enhance Patch/PatchDeployment/PatchDeploymentTask
-- This migration adds Hub-centric patch bundle support and improves deployment tracking

-- AlterTable: Add new fields to patch_deployment_tasks
ALTER TABLE "patch_deployment_tasks" ADD COLUMN IF NOT EXISTS "agent_id" TEXT;
ALTER TABLE "patch_deployment_tasks" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "patch_deployment_tasks" ADD COLUMN IF NOT EXISTS "exit_code" INTEGER;
ALTER TABLE "patch_deployment_tasks" ADD COLUMN IF NOT EXISTS "installed_version" TEXT;
ALTER TABLE "patch_deployment_tasks" ADD COLUMN IF NOT EXISTS "previous_version" TEXT;
ALTER TABLE "patch_deployment_tasks" ADD COLUMN IF NOT EXISTS "rollback_available" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "patch_deployment_tasks" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "patch_deployment_tasks" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP(3);
ALTER TABLE "patch_deployment_tasks" ADD COLUMN IF NOT EXISTS "verify_result" TEXT;

-- AlterTable: Add new fields to patch_deployments
ALTER TABLE "patch_deployments" ADD COLUMN IF NOT EXISTS "retry_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "patch_deployments" ADD COLUMN IF NOT EXISTS "retry_delay" INTEGER NOT NULL DEFAULT 300;
ALTER TABLE "patch_deployments" ADD COLUMN IF NOT EXISTS "target_agent_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "patch_deployments" ADD COLUMN IF NOT EXISTS "target_group_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable: Add new fields to patches
ALTER TABLE "patches" ADD COLUMN IF NOT EXISTS "patch_type" TEXT NOT NULL DEFAULT 'UPDATE';
ALTER TABLE "patches" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);
ALTER TABLE "patches" ADD COLUMN IF NOT EXISTS "supports_rollback" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add asset_id to software_deployment_tasks (from schema sync)
ALTER TABLE "software_deployment_tasks" ADD COLUMN IF NOT EXISTS "asset_id" TEXT;

-- CreateTable: asset_peripherals
CREATE TABLE IF NOT EXISTS "asset_peripherals" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "monitor_count" INTEGER NOT NULL DEFAULT 0,
    "usb_device_count" INTEGER NOT NULL DEFAULT 0,
    "printer_count" INTEGER NOT NULL DEFAULT 0,
    "audio_device_count" INTEGER NOT NULL DEFAULT 0,
    "bluetooth_device_count" INTEGER NOT NULL DEFAULT 0,
    "raw_payload" JSONB,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_peripherals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: patch_bundles (NEW - Hub-centric patch storage)
CREATE TABLE IF NOT EXISTS "patch_bundles" (
    "id" TEXT NOT NULL,
    "patch_id" TEXT NOT NULL,
    "minio_bucket" TEXT NOT NULL DEFAULT 'patches',
    "bundle_object_key" TEXT,
    "bundle_checksum" TEXT,
    "bundle_size" BIGINT,
    "manifest_json" JSONB,
    "scripts_included" BOOLEAN NOT NULL DEFAULT false,
    "script_install" TEXT,
    "script_rollback" TEXT,
    "script_verify" TEXT,
    "script_uninstall" TEXT,
    "source_url" TEXT,
    "download_status" TEXT NOT NULL DEFAULT 'pending',
    "downloaded_at" TIMESTAMP(3),
    "download_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "file_name" TEXT,
    "file_size" BIGINT,
    "file_checksum" TEXT,
    "checksum_type" TEXT DEFAULT 'sha256',
    "requires_root" BOOLEAN NOT NULL DEFAULT true,
    "timeout_seconds" INTEGER NOT NULL DEFAULT 3600,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patch_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "asset_peripherals_asset_id_key" ON "asset_peripherals"("asset_id");
CREATE UNIQUE INDEX IF NOT EXISTS "patch_bundles_patch_id_key" ON "patch_bundles"("patch_id");

-- CreateIndex: Performance indexes
CREATE INDEX IF NOT EXISTS "patch_bundles_download_status_idx" ON "patch_bundles"("download_status");
CREATE INDEX IF NOT EXISTS "patch_bundles_bundle_object_key_idx" ON "patch_bundles"("bundle_object_key");
CREATE INDEX IF NOT EXISTS "patch_deployment_tasks_agent_id_idx" ON "patch_deployment_tasks"("agent_id");
CREATE INDEX IF NOT EXISTS "patch_deployment_tasks_asset_id_idx" ON "patch_deployment_tasks"("asset_id");
CREATE INDEX IF NOT EXISTS "patches_vendor_idx" ON "patches"("vendor");
CREATE INDEX IF NOT EXISTS "software_deployment_tasks_asset_id_idx" ON "software_deployment_tasks"("asset_id");

-- AddForeignKey: asset_peripherals -> assets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'asset_peripherals_asset_id_fkey'
    ) THEN
        ALTER TABLE "asset_peripherals" ADD CONSTRAINT "asset_peripherals_asset_id_fkey"
        FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: patch_bundles -> patches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'patch_bundles_patch_id_fkey'
    ) THEN
        ALTER TABLE "patch_bundles" ADD CONSTRAINT "patch_bundles_patch_id_fkey"
        FOREIGN KEY ("patch_id") REFERENCES "patches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: software_deployment_tasks -> assets (optional)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'software_deployment_tasks_asset_id_fkey'
    ) THEN
        ALTER TABLE "software_deployment_tasks" ADD CONSTRAINT "software_deployment_tasks_asset_id_fkey"
        FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
