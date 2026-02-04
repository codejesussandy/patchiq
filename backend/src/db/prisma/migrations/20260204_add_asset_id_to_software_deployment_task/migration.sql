-- AlterTable
ALTER TABLE "software_deployment_tasks" ADD COLUMN "asset_id" TEXT;

-- AddForeignKey
ALTER TABLE "software_deployment_tasks" ADD CONSTRAINT "software_deployment_tasks_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "software_deployment_tasks_asset_id_idx" ON "software_deployment_tasks"("asset_id");
