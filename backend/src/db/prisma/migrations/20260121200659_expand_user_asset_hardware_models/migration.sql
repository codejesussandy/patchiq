-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "contact_number" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_onboarded" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT,
    "department_id" TEXT,
    "location_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organization_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "branch_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "name" TEXT,
    "hostname" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "os" TEXT,
    "os_version" TEXT,
    "architecture" TEXT,
    "agent_version" TEXT,
    "ip_address" TEXT,
    "mac_address" TEXT,
    "serial_number" TEXT,
    "last_heartbeat" TIMESTAMP(3),
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_hash" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "asset_id" TEXT,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_commands" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "scheduled_at" TIMESTAMP(3),
    "executed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_telemetry" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "cpu_usage" DOUBLE PRECISION,
    "memory_usage" DOUBLE PRECISION,
    "disk_usage" DOUBLE PRECISION,
    "uptime" INTEGER,
    "network_in_bps" BIGINT,
    "network_out_bps" BIGINT,
    "process_count" INTEGER,
    "pending_reboot" BOOLEAN,
    "raw_payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tags" (
    "agent_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "agent_tags_pkey" PRIMARY KEY ("agent_id","tag")
);

-- CreateTable
CREATE TABLE "agent_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_group_memberships" (
    "agent_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "agent_group_memberships_pkey" PRIMARY KEY ("agent_id","group_id")
);

-- CreateTable
CREATE TABLE "agent_downloads" (
    "id" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "release_date" TIMESTAMP(3) NOT NULL,
    "download_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_versions" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "architecture" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "file_path" TEXT,
    "file_size" BIGINT,
    "checksum" TEXT,
    "last_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Endpoint',
    "status" TEXT NOT NULL DEFAULT 'In Use',
    "serial_number" TEXT,
    "asset_tag" TEXT,
    "os" TEXT,
    "os_version" TEXT,
    "ip_address" TEXT,
    "mac_address" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "hostname" TEXT,
    "purchase_date" TIMESTAMP(3),
    "warranty_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "owner_id" TEXT,
    "owner_name" TEXT,
    "owner_email" TEXT,
    "owner_phone" TEXT,
    "owner_department" TEXT,
    "vendor" TEXT,
    "purchase_order_number" TEXT,
    "amc_cost" TEXT,
    "amc_expiry_date" TIMESTAMP(3),
    "amc_vendor" TEXT,
    "end_of_life" TIMESTAMP(3),
    "end_of_support" TIMESTAMP(3),
    "purchase_cost" DECIMAL(12,2),
    "current_value" DECIMAL(12,2),
    "salvage_value" DECIMAL(12,2),
    "currency" TEXT DEFAULT 'USD',
    "depreciation_type" TEXT,
    "depreciation_rate" DECIMAL(5,2),
    "invoice_number" TEXT,
    "base_location_id" TEXT,
    "installed_location_id" TEXT,
    "organization_id" TEXT,
    "location_id" TEXT,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_hardware" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "cpu" TEXT,
    "cpu_cores" INTEGER,
    "cpu_manufacturer" TEXT,
    "cpu_threads" INTEGER,
    "cpu_speed_mhz" INTEGER,
    "ram_total" BIGINT,
    "ram_slots" INTEGER,
    "ram_type" TEXT,
    "disk_total" BIGINT,
    "disk_free" BIGINT,
    "disk_type" TEXT,
    "gpu_model" TEXT,
    "gpu_memory_mb" INTEGER,
    "bios_vendor" TEXT,
    "bios_version" TEXT,
    "system_sku" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "raw_payload" JSONB,
    "collected_at" TIMESTAMP(3),

    CONSTRAINT "asset_hardware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_software" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "vendor" TEXT,
    "install_date" TIMESTAMP(3),
    "install_path" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,

    CONSTRAINT "asset_software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_software_inventory" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "os_name" TEXT,
    "os_version" TEXT,
    "os_build" TEXT,
    "total_apps" INTEGER,
    "total_services" INTEGER,
    "raw_payload" JSONB,
    "collected_at" TIMESTAMP(3),

    CONSTRAINT "asset_software_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_security" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "antivirus_installed" BOOLEAN,
    "antivirus_name" TEXT,
    "antivirus_updated" TIMESTAMP(3),
    "firewall_enabled" BOOLEAN,
    "encryption_enabled" BOOLEAN,
    "last_security_scan" TIMESTAMP(3),
    "compliance_score" DOUBLE PRECISION,

    CONSTRAINT "asset_security_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "compliance" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_tags" (
    "asset_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "asset_tags_pkey" PRIMARY KEY ("asset_id","tag_id")
);

-- CreateTable
CREATE TABLE "vulnerabilities" (
    "id" TEXT NOT NULL,
    "cve_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL,
    "cvss3_base_score" DOUBLE PRECISION,
    "cvss2_base_score" DOUBLE PRECISION,
    "cvss3_attack_vector" TEXT,
    "cvss3_attack_complexity" TEXT,
    "cvss3_privileges_required" TEXT,
    "cvss3_scope" TEXT,
    "cvss3_confidentiality" TEXT,
    "cvss3_integrity" TEXT,
    "cvss3_availability" TEXT,
    "cvss3_impact_score" DOUBLE PRECISION,
    "cvss3_vector_string" TEXT,
    "cvss2_severity" TEXT,
    "epss" DOUBLE PRECISION,
    "risk_score" DOUBLE PRECISION,
    "exploitable" BOOLEAN NOT NULL DEFAULT false,
    "is_zero_day" BOOLEAN NOT NULL DEFAULT false,
    "published_date" TIMESTAMP(3),
    "last_modified" TIMESTAMP(3),
    "patch_available" BOOLEAN NOT NULL DEFAULT false,
    "fix_recommendation" TEXT,
    "mitre_tactic" TEXT,
    "mitre_technique" TEXT,
    "mitre_sub_technique" TEXT,
    "mitre_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerability_references" (
    "id" TEXT NOT NULL,
    "vulnerability_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "vulnerability_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerability_software" (
    "id" TEXT NOT NULL,
    "vulnerability_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "release_version" TEXT,
    "fixed_version" TEXT,
    "vendor" TEXT,

    CONSTRAINT "vulnerability_software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_vulnerabilities" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "vulnerability_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "asset_vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerability_exceptions" (
    "id" TEXT NOT NULL,
    "vulnerability_id" TEXT NOT NULL,
    "cve" TEXT NOT NULL,
    "exception_type" TEXT NOT NULL,
    "reason_for_exclusion" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'Global',
    "source" TEXT NOT NULL DEFAULT 'vulnerabilities',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vulnerability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exception_endpoints" (
    "id" TEXT NOT NULL,
    "exception_id" TEXT NOT NULL,
    "endpoint_id" TEXT NOT NULL,

    CONSTRAINT "exception_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patches" (
    "id" TEXT NOT NULL,
    "patch_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "software" TEXT,
    "description" TEXT,
    "severity" TEXT NOT NULL,
    "category" TEXT,
    "vendor" TEXT,
    "product" TEXT,
    "os" TEXT,
    "os_version" TEXT,
    "platform" TEXT,
    "architecture" TEXT,
    "kb_number" TEXT,
    "bulletin_id" TEXT,
    "release_date" TIMESTAMP(3),
    "released_on" TIMESTAMP(3),
    "downloaded_on" TIMESTAMP(3),
    "size" BIGINT,
    "size_formatted" TEXT,
    "download_url" TEXT,
    "reference_url" TEXT,
    "reboot_required" BOOLEAN NOT NULL DEFAULT false,
    "support_uninstallation" BOOLEAN NOT NULL DEFAULT false,
    "languages_supported" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cve_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "status" TEXT DEFAULT 'Draft',
    "download_status" TEXT DEFAULT 'None',
    "supersedes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "superseded_by" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "operational_status_since" TIMESTAMP(3),
    "endpoints" INTEGER NOT NULL DEFAULT 0,
    "test_status" TEXT NOT NULL DEFAULT 'Not Tested',
    "test_result" TEXT,
    "tested_by" TEXT,
    "tested_at" TIMESTAMP(3),
    "test_notes" TEXT,
    "test_environment" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'Pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "rejection_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patch_deployments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deployment_id" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INSTANT',
    "config_type" TEXT NOT NULL DEFAULT 'INSTALL',
    "scope" TEXT NOT NULL DEFAULT 'Endpoint',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stage" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "pending" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "target_groups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patch_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patch_deployment_tasks" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "patch_deployment_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patch_affected_products" (
    "id" TEXT NOT NULL,
    "patch_id" TEXT NOT NULL,
    "software_name" TEXT NOT NULL,
    "version" TEXT,
    "vendor" TEXT,
    "installed_on" INTEGER NOT NULL DEFAULT 0,
    "platform" TEXT,

    CONSTRAINT "patch_affected_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patch_file_details" (
    "id" TEXT NOT NULL,
    "patch_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "version" TEXT,
    "size" TEXT,
    "size_bytes" BIGINT,
    "path" TEXT,
    "minio_object_key" TEXT,
    "minio_bucket" TEXT,
    "checksum" TEXT,
    "checksum_type" TEXT,
    "source_url" TEXT,
    "download_status" TEXT NOT NULL DEFAULT 'pending',
    "downloaded_at" TIMESTAMP(3),
    "download_error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "patch_file_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patch_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "platform" TEXT,
    "base_url" TEXT NOT NULL,
    "url_patterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 50,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "requires_auth" BOOLEAN NOT NULL DEFAULT false,
    "auth_type" TEXT,
    "auth_config" JSONB,
    "sync_schedule" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patch_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patch_download_jobs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "source_id" TEXT,
    "patch_id" TEXT,
    "source_url" TEXT NOT NULL,
    "target_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "expected_size" BIGINT,
    "expected_checksum" TEXT,
    "checksum_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "downloaded_bytes" BIGINT,
    "actual_checksum" TEXT,
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patch_download_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patch_vulnerabilities" (
    "id" TEXT NOT NULL,
    "patch_id" TEXT NOT NULL,
    "cve_number" TEXT NOT NULL,
    "severity" TEXT,
    "description" TEXT,
    "published_date" TIMESTAMP(3),

    CONSTRAINT "patch_vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patch_endpoints" (
    "id" TEXT NOT NULL,
    "patch_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "name" TEXT NOT NULL,
    "os" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Online',
    "last_seen" TIMESTAMP(3),

    CONSTRAINT "patch_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patch_tests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "application_type" TEXT NOT NULL DEFAULT 'ALL',
    "applications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" TEXT NOT NULL DEFAULT 'ALL_COMPUTERS',
    "computers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "groups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patch_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zero_touch_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "application_type" TEXT NOT NULL DEFAULT 'ALL',
    "applications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" TEXT NOT NULL DEFAULT 'ALL_COMPUTERS',
    "computers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "groups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auto_deployment_rules" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zero_touch_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "result" JSONB,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'CSV',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "parameters" JSONB,
    "file_path" TEXT,
    "file_size" BIGINT,
    "generated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'CSV',
    "frequency" TEXT NOT NULL,
    "parameters" JSONB,
    "recipients" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ldap_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 389,
    "base_dn" TEXT NOT NULL,
    "bind_dn_enc" TEXT NOT NULL,
    "bind_password_enc" TEXT NOT NULL,
    "user_filter" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ldap_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_categories" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criticality" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_licenses" (
    "id" TEXT NOT NULL,
    "license_name" TEXT NOT NULL,
    "software_name" TEXT NOT NULL,
    "publisher" TEXT,
    "license_key" TEXT,
    "purchase_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "license_count" INTEGER NOT NULL DEFAULT 1,
    "vendor_name" TEXT NOT NULL,
    "cost" DECIMAL(10,2),
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "software_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_licenses" (
    "id" TEXT NOT NULL,
    "license_name" TEXT NOT NULL,
    "os_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "license_count" INTEGER NOT NULL DEFAULT 1,
    "vendor_name" TEXT NOT NULL,
    "license_key" TEXT,
    "purchase_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "publisher" TEXT,
    "cost" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "os_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patch_jobs" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SCHEDULE',
    "config_type" TEXT NOT NULL DEFAULT 'INSTALL',
    "scope" TEXT NOT NULL DEFAULT 'Global',
    "endpoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "patches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deployment_policy" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 1,
    "batch_size" INTEGER,
    "notify_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerability_jobs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'Global',
    "endpoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scan_type" TEXT NOT NULL DEFAULT 'instant',
    "schedule_date" TEXT,
    "schedule_time" TEXT,
    "recurrence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_time" TEXT,
    "last_run" TIMESTAMP(3),
    "next_run" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vulnerability_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerability_db_sync" (
    "id" TEXT NOT NULL,
    "scan_job_interval" INTEGER NOT NULL DEFAULT 24,
    "scan_job_unit" TEXT NOT NULL DEFAULT 'Hour',
    "database_sync_time" TEXT NOT NULL DEFAULT '02:00:00',
    "last_sync" TIMESTAMP(3),
    "total_cve" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vulnerability_db_sync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_catalog" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "application_name" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "os" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'latest',
    "application_location_type" TEXT NOT NULL DEFAULT 'URL',
    "installation_command" TEXT,
    "uninstallation_command" TEXT,
    "upgrade_command" TEXT,
    "icon_url" TEXT,
    "self_service" BOOLEAN NOT NULL DEFAULT true,
    "architecture" TEXT NOT NULL DEFAULT 'x64',
    "application_type" TEXT NOT NULL DEFAULT 'EXE',
    "application_file_url" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_bundles" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "bundle_name" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_bundle_items" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "software_id" TEXT NOT NULL,

    CONSTRAINT "software_bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_deployments" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "deployment_name" TEXT NOT NULL,
    "description" TEXT,
    "deployment_type" TEXT NOT NULL DEFAULT 'install',
    "selection_type" TEXT NOT NULL DEFAULT 'application',
    "selected_items" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" TEXT NOT NULL DEFAULT 'all',
    "endpoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deployment_policy" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 1,
    "notify_to" TEXT NOT NULL DEFAULT 'admin',
    "stage" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "pending" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_deployment_tasks" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "endpoint_id" TEXT,
    "endpoint_name" TEXT NOT NULL,
    "endpoint_os" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_deployment_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_catalog" (
    "id" TEXT NOT NULL,
    "configuration_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "configuration_type" TEXT NOT NULL DEFAULT 'command',
    "architecture" TEXT NOT NULL DEFAULT 'x64',
    "is_remediation" BOOLEAN NOT NULL DEFAULT false,
    "command_type" TEXT NOT NULL DEFAULT 'powershell',
    "command" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_bundles" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "bundle_name" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_bundle_items" (
    "id" TEXT NOT NULL,
    "bundle_id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,

    CONSTRAINT "config_bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_deployments" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "deployment_name" TEXT NOT NULL,
    "description" TEXT,
    "selection_type" TEXT NOT NULL DEFAULT 'configuration',
    "selected_items" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" TEXT NOT NULL DEFAULT 'all',
    "endpoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deployment_policy" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 1,
    "notify_to" TEXT NOT NULL DEFAULT 'admin',
    "stage" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "pending" INTEGER NOT NULL DEFAULT 0,
    "succeeded" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_deployment_tasks" (
    "id" TEXT NOT NULL,
    "deployment_id" TEXT NOT NULL,
    "endpoint_id" TEXT,
    "endpoint_name" TEXT NOT NULL,
    "endpoint_os" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_deployment_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_policies" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INSTANT',
    "supported_module" TEXT NOT NULL DEFAULT 'All',
    "related_type" TEXT NOT NULL DEFAULT 'No Relation',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PatchToPatchDeployment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "branches_organization_id_name_key" ON "branches"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_branch_id_name_key" ON "departments"("branch_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agents_machine_id_key" ON "agents"("machine_id");

-- CreateIndex
CREATE UNIQUE INDEX "agents_asset_id_key" ON "agents"("asset_id");

-- CreateIndex
CREATE INDEX "agents_status_idx" ON "agents"("status");

-- CreateIndex
CREATE INDEX "agent_commands_agent_id_status_idx" ON "agent_commands"("agent_id", "status");

-- CreateIndex
CREATE INDEX "agent_telemetry_agent_id_timestamp_idx" ON "agent_telemetry"("agent_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "agent_groups_name_key" ON "agent_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agent_downloads_os_version_key" ON "agent_downloads"("os", "version");

-- CreateIndex
CREATE UNIQUE INDEX "agent_versions_platform_architecture_version_key" ON "agent_versions"("platform", "architecture", "version");

-- CreateIndex
CREATE UNIQUE INDEX "assets_serial_number_key" ON "assets"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_tag_key" ON "assets"("asset_tag");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_type_idx" ON "assets"("type");

-- CreateIndex
CREATE INDEX "assets_owner_id_idx" ON "assets"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_hardware_asset_id_key" ON "asset_hardware"("asset_id");

-- CreateIndex
CREATE INDEX "asset_software_asset_id_idx" ON "asset_software"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_software_inventory_asset_id_key" ON "asset_software_inventory"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_security_asset_id_key" ON "asset_security"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vulnerabilities_cve_id_key" ON "vulnerabilities"("cve_id");

-- CreateIndex
CREATE INDEX "vulnerabilities_severity_idx" ON "vulnerabilities"("severity");

-- CreateIndex
CREATE INDEX "vulnerabilities_is_zero_day_idx" ON "vulnerabilities"("is_zero_day");

-- CreateIndex
CREATE INDEX "vulnerabilities_published_date_idx" ON "vulnerabilities"("published_date");

-- CreateIndex
CREATE INDEX "vulnerabilities_risk_score_idx" ON "vulnerabilities"("risk_score");

-- CreateIndex
CREATE INDEX "asset_vulnerabilities_status_idx" ON "asset_vulnerabilities"("status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_vulnerabilities_asset_id_vulnerability_id_key" ON "asset_vulnerabilities"("asset_id", "vulnerability_id");

-- CreateIndex
CREATE INDEX "vulnerability_exceptions_cve_idx" ON "vulnerability_exceptions"("cve");

-- CreateIndex
CREATE UNIQUE INDEX "exception_endpoints_exception_id_endpoint_id_key" ON "exception_endpoints"("exception_id", "endpoint_id");

-- CreateIndex
CREATE UNIQUE INDEX "patches_patch_id_key" ON "patches"("patch_id");

-- CreateIndex
CREATE INDEX "patches_severity_idx" ON "patches"("severity");

-- CreateIndex
CREATE INDEX "patches_approval_status_idx" ON "patches"("approval_status");

-- CreateIndex
CREATE INDEX "patches_test_status_idx" ON "patches"("test_status");

-- CreateIndex
CREATE INDEX "patches_os_idx" ON "patches"("os");

-- CreateIndex
CREATE INDEX "patches_category_idx" ON "patches"("category");

-- CreateIndex
CREATE UNIQUE INDEX "patch_deployments_deployment_id_key" ON "patch_deployments"("deployment_id");

-- CreateIndex
CREATE INDEX "patch_deployments_status_idx" ON "patch_deployments"("status");

-- CreateIndex
CREATE INDEX "patch_deployments_stage_idx" ON "patch_deployments"("stage");

-- CreateIndex
CREATE INDEX "patch_deployment_tasks_deployment_id_status_idx" ON "patch_deployment_tasks"("deployment_id", "status");

-- CreateIndex
CREATE INDEX "patch_affected_products_patch_id_idx" ON "patch_affected_products"("patch_id");

-- CreateIndex
CREATE INDEX "patch_file_details_patch_id_idx" ON "patch_file_details"("patch_id");

-- CreateIndex
CREATE INDEX "patch_file_details_download_status_idx" ON "patch_file_details"("download_status");

-- CreateIndex
CREATE INDEX "patch_file_details_minio_object_key_idx" ON "patch_file_details"("minio_object_key");

-- CreateIndex
CREATE INDEX "patch_sources_vendor_idx" ON "patch_sources"("vendor");

-- CreateIndex
CREATE INDEX "patch_sources_category_idx" ON "patch_sources"("category");

-- CreateIndex
CREATE INDEX "patch_sources_is_enabled_idx" ON "patch_sources"("is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "patch_sources_vendor_name_key" ON "patch_sources"("vendor", "name");

-- CreateIndex
CREATE UNIQUE INDEX "patch_download_jobs_job_id_key" ON "patch_download_jobs"("job_id");

-- CreateIndex
CREATE INDEX "patch_download_jobs_status_idx" ON "patch_download_jobs"("status");

-- CreateIndex
CREATE INDEX "patch_download_jobs_source_id_idx" ON "patch_download_jobs"("source_id");

-- CreateIndex
CREATE INDEX "patch_download_jobs_patch_id_idx" ON "patch_download_jobs"("patch_id");

-- CreateIndex
CREATE INDEX "patch_download_jobs_priority_idx" ON "patch_download_jobs"("priority");

-- CreateIndex
CREATE INDEX "patch_vulnerabilities_patch_id_idx" ON "patch_vulnerabilities"("patch_id");

-- CreateIndex
CREATE INDEX "patch_endpoints_patch_id_idx" ON "patch_endpoints"("patch_id");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_type_idx" ON "jobs"("type");

-- CreateIndex
CREATE INDEX "reports_type_idx" ON "reports"("type");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "alert_configs_type_key" ON "alert_configs"("type");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sub_categories_category_id_name_key" ON "sub_categories"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "patch_jobs_policy_id_key" ON "patch_jobs"("policy_id");

-- CreateIndex
CREATE INDEX "patch_jobs_status_idx" ON "patch_jobs"("status");

-- CreateIndex
CREATE INDEX "patch_jobs_type_idx" ON "patch_jobs"("type");

-- CreateIndex
CREATE UNIQUE INDEX "vulnerability_jobs_job_id_key" ON "vulnerability_jobs"("job_id");

-- CreateIndex
CREATE INDEX "vulnerability_jobs_status_idx" ON "vulnerability_jobs"("status");

-- CreateIndex
CREATE INDEX "vulnerability_jobs_scan_type_idx" ON "vulnerability_jobs"("scan_type");

-- CreateIndex
CREATE UNIQUE INDEX "software_catalog_deployment_id_key" ON "software_catalog"("deployment_id");

-- CreateIndex
CREATE INDEX "software_catalog_os_idx" ON "software_catalog"("os");

-- CreateIndex
CREATE UNIQUE INDEX "software_bundles_bundle_id_key" ON "software_bundles"("bundle_id");

-- CreateIndex
CREATE INDEX "software_bundles_os_idx" ON "software_bundles"("os");

-- CreateIndex
CREATE UNIQUE INDEX "software_bundle_items_bundle_id_software_id_key" ON "software_bundle_items"("bundle_id", "software_id");

-- CreateIndex
CREATE UNIQUE INDEX "software_deployments_deployment_id_key" ON "software_deployments"("deployment_id");

-- CreateIndex
CREATE INDEX "software_deployments_stage_idx" ON "software_deployments"("stage");

-- CreateIndex
CREATE INDEX "software_deployment_tasks_deployment_id_idx" ON "software_deployment_tasks"("deployment_id");

-- CreateIndex
CREATE INDEX "software_deployment_tasks_status_idx" ON "software_deployment_tasks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "config_catalog_configuration_id_key" ON "config_catalog"("configuration_id");

-- CreateIndex
CREATE INDEX "config_catalog_os_idx" ON "config_catalog"("os");

-- CreateIndex
CREATE UNIQUE INDEX "config_bundles_bundle_id_key" ON "config_bundles"("bundle_id");

-- CreateIndex
CREATE INDEX "config_bundles_os_idx" ON "config_bundles"("os");

-- CreateIndex
CREATE UNIQUE INDEX "config_bundle_items_bundle_id_config_id_key" ON "config_bundle_items"("bundle_id", "config_id");

-- CreateIndex
CREATE UNIQUE INDEX "config_deployments_deployment_id_key" ON "config_deployments"("deployment_id");

-- CreateIndex
CREATE INDEX "config_deployments_stage_idx" ON "config_deployments"("stage");

-- CreateIndex
CREATE INDEX "config_deployment_tasks_deployment_id_idx" ON "config_deployment_tasks"("deployment_id");

-- CreateIndex
CREATE INDEX "config_deployment_tasks_status_idx" ON "config_deployment_tasks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "deployment_policies_policy_id_key" ON "deployment_policies"("policy_id");

-- CreateIndex
CREATE INDEX "deployment_policies_type_idx" ON "deployment_policies"("type");

-- CreateIndex
CREATE UNIQUE INDEX "_PatchToPatchDeployment_AB_unique" ON "_PatchToPatchDeployment"("A", "B");

-- CreateIndex
CREATE INDEX "_PatchToPatchDeployment_B_index" ON "_PatchToPatchDeployment"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_commands" ADD CONSTRAINT "agent_commands_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_telemetry" ADD CONSTRAINT "agent_telemetry_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tags" ADD CONSTRAINT "agent_tags_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_group_memberships" ADD CONSTRAINT "agent_group_memberships_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_group_memberships" ADD CONSTRAINT "agent_group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "agent_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_hardware" ADD CONSTRAINT "asset_hardware_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_software" ADD CONSTRAINT "asset_software_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_software_inventory" ADD CONSTRAINT "asset_software_inventory_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_security" ADD CONSTRAINT "asset_security_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerability_references" ADD CONSTRAINT "vulnerability_references_vulnerability_id_fkey" FOREIGN KEY ("vulnerability_id") REFERENCES "vulnerabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerability_software" ADD CONSTRAINT "vulnerability_software_vulnerability_id_fkey" FOREIGN KEY ("vulnerability_id") REFERENCES "vulnerabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_vulnerabilities" ADD CONSTRAINT "asset_vulnerabilities_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_vulnerabilities" ADD CONSTRAINT "asset_vulnerabilities_vulnerability_id_fkey" FOREIGN KEY ("vulnerability_id") REFERENCES "vulnerabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerability_exceptions" ADD CONSTRAINT "vulnerability_exceptions_vulnerability_id_fkey" FOREIGN KEY ("vulnerability_id") REFERENCES "vulnerabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exception_endpoints" ADD CONSTRAINT "exception_endpoints_exception_id_fkey" FOREIGN KEY ("exception_id") REFERENCES "vulnerability_exceptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patch_deployment_tasks" ADD CONSTRAINT "patch_deployment_tasks_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "patch_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patch_deployment_tasks" ADD CONSTRAINT "patch_deployment_tasks_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patch_affected_products" ADD CONSTRAINT "patch_affected_products_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patch_file_details" ADD CONSTRAINT "patch_file_details_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patch_download_jobs" ADD CONSTRAINT "patch_download_jobs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "patch_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patch_vulnerabilities" ADD CONSTRAINT "patch_vulnerabilities_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patch_endpoints" ADD CONSTRAINT "patch_endpoints_patch_id_fkey" FOREIGN KEY ("patch_id") REFERENCES "patches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_bundle_items" ADD CONSTRAINT "software_bundle_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "software_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_bundle_items" ADD CONSTRAINT "software_bundle_items_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "software_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_deployment_tasks" ADD CONSTRAINT "software_deployment_tasks_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "software_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_bundle_items" ADD CONSTRAINT "config_bundle_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "config_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_bundle_items" ADD CONSTRAINT "config_bundle_items_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "config_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_deployment_tasks" ADD CONSTRAINT "config_deployment_tasks_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "config_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PatchToPatchDeployment" ADD CONSTRAINT "_PatchToPatchDeployment_A_fkey" FOREIGN KEY ("A") REFERENCES "patches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PatchToPatchDeployment" ADD CONSTRAINT "_PatchToPatchDeployment_B_fkey" FOREIGN KEY ("B") REFERENCES "patch_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
