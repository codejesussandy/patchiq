-- Fix: AssetPatchRecommendation.deploymentTaskId FK needs ON DELETE SET NULL
-- Without this, deleting an asset fails because cascade-deleting PatchDeploymentTask
-- is blocked by the FK constraint from asset_patch_recommendations.

ALTER TABLE "asset_patch_recommendations"
  DROP CONSTRAINT IF EXISTS "asset_patch_recommendations_deployment_task_id_fkey";

ALTER TABLE "asset_patch_recommendations"
  ADD CONSTRAINT "asset_patch_recommendations_deployment_task_id_fkey"
  FOREIGN KEY ("deployment_task_id") REFERENCES "patch_deployment_tasks"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
