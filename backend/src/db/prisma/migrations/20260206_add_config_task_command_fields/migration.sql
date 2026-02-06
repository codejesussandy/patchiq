-- AlterTable: Add command tracking fields to ConfigDeploymentTask
ALTER TABLE "config_deployment_tasks" ADD COLUMN IF NOT EXISTS "command_id" TEXT;
ALTER TABLE "config_deployment_tasks" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3);
ALTER TABLE "config_deployment_tasks" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);
ALTER TABLE "config_deployment_tasks" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE "config_deployment_tasks" ADD COLUMN IF NOT EXISTS "output" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "config_deployment_tasks_command_id_key" ON "config_deployment_tasks"("command_id");

-- AddForeignKey (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'config_deployment_tasks_command_id_fkey'
  ) THEN
    ALTER TABLE "config_deployment_tasks" ADD CONSTRAINT "config_deployment_tasks_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "agent_commands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
