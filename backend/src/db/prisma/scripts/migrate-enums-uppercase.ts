/**
 * Migration Script: Convert all enum-like string values to UPPERCASE_SNAKE_CASE
 *
 * This script updates existing database records to use the new UPPERCASE_SNAKE_CASE
 * convention for all enum-like string columns, as defined in shared/types/enums.ts.
 *
 * Usage:
 *   npx ts-node backend/src/db/prisma/scripts/migrate-enums-uppercase.ts
 *   npx ts-node backend/src/db/prisma/scripts/migrate-enums-uppercase.ts --dry-run
 *
 * The script is idempotent — running it multiple times is safe because each UPDATE
 * uses a WHERE clause that only matches old (non-uppercase) values.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

interface ColumnMapping {
  table: string;       // Actual DB table name (from @@map)
  column: string;      // Actual DB column name (from @map or field name)
  mappings: [string, string][]; // [oldValue, newValue] pairs
}

// All enum column migrations, organized by DB table.
// Table names use the @@map value, column names use @map value where applicable.
const MIGRATIONS: ColumnMapping[] = [
  // ---- users ----
  {
    table: 'users',
    column: 'role',
    mappings: [
      ['admin', 'ADMIN'],
      ['user', 'USER'],
      ['manager', 'MANAGER'],
    ],
  },

  // ---- agents ----
  {
    table: 'agents',
    column: 'status',
    mappings: [
      ['Pending', 'PENDING'],
      ['Connected', 'CONNECTED'],
      ['Disconnected', 'DISCONNECTED'],
      ['Error', 'ERROR'],
    ],
  },

  // ---- agent_commands ----
  {
    table: 'agent_commands',
    column: 'type',
    mappings: [
      ['scan', 'SCAN'],
      ['update', 'UPDATE'],
      ['deploy', 'DEPLOY'],
      ['reboot', 'REBOOT'],
      ['collect_inventory', 'COLLECT_INVENTORY'],
      ['collect_telemetry', 'COLLECT_TELEMETRY'],
      ['software_install', 'SOFTWARE_INSTALL'],
      ['software_uninstall', 'SOFTWARE_UNINSTALL'],
      ['software_upgrade', 'SOFTWARE_UPGRADE'],
      ['patch_install', 'PATCH_INSTALL'],
      ['patch_rollback', 'PATCH_ROLLBACK'],
      ['patch_verify', 'PATCH_VERIFY'],
      ['config_deploy', 'CONFIG_DEPLOY'],
    ],
  },
  {
    table: 'agent_commands',
    column: 'status',
    mappings: [
      ['pending', 'PENDING'],
      ['sent', 'SENT'],
      ['in_progress', 'IN_PROGRESS'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
    ],
  },

  // ---- assets ----
  {
    table: 'assets',
    column: 'status',
    mappings: [
      ['In Use', 'IN_USE'],
      ['Available', 'AVAILABLE'],
      ['Under Maintenance', 'UNDER_MAINTENANCE'],
      ['Retired', 'RETIRED'],
    ],
  },
  {
    table: 'assets',
    column: 'type',
    mappings: [
      ['Endpoint', 'ENDPOINT'],
      ['Server', 'SERVER'],
      ['Mobile', 'MOBILE'],
      ['Virtual Machine', 'VIRTUAL_MACHINE'],
      ['Workstation', 'WORKSTATION'],
    ],
  },

  // ---- asset_vulnerabilities ----
  {
    table: 'asset_vulnerabilities',
    column: 'status',
    mappings: [
      ['Open', 'OPEN'],
      ['Resolved', 'RESOLVED'],
      ['Mitigated', 'MITIGATED'],
      ['Accepted', 'ACCEPTED'],
    ],
  },

  // ---- vulnerability_exceptions ----
  {
    table: 'vulnerability_exceptions',
    column: 'exception_type',
    mappings: [
      ['False Positive', 'FALSE_POSITIVE'],
      ['Risk Accepted', 'RISK_ACCEPTED'],
      ['Compensating Control', 'COMPENSATING_CONTROL'],
      ['Pending Fix', 'PENDING_FIX'],
    ],
  },
  {
    table: 'vulnerability_exceptions',
    column: 'scope',
    mappings: [
      ['Global', 'GLOBAL'],
      ['Specific Endpoints', 'SPECIFIC_ENDPOINTS'],
    ],
  },

  // ---- patches ----
  {
    table: 'patches',
    column: 'severity',
    mappings: [
      ['Critical', 'CRITICAL'],
      ['High', 'HIGH'],
      ['Medium', 'MEDIUM'],
      ['Low', 'LOW'],
      ['Unspecified', 'UNSPECIFIED'],
    ],
  },
  {
    table: 'patches',
    column: 'os',
    mappings: [
      ['Windows', 'WINDOWS'],
      ['MacOS', 'MACOS'],
      ['macOS', 'MACOS'],
      ['Ubuntu', 'UBUNTU'],
      ['Linux', 'LINUX'],
    ],
  },
  {
    table: 'patches',
    column: 'status',
    mappings: [
      ['Draft', 'DRAFT'],
      ['Active', 'ACTIVE'],
      ['Superseded', 'SUPERSEDED'],
      ['Retired', 'RETIRED'],
    ],
  },
  {
    table: 'patches',
    column: 'download_status',
    mappings: [
      ['None', 'NONE'],
      ['Pending', 'PENDING'],
      ['Downloading', 'DOWNLOADING'],
      ['Completed', 'COMPLETED'],
      ['Failed', 'FAILED'],
    ],
  },
  {
    table: 'patches',
    column: 'test_status',
    mappings: [
      ['Not Tested', 'NOT_TESTED'],
      ['Tested', 'TESTED'],
      ['Test Failed', 'TEST_FAILED'],
    ],
  },
  {
    table: 'patches',
    column: 'approval_status',
    mappings: [
      ['Pending', 'PENDING'],
      ['Approved', 'APPROVED'],
      ['Rejected', 'REJECTED'],
    ],
  },

  // ---- patch_bundles ----
  {
    table: 'patch_bundles',
    column: 'download_status',
    mappings: [
      ['pending', 'PENDING'],
      ['downloading', 'DOWNLOADING'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
    ],
  },

  // ---- patch_deployments ----
  // status is already UPPERCASE (PENDING, IN_PROGRESS, etc.)
  // type is already UPPERCASE (INSTANT, SCHEDULE)
  {
    table: 'patch_deployments',
    column: 'scope',
    mappings: [
      ['Global', 'GLOBAL'],
      ['Group', 'GROUP'],
      ['Endpoint', 'ENDPOINT'],
    ],
  },

  // ---- patch_deployment_tasks ----
  {
    table: 'patch_deployment_tasks',
    column: 'status',
    mappings: [
      ['pending', 'PENDING'],
      ['in_progress', 'IN_PROGRESS'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
      ['rolled_back', 'ROLLED_BACK'],
    ],
  },

  // ---- asset_patch_recommendations ----
  {
    table: 'asset_patch_recommendations',
    column: 'status',
    mappings: [
      ['recommended', 'RECOMMENDED'],
      ['accepted', 'ACCEPTED'],
      ['rejected', 'REJECTED'],
      ['deployed', 'DEPLOYED'],
      ['verified', 'VERIFIED'],
      ['failed', 'FAILED'],
    ],
  },
  {
    table: 'asset_patch_recommendations',
    column: 'severity',
    mappings: [
      ['Critical', 'CRITICAL'],
      ['High', 'HIGH'],
      ['Medium', 'MEDIUM'],
      ['Low', 'LOW'],
    ],
  },

  // ---- patch_vulnerabilities ----
  {
    table: 'patch_vulnerabilities',
    column: 'severity',
    mappings: [
      ['Critical', 'CRITICAL'],
      ['High', 'HIGH'],
      ['Medium', 'MEDIUM'],
      ['Low', 'LOW'],
    ],
  },

  // ---- patch_sources ----
  {
    table: 'patch_sources',
    column: 'category',
    mappings: [
      ['os', 'OS'],
      ['firmware', 'FIRMWARE'],
      ['enterprise', 'ENTERPRISE'],
      ['runtime', 'RUNTIME'],
      ['security', 'SECURITY'],
      ['browser', 'BROWSER'],
      ['utility', 'UTILITY'],
    ],
  },
  {
    table: 'patch_sources',
    column: 'auth_type',
    mappings: [
      ['basic', 'BASIC'],
      ['bearer', 'BEARER'],
      ['api_key', 'API_KEY'],
    ],
  },
  {
    table: 'patch_sources',
    column: 'last_sync_status',
    mappings: [
      ['success', 'SUCCESS'],
      ['partial', 'PARTIAL'],
      ['failed', 'FAILED'],
    ],
  },

  // ---- patch_download_jobs ----
  {
    table: 'patch_download_jobs',
    column: 'status',
    mappings: [
      ['pending', 'PENDING'],
      ['queued', 'QUEUED'],
      ['downloading', 'DOWNLOADING'],
      ['verifying', 'VERIFYING'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
      ['cancelled', 'CANCELLED'],
    ],
  },

  // ---- patch_tests ----
  {
    table: 'patch_tests',
    column: 'status',
    mappings: [
      ['Pending', 'PENDING'],
      ['In Progress', 'IN_PROGRESS'],
      ['Completed', 'COMPLETED'],
      ['Failed', 'FAILED'],
    ],
  },
  {
    table: 'patch_tests',
    column: 'application_type',
    mappings: [
      ['ALL', 'ALL'],  // already uppercase, but include for completeness
    ],
  },

  // ---- zero_touch_configs ----
  {
    table: 'zero_touch_configs',
    column: 'status',
    mappings: [
      ['Active', 'ACTIVE'],
      ['Inactive', 'INACTIVE'],
    ],
  },

  // ---- jobs ----
  {
    table: 'jobs',
    column: 'status',
    mappings: [
      ['pending', 'PENDING'],
      ['running', 'RUNNING'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
    ],
  },

  // ---- patch_jobs ----
  // status is already UPPERCASE (PENDING, etc.)
  // type is already UPPERCASE (SCHEDULE, INSTANT)
  {
    table: 'patch_jobs',
    column: 'scope',
    mappings: [
      ['Global', 'GLOBAL'],
      ['Group', 'GROUP'],
      ['Endpoint', 'ENDPOINT'],
    ],
  },

  // ---- vulnerability_jobs ----
  {
    table: 'vulnerability_jobs',
    column: 'scan_type',
    mappings: [
      ['instant', 'INSTANT'],
      ['scheduled', 'SCHEDULED'],
    ],
  },
  {
    table: 'vulnerability_jobs',
    column: 'recurrence',
    mappings: [
      ['once', 'ONCE'],
      ['daily', 'DAILY'],
      ['weekly', 'WEEKLY'],
      ['monthly', 'MONTHLY'],
    ],
  },
  // vulnerability_jobs.status is already UPPERCASE (RUNNING, COMPLETED, etc.)

  // ---- vulnerability_db_sync ----
  {
    table: 'vulnerability_db_sync',
    column: 'scan_job_unit',
    mappings: [
      ['Hour', 'HOUR'],
      ['Day', 'DAY'],
      ['Week', 'WEEK'],
    ],
  },

  // ---- discovery_scans ----
  {
    table: 'discovery_scans',
    column: 'status',
    mappings: [
      ['pending', 'PENDING'],
      ['in_progress', 'IN_PROGRESS'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
    ],
  },

  // ---- ip_ranges ----
  {
    table: 'ip_ranges',
    column: 'scan_schedule_type',
    mappings: [
      ['once', 'ONCE'],
      ['daily', 'DAILY'],
      ['weekly', 'WEEKLY'],
    ],
  },
  {
    table: 'ip_ranges',
    column: 'status',
    mappings: [
      ['active', 'ACTIVE'],
      ['inactive', 'INACTIVE'],
    ],
  },

  // ---- device_credentials ----
  {
    table: 'device_credentials',
    column: 'type',
    mappings: [
      ['SSH', 'SSH'],       // already uppercase
      ['Windows', 'WINDOWS'],
      ['SNMP', 'SNMP'],     // already uppercase
      ['WinRM', 'WINRM'],
    ],
  },
  {
    table: 'device_credentials',
    column: 'snmp_version',
    mappings: [
      ['v2c', 'V2C'],
      ['v3', 'V3'],
    ],
  },

  // ---- discovered_devices ----
  {
    table: 'discovered_devices',
    column: 'status',
    mappings: [
      ['discovered', 'DISCOVERED'],
      ['enrolled', 'ENROLLED'],
      ['ignored', 'IGNORED'],
    ],
  },

  // ---- reports ----
  {
    table: 'reports',
    column: 'type',
    mappings: [
      ['vulnerability', 'VULNERABILITY'],
      ['patch', 'PATCH'],
      ['compliance', 'COMPLIANCE'],
      ['asset', 'ASSET'],
      ['endpoint', 'ENDPOINT'],
      ['hardware', 'HARDWARE'],
    ],
  },
  {
    table: 'reports',
    column: 'status',
    mappings: [
      ['pending', 'PENDING'],
      ['processing', 'PROCESSING'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
    ],
  },
  // reports.format is already UPPERCASE (CSV, PDF, etc.)

  // ---- scheduled_reports ----
  {
    table: 'scheduled_reports',
    column: 'type',
    mappings: [
      ['vulnerability', 'VULNERABILITY'],
      ['patch', 'PATCH'],
      ['compliance', 'COMPLIANCE'],
      ['asset', 'ASSET'],
      ['endpoint', 'ENDPOINT'],
      ['hardware', 'HARDWARE'],
    ],
  },
  {
    table: 'scheduled_reports',
    column: 'frequency',
    mappings: [
      ['daily', 'DAILY'],
      ['weekly', 'WEEKLY'],
      ['monthly', 'MONTHLY'],
    ],
  },
  // scheduled_reports.format is already UPPERCASE

  // ---- software_deployments ----
  // NOTE: Prisma field "status" maps to DB column "stage" via @map("stage")
  {
    table: 'software_deployments',
    column: 'stage',
    mappings: [
      ['pending', 'PENDING'],
      ['in_progress', 'IN_PROGRESS'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
      ['cancelled', 'CANCELLED'],
    ],
  },
  {
    table: 'software_deployments',
    column: 'deployment_type',
    mappings: [
      ['install', 'INSTALL'],
      ['uninstall', 'UNINSTALL'],
      ['upgrade', 'UPGRADE'],
    ],
  },
  {
    table: 'software_deployments',
    column: 'selection_type',
    mappings: [
      ['application', 'APPLICATION'],
      ['bundle', 'BUNDLE'],
    ],
  },
  {
    table: 'software_deployments',
    column: 'notify_to',
    mappings: [
      ['admin', 'ADMIN'],
      ['user', 'USER'],
    ],
  },

  // ---- software_deployment_tasks ----
  {
    table: 'software_deployment_tasks',
    column: 'status',
    mappings: [
      ['pending', 'PENDING'],
      ['in_progress', 'IN_PROGRESS'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
      ['SUCCESS', 'COMPLETED'],  // Normalize SUCCESS -> COMPLETED
    ],
  },

  // ---- config_catalog ----
  {
    table: 'config_catalog',
    column: 'configuration_type',
    mappings: [
      ['command', 'COMMAND'],
      ['policy', 'POLICY'],
      ['script', 'SCRIPT'],
    ],
  },
  {
    table: 'config_catalog',
    column: 'command_type',
    mappings: [
      ['powershell', 'POWERSHELL'],
      ['cmd', 'CMD'],
      ['bash', 'BASH'],
      ['sh', 'SH'],
    ],
  },

  // ---- config_deployments ----
  // NOTE: Prisma field "status" maps to DB column "stage" via @map("stage")
  {
    table: 'config_deployments',
    column: 'stage',
    mappings: [
      ['pending', 'PENDING'],
      ['in_progress', 'IN_PROGRESS'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
      ['cancelled', 'CANCELLED'],
    ],
  },
  {
    table: 'config_deployments',
    column: 'selection_type',
    mappings: [
      ['configuration', 'CONFIGURATION'],
      ['bundle', 'BUNDLE'],
    ],
  },
  {
    table: 'config_deployments',
    column: 'notify_to',
    mappings: [
      ['admin', 'ADMIN'],
      ['user', 'USER'],
    ],
  },

  // ---- config_deployment_tasks ----
  {
    table: 'config_deployment_tasks',
    column: 'status',
    mappings: [
      ['pending', 'PENDING'],
      ['in_progress', 'IN_PROGRESS'],
      ['completed', 'COMPLETED'],
      ['failed', 'FAILED'],
      ['SUCCESS', 'COMPLETED'],
    ],
  },

  // ---- deployment_policies ----
  {
    table: 'deployment_policies',
    column: 'type',
    mappings: [
      ['SCHEDULE', 'SCHEDULE'],  // already uppercase
      ['INSTANT', 'INSTANT'],
    ],
  },
  {
    table: 'deployment_policies',
    column: 'supported_module',
    mappings: [
      ['All', 'ALL'],
      ['Patch', 'PATCH'],
      ['Update', 'UPDATE'],
      ['Security', 'SECURITY'],
    ],
  },
  {
    table: 'deployment_policies',
    column: 'related_type',
    mappings: [
      ['No Relation', 'NO_RELATION'],
      ['Critical', 'CRITICAL'],
      ['Important', 'IMPORTANT'],
      ['Optional', 'OPTIONAL'],
    ],
  },

  // ---- software_licenses ----
  {
    table: 'software_licenses',
    column: 'status',
    mappings: [
      ['Allocated', 'ALLOCATED'],
      ['Available', 'AVAILABLE'],
      ['Expired', 'EXPIRED'],
    ],
  },

  // ---- os_licenses ----
  {
    table: 'os_licenses',
    column: 'status',
    mappings: [
      ['Allocated', 'ALLOCATED'],
      ['Available', 'AVAILABLE'],
      ['Expired', 'EXPIRED'],
    ],
  },

  // ---- asset_alerts ----
  {
    table: 'asset_alerts',
    column: 'severity',
    mappings: [
      ['Critical', 'CRITICAL'],
      ['Warning', 'WARNING'],
      ['Info', 'INFO'],
      ['Clear', 'CLEAR'],
    ],
  },
  {
    table: 'asset_alerts',
    column: 'status',
    mappings: [
      ['Open', 'OPEN'],
      ['Acknowledged', 'ACKNOWLEDGED'],
      ['Resolved', 'RESOLVED'],
    ],
  },

  // ---- notifications ----
  {
    table: 'notifications',
    column: 'type',
    mappings: [
      ['info', 'INFO'],
      ['success', 'SUCCESS'],
      ['warning', 'WARNING'],
      ['error', 'ERROR'],
    ],
  },
  {
    table: 'notifications',
    column: 'category',
    mappings: [
      ['agent', 'AGENT'],
      ['deployment', 'DEPLOYMENT'],
      ['vulnerability', 'VULNERABILITY'],
      ['alert', 'ALERT'],
      ['system', 'SYSTEM'],
    ],
  },
];

async function migrateEnumsToUppercase() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Enum Migration to UPPERCASE_SNAKE_CASE`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`${'='.repeat(60)}\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  const execute = async (tx: typeof prisma) => {
    for (const migration of MIGRATIONS) {
      const { table, column, mappings } = migration;
      console.log(`\n--- ${table}.${column} ---`);

      for (const [oldValue, newValue] of mappings) {
        if (oldValue === newValue) {
          continue; // Skip no-op mappings
        }

        try {
          if (DRY_RUN) {
            // Count how many rows would be affected
            const result = await tx.$queryRawUnsafe<{ count: bigint }[]>(
              `SELECT COUNT(*) as count FROM "${table}" WHERE "${column}" = $1`,
              oldValue
            );
            const count = Number(result[0]?.count ?? 0);
            if (count > 0) {
              console.log(`  [DRY RUN] Would update ${count} rows: '${oldValue}' -> '${newValue}'`);
              totalUpdated += count;
            } else {
              totalSkipped++;
            }
          } else {
            const affected = await tx.$executeRawUnsafe(
              `UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`,
              newValue,
              oldValue
            );
            if (affected > 0) {
              console.log(`  Updated ${affected} rows: '${oldValue}' -> '${newValue}'`);
              totalUpdated += affected;
            } else {
              totalSkipped++;
            }
          }
        } catch (error) {
          // Table or column might not exist yet (pre-migration). Log and continue.
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.includes('does not exist') || msg.includes('UndefinedTable') || msg.includes('UndefinedColumn')) {
            console.log(`  [SKIP] Table or column does not exist: ${table}.${column}`);
            totalSkipped++;
          } else {
            console.error(`  [ERROR] ${table}.${column}: '${oldValue}' -> '${newValue}': ${msg}`);
            totalErrors++;
          }
        }
      }
    }
  };

  if (DRY_RUN) {
    // Dry run: no transaction needed, just read counts
    await execute(prisma);
  } else {
    // Live run: wrap in a transaction
    await prisma.$transaction(async (tx) => {
      const client: unknown = tx;
      await execute(client as typeof prisma);
    }, { timeout: 60000 });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Migration ${DRY_RUN ? '(DRY RUN) ' : ''}Summary`);
  console.log(`  Rows ${DRY_RUN ? 'that would be updated' : 'updated'}: ${totalUpdated}`);
  console.log(`  Mappings skipped (no matching rows): ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`${'='.repeat(60)}\n`);

  if (totalErrors > 0) {
    process.exitCode = 1;
  }
}

migrateEnumsToUppercase()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
