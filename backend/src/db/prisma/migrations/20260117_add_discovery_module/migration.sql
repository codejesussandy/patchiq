-- CreateTable
CREATE TABLE "ip_ranges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "range" TEXT NOT NULL,
    "description" TEXT,
    "credential_id" TEXT,
    "scan_schedule_type" TEXT,
    "scan_schedule_time" TEXT,
    "scan_schedule_day" INTEGER,
    "last_scanned" TIMESTAMP(3),
    "device_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_scans" (
    "id" TEXT NOT NULL,
    "ip_range_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "devices_found" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovered_devices" (
    "id" TEXT NOT NULL,
    "ip_range_id" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "hostname" TEXT,
    "mac_address" TEXT,
    "device_type" TEXT,
    "os" TEXT,
    "vendor" TEXT,
    "open_ports" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "status" TEXT NOT NULL DEFAULT 'discovered',
    "asset_id" TEXT,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovered_devices_pkey" PRIMARY KEY ("id")
);

-- AlterTable (DeviceCredential - add new fields)
ALTER TABLE "device_credentials" ADD COLUMN IF NOT EXISTS "snmp_community" TEXT;
ALTER TABLE "device_credentials" ADD COLUMN IF NOT EXISTS "snmp_version" TEXT;
ALTER TABLE "device_credentials" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "device_credentials" ADD COLUMN IF NOT EXISTS "last_used" TIMESTAMP(3);
ALTER TABLE "device_credentials" ADD COLUMN IF NOT EXISTS "created_by" TEXT;

-- Make username and password nullable for SNMP credentials
ALTER TABLE "device_credentials" ALTER COLUMN "username" DROP NOT NULL;
ALTER TABLE "device_credentials" RENAME COLUMN "password_enc" TO "password_enc_old";
ALTER TABLE "device_credentials" ADD COLUMN "password_enc" TEXT;
UPDATE "device_credentials" SET "password_enc" = "password_enc_old";
ALTER TABLE "device_credentials" DROP COLUMN "password_enc_old";

-- Drop is_default column if no longer needed
ALTER TABLE "device_credentials" DROP COLUMN IF EXISTS "is_default";

-- CreateIndex
CREATE INDEX "discovery_scans_ip_range_id_status_idx" ON "discovery_scans"("ip_range_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "discovered_devices_asset_id_key" ON "discovered_devices"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "discovered_devices_ip_range_id_ip_address_key" ON "discovered_devices"("ip_range_id", "ip_address");

-- CreateIndex
CREATE INDEX "discovered_devices_status_idx" ON "discovered_devices"("status");

-- AddForeignKey
ALTER TABLE "ip_ranges" ADD CONSTRAINT "ip_ranges_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "device_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_scans" ADD CONSTRAINT "discovery_scans_ip_range_id_fkey" FOREIGN KEY ("ip_range_id") REFERENCES "ip_ranges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_devices" ADD CONSTRAINT "discovered_devices_ip_range_id_fkey" FOREIGN KEY ("ip_range_id") REFERENCES "ip_ranges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
