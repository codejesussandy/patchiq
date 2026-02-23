-- CreateTable
CREATE TABLE "asset_managed_software" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "vendor" TEXT,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INSTALLED',
    "installed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cpe_vendor" TEXT,
    "cpe_product" TEXT,

    CONSTRAINT "asset_managed_software_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_managed_software_asset_id_package_id_key" ON "asset_managed_software"("asset_id", "package_id");

-- CreateIndex
CREATE INDEX "asset_managed_software_asset_id_status_idx" ON "asset_managed_software"("asset_id", "status");

-- AddForeignKey
ALTER TABLE "asset_managed_software" ADD CONSTRAINT "asset_managed_software_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
