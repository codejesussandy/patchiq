ALTER TABLE "ldap_configs" ADD COLUMN IF NOT EXISTS "fqdn" VARCHAR(255);
ALTER TABLE "ldap_configs" ADD COLUMN IF NOT EXISTS "protocol" VARCHAR(10) DEFAULT 'LDAP';
ALTER TABLE "ldap_configs" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "ldap_configs" ADD COLUMN IF NOT EXISTS "timeout_seconds" INTEGER;
ALTER TABLE "ldap_configs" ADD COLUMN IF NOT EXISTS "auto_sync_interval" VARCHAR(50);
