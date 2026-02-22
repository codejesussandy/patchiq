-- DropIndex
DROP INDEX IF EXISTS "asset_patch_recommendations_deployment_task_id_key";

-- CreateIndex
CREATE INDEX "asset_patch_recommendations_deployment_task_id_idx" ON "asset_patch_recommendations"("deployment_task_id");
