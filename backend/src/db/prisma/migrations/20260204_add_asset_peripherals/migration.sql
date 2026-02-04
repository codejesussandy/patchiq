-- CreateTable
CREATE TABLE "asset_peripherals" (
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

-- CreateIndex
CREATE UNIQUE INDEX "asset_peripherals_asset_id_key" ON "asset_peripherals"("asset_id");

-- AddForeignKey
ALTER TABLE "asset_peripherals" ADD CONSTRAINT "asset_peripherals_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
