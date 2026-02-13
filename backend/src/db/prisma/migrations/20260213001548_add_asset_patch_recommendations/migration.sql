/*
  Warnings:

  - You are about to drop the column `base_location_id` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `installed_location_id` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `stage` on the `patch_deployments` table. All the data in the column will be lost.
  - You are about to drop the column `target_groups` on the `patch_deployments` table. All the data in the column will be lost.
  - You are about to drop the column `downloaded_on` on the `patches` table. All the data in the column will be lost.
  - You are about to drop the column `release_date` on the `patches` table. All the data in the column will be lost.
  - You are about to drop the column `released_on` on the `patches` table. All the data in the column will be lost.
  - You are about to drop the `patch_endpoints` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patch_file_details` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `software_bundle_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `software_bundles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `software_catalog` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[command_id]` on the table `patch_deployment_tasks` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[command_id]` on the table `software_deployment_tasks` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "patch_endpoints" DROP CONSTRAINT "patch_endpoints_patch_id_fkey";

-- DropForeignKey
ALTER TABLE "patch_file_details" DROP CONSTRAINT "patch_file_details_patch_id_fkey";

-- DropForeignKey
ALTER TABLE "software_bundle_items" DROP CONSTRAINT "software_bundle_items_bundle_id_fkey";

-- DropForeignKey
ALTER TABLE "software_bundle_items" DROP CONSTRAINT "software_bundle_items_software_id_fkey";

-- DropIndex
DROP INDEX "assets_architecture_idx";

-- DropIndex
DROP INDEX "assets_installed_features_idx";

-- DropIndex
DROP INDEX "assets_os_edition_idx";

-- DropIndex
DROP INDEX "patch_deployments_stage_idx";

-- DropIndex
DROP INDEX "patches_superseded_at_idx";

-- AlterTable
ALTER TABLE "agent_commands" ADD COLUMN     "error_message" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "inventory_requested" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "assets" DROP COLUMN "base_location_id",
DROP COLUMN "installed_location_id";

-- AlterTable
ALTER TABLE "config_catalog" ALTER COLUMN "configuration_type" SET DEFAULT 'COMMAND',
ALTER COLUMN "architecture" SET DEFAULT 'X64',
ALTER COLUMN "command_type" SET DEFAULT 'POWERSHELL';

-- AlterTable
ALTER TABLE "config_deployments" ALTER COLUMN "selection_type" SET DEFAULT 'CONFIGURATION',
ALTER COLUMN "scope" SET DEFAULT 'ALL',
ALTER COLUMN "notify_to" SET DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "cpe_mappings" ALTER COLUMN "source" SET DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "discovered_devices" ALTER COLUMN "status" SET DEFAULT 'DISCOVERED';

-- AlterTable
ALTER TABLE "discovery_scans" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "ip_ranges" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'SYSTEM',
ALTER COLUMN "type" SET DEFAULT 'INFO';

-- AlterTable
ALTER TABLE "patch_bundles" ALTER COLUMN "download_status" SET DEFAULT 'PENDING',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "patch_deployment_tasks" ADD COLUMN     "command_id" TEXT,
ADD COLUMN     "output" TEXT,
ADD COLUMN     "retry_attempt" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "patch_deployments" DROP COLUMN "stage",
DROP COLUMN "target_groups",
ADD COLUMN     "approval_override_by" TEXT,
ADD COLUMN     "auto_rollback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skip_approval_check" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trigger_type" TEXT;

-- AlterTable
ALTER TABLE "patch_download_jobs" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "patch_vulnerabilities" ADD COLUMN     "correlation_source" TEXT NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "patches" DROP COLUMN "downloaded_on",
DROP COLUMN "release_date",
DROP COLUMN "released_on";

-- AlterTable
ALTER TABLE "reports" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "software_deployment_tasks" ADD COLUMN     "command_id" TEXT,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "output" TEXT,
ADD COLUMN     "started_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "software_deployments" ALTER COLUMN "deployment_type" SET DEFAULT 'INSTALL',
ALTER COLUMN "selection_type" SET DEFAULT 'APPLICATION',
ALTER COLUMN "scope" SET DEFAULT 'ALL',
ALTER COLUMN "notify_to" SET DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';

-- AlterTable
ALTER TABLE "vulnerability_db_sync" ALTER COLUMN "scan_job_unit" SET DEFAULT 'HOUR';

-- AlterTable
ALTER TABLE "vulnerability_exceptions" ALTER COLUMN "scope" SET DEFAULT 'GLOBAL',
ALTER COLUMN "source" SET DEFAULT 'VULNERABILITIES';

-- AlterTable
ALTER TABLE "vulnerability_jobs" ALTER COLUMN "scope" SET DEFAULT 'GLOBAL',
ALTER COLUMN "scan_type" SET DEFAULT 'INSTANT';

-- AlterTable
ALTER TABLE "zero_touch_configs" ADD COLUMN     "deployments_created" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_triggered_at" TIMESTAMP(3);

-- DropTable
DROP TABLE "patch_endpoints";

-- DropTable
DROP TABLE "patch_file_details";

-- DropTable
DROP TABLE "software_bundle_items";

-- DropTable
DROP TABLE "software_bundles";

-- DropTable
DROP TABLE "software_catalog";

-- CreateTable
CREATE TABLE "asset_patch_recommendations" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "vulnerability_id" TEXT NOT NULL,
    "patch_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECOMMENDED',
    "severity" TEXT NOT NULL,
    "cvss_score" DOUBLE PRECISION,
    "epss_score" DOUBLE PRECISION,
    "risk_score" DOUBLE PRECISION,
    "reason" TEXT,
    "affected_software" TEXT,
    "deployment_task_id" TEXT,
    "recommended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "deployed_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_patch_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_packages" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "vendor" TEXT,
    "category" TEXT,
    "platform" TEXT NOT NULL,
    "architecture" TEXT,
    "install_source" TEXT NOT NULL,
    "install_command" TEXT,
    "install_args" TEXT,
    "silent_install" BOOLEAN NOT NULL DEFAULT true,
    "requires_reboot" BOOLEAN NOT NULL DEFAULT false,
    "requires_root" BOOLEAN NOT NULL DEFAULT false,
    "minio_object_key" TEXT,
    "minio_bucket" TEXT,
    "file_name" TEXT,
    "file_size" BIGINT,
    "checksum" TEXT,
    "checksum_type" TEXT DEFAULT 'sha256',
    "bundle_object_key" TEXT,
    "bundle_checksum" TEXT,
    "bundle_size" BIGINT,
    "manifest_json" JSONB,
    "scripts_included" BOOLEAN NOT NULL DEFAULT false,
    "script_install" TEXT,
    "script_update" TEXT,
    "script_rollback" TEXT,
    "script_uninstall" TEXT,
    "download_url" TEXT,
    "description" TEXT,
    "release_notes" TEXT,
    "icon_url" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pre_install_script" TEXT,
    "post_install_script" TEXT,
    "uninstall_command" TEXT,
    "supports_rollback" BOOLEAN NOT NULL DEFAULT false,
    "rollback_command" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "software_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_bundles" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "platform" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_bundle_items" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hub_bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "computer_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "endpoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "endpoint_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "computer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_alerts" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "alert_config_id" TEXT,
    "alert" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "module" TEXT NOT NULL DEFAULT 'System',
    "attribute" TEXT NOT NULL DEFAULT '',
    "value" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_in_app" BOOLEAN NOT NULL DEFAULT true,
    "agent_email" BOOLEAN NOT NULL DEFAULT false,
    "deployment_in_app" BOOLEAN NOT NULL DEFAULT true,
    "deployment_email" BOOLEAN NOT NULL DEFAULT false,
    "vulnerability_in_app" BOOLEAN NOT NULL DEFAULT true,
    "vulnerability_email" BOOLEAN NOT NULL DEFAULT true,
    "alert_in_app" BOOLEAN NOT NULL DEFAULT true,
    "alert_email" BOOLEAN NOT NULL DEFAULT true,
    "system_in_app" BOOLEAN NOT NULL DEFAULT true,
    "system_email" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_patch_recommendations_deployment_task_id_key" ON "asset_patch_recommendations"("deployment_task_id");

-- CreateIndex
CREATE INDEX "asset_patch_recommendations_asset_id_status_idx" ON "asset_patch_recommendations"("asset_id", "status");

-- CreateIndex
CREATE INDEX "asset_patch_recommendations_vulnerability_id_idx" ON "asset_patch_recommendations"("vulnerability_id");

-- CreateIndex
CREATE INDEX "asset_patch_recommendations_patch_id_idx" ON "asset_patch_recommendations"("patch_id");

-- CreateIndex
CREATE INDEX "asset_patch_recommendations_status_idx" ON "asset_patch_recommendations"("status");

-- CreateIndex
CREATE INDEX "asset_patch_recommendations_severity_idx" ON "asset_patch_recommendations"("severity");

-- CreateIndex
CREATE INDEX "asset_patch_recommendations_risk_score_idx" ON "asset_patch_recommendations"("risk_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "asset_patch_recommendations_asset_id_vulnerability_id_patch_key" ON "asset_patch_recommendations"("asset_id", "vulnerability_id", "patch_id");

-- CreateIndex
CREATE UNIQUE INDEX "software_packages_package_id_key" ON "software_packages"("package_id");

-- CreateIndex
CREATE INDEX "software_packages_platform_idx" ON "software_packages"("platform");

-- CreateIndex
CREATE INDEX "software_packages_category_idx" ON "software_packages"("category");

-- CreateIndex
CREATE INDEX "software_packages_vendor_idx" ON "software_packages"("vendor");

-- CreateIndex
CREATE INDEX "software_packages_is_active_idx" ON "software_packages"("is_active");

-- CreateIndex
CREATE INDEX "software_packages_scripts_included_idx" ON "software_packages"("scripts_included");

-- CreateIndex
CREATE UNIQUE INDEX "hub_bundles_bundle_id_key" ON "hub_bundles"("bundle_id");

-- CreateIndex
CREATE INDEX "hub_bundles_platform_idx" ON "hub_bundles"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "hub_bundle_items_bundle_id_package_id_key" ON "hub_bundle_items"("bundle_id", "package_id");

-- CreateIndex
CREATE INDEX "asset_alerts_asset_id_idx" ON "asset_alerts"("asset_id");

-- CreateIndex
CREATE INDEX "asset_alerts_severity_idx" ON "asset_alerts"("severity");

-- CreateIndex
CREATE INDEX "asset_alerts_status_idx" ON "asset_alerts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE UNIQUE INDEX "patch_deployment_tasks_command_id_key" ON "patch_deployment_tasks"("command_id");

-- CreateIndex
CREATE INDEX "patch_deployment_tasks_command_id_idx" ON "patch_deployment_tasks"("command_id");

-- CreateIndex
CREATE UNIQUE INDEX "software_deployment_tasks_command_id_key" ON "software_deployment_tasks"("command_id");

-- CreateIndex
CREATE INDEX "software_deployment_tasks_command_id_idx" ON "software_deployment_tasks"("command_id");

-- AddForeignKey
ALTER TABLE "patch_deployment_tasks" ADD CONSTRAINT "patch_deployment_tasks_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "agent_commands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_patch_recommendations" ADD CONSTRAINT "asset_patch_recommendations_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_patch_recommendations" ADD CONSTRAINT "asset_patch_recommendations_vulnerability_id_fkey" FOREIGN KEY ("vulnerability_id") REFERENCES "vulnerabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_patch_recommendations" ADD CONSTRAINT "asset_patch_recommendations_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_patch_recommendations" ADD CONSTRAINT "asset_patch_recommendations_deployment_task_id_fkey" FOREIGN KEY ("deployment_task_id") REFERENCES "patch_deployment_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_bundle_items" ADD CONSTRAINT "hub_bundle_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "hub_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_bundle_items" ADD CONSTRAINT "hub_bundle_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "software_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_deployment_tasks" ADD CONSTRAINT "software_deployment_tasks_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "agent_commands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_alerts" ADD CONSTRAINT "asset_alerts_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
