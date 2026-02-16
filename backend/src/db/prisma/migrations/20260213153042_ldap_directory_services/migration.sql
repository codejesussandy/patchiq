-- AlterTable
ALTER TABLE "ldap_configs" ADD COLUMN     "email_attribute" TEXT NOT NULL DEFAULT 'mail',
ADD COLUMN     "group_filter" TEXT,
ADD COLUMN     "group_member_attribute" TEXT NOT NULL DEFAULT 'member',
ADD COLUMN     "group_search_base" TEXT,
ADD COLUMN     "last_sync_at" TIMESTAMP(3),
ADD COLUMN     "last_sync_status" TEXT,
ADD COLUMN     "name_attribute" TEXT NOT NULL DEFAULT 'cn',
ADD COLUMN     "sync_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sync_interval" INTEGER NOT NULL DEFAULT 360,
ADD COLUMN     "user_search_base" TEXT,
ADD COLUMN     "username_attribute" TEXT NOT NULL DEFAULT 'uid';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "auth_source" TEXT NOT NULL DEFAULT 'LOCAL',
ADD COLUMN     "ldap_config_id" TEXT,
ADD COLUMN     "ldap_dn" TEXT;

-- CreateTable
CREATE TABLE "ldap_group_mappings" (
    "id" TEXT NOT NULL,
    "ldap_config_id" TEXT NOT NULL,
    "ldap_group_dn" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ldap_group_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ldap_sync_jobs" (
    "id" TEXT NOT NULL,
    "ldap_config_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trigger_type" TEXT NOT NULL DEFAULT 'MANUAL',
    "users_found" INTEGER NOT NULL DEFAULT 0,
    "users_created" INTEGER NOT NULL DEFAULT 0,
    "users_updated" INTEGER NOT NULL DEFAULT 0,
    "users_deactivated" INTEGER NOT NULL DEFAULT 0,
    "users_reactivated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "sync_log" JSONB,
    "error_log" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ldap_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ldap_group_mappings_ldap_config_id_idx" ON "ldap_group_mappings"("ldap_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "ldap_group_mappings_ldap_config_id_ldap_group_dn_key" ON "ldap_group_mappings"("ldap_config_id", "ldap_group_dn");

-- CreateIndex
CREATE INDEX "ldap_sync_jobs_ldap_config_id_status_idx" ON "ldap_sync_jobs"("ldap_config_id", "status");

-- CreateIndex
CREATE INDEX "ldap_sync_jobs_created_at_idx" ON "ldap_sync_jobs"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_ldap_config_id_fkey" FOREIGN KEY ("ldap_config_id") REFERENCES "ldap_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ldap_group_mappings" ADD CONSTRAINT "ldap_group_mappings_ldap_config_id_fkey" FOREIGN KEY ("ldap_config_id") REFERENCES "ldap_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ldap_group_mappings" ADD CONSTRAINT "ldap_group_mappings_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ldap_sync_jobs" ADD CONSTRAINT "ldap_sync_jobs_ldap_config_id_fkey" FOREIGN KEY ("ldap_config_id") REFERENCES "ldap_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
