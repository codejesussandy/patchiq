-- Step 1: Add nullable role_id column
ALTER TABLE "users" ADD COLUMN "role_id" TEXT;

-- Step 2: Backfill role_id from the old string "role" column
-- Match ADMIN (case-insensitive) to the 'admin' role, everything else to 'user' role
UPDATE "users"
SET "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'admin')
WHERE LOWER("role") = 'admin';

UPDATE "users"
SET "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'user')
WHERE "role_id" IS NULL;

-- Step 3: Make role_id NOT NULL
ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;

-- Step 4: Drop old role column
ALTER TABLE "users" DROP COLUMN "role";

-- Step 5: Add FK constraint with ON DELETE RESTRICT
ALTER TABLE "users"
ADD CONSTRAINT "users_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "roles"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Add index on role_id
CREATE INDEX "users_role_id_idx" ON "users"("role_id");
