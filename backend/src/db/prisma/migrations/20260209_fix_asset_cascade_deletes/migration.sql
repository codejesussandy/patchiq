-- AlterTable: Add ON DELETE CASCADE to patch_deployment_tasks.asset_id
ALTER TABLE "patch_deployment_tasks" DROP CONSTRAINT IF EXISTS "patch_deployment_tasks_asset_id_fkey";
ALTER TABLE "patch_deployment_tasks" ADD CONSTRAINT "patch_deployment_tasks_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add ON DELETE SET NULL to software_deployment_tasks.asset_id
ALTER TABLE "software_deployment_tasks" DROP CONSTRAINT IF EXISTS "software_deployment_tasks_asset_id_fkey";
ALTER TABLE "software_deployment_tasks" ADD CONSTRAINT "software_deployment_tasks_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add ON DELETE SET NULL to agents.asset_id
ALTER TABLE "agents" DROP CONSTRAINT IF EXISTS "agents_asset_id_fkey";
ALTER TABLE "agents" ADD CONSTRAINT "agents_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
