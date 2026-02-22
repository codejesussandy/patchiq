-- AlterTable
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'roles_organization_id_fkey'
  ) THEN
    ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
