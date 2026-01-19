# Task 01: Database Setup

## Overview
Set up PostgreSQL database with Prisma ORM, create all migrations, and seed initial data.

**Priority:** P0 - Foundation
**Dependencies:** Task 00
**Estimated Complexity:** Medium
**Parallel:** No - Other tasks depend on schema

---

## Objective
Create a complete PostgreSQL database schema matching all API specifications, with proper indexes, constraints, and seed data.

---

## Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Auth Schema | `backend-debt/AUTH-IMPLEMENTATION.md` | User, RefreshToken tables |
| Agents Schema | `backend-debt/AGENTS-IMPLEMENTATION.md` | Agent, Command tables |
| Assets Schema | `backend-debt/ASSETS-IMPLEMENTATION.md` | Asset, Hardware, Software tables |
| Patches Schema | `backend-debt/PATCHES-IMPLEMENTATION.md` | Patch, Deployment tables |
| Vulnerabilities | `backend-debt/VULNERABILITY-IMPLEMENTATION.md` | CVE, Exception tables |
| Jobs Schema | `backend-debt/JOBS-IMPLEMENTATION.md` | Job types, deployments |
| Settings Schema | `backend-debt/SETTINGS-IMPLEMENTATION.md` | Config tables |
| Agent Contracts | `../agent-dev/contracts/schemas/` | Data schemas from agent |

---

## Complete Prisma Schema

**prisma/schema.prisma:**

```prisma
// This is your Prisma schema file
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String    @map("password_hash")
  name            String?
  contactNumber   String?   @map("contact_number")
  role            String    @default("user")
  organizationId  String?   @map("organization_id")
  departmentId    String?   @map("department_id")
  locationId      String?   @map("location_id")
  isActive        Boolean   @default(true) @map("is_active")
  isOnboarded     Boolean   @default(false) @map("is_onboarded")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  // Relations
  organization    Organization? @relation(fields: [organizationId], references: [id])
  department      Department?   @relation(fields: [departmentId], references: [id])
  location        Location?     @relation(fields: [locationId], references: [id])
  refreshTokens   RefreshToken[]
  passwordResets  PasswordResetToken[]
  auditLogs       AuditLog[]

  @@map("users")
}

model RefreshToken {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  tokenHash   String    @map("token_hash")
  expiresAt   DateTime  @map("expires_at")
  deviceInfo  String?   @map("device_info")
  revokedAt   DateTime? @map("revoked_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tokenHash])
  @@index([userId])
  @@map("refresh_tokens")
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  tokenHash String    @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tokenHash])
  @@map("password_reset_tokens")
}

// ============================================
// ORGANIZATION STRUCTURE
// ============================================

model Organization {
  id          String   @id @default(uuid())
  name        String
  description String?
  isDefault   Boolean  @default(false) @map("is_default")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  users       User[]
  departments Department[]
  branches    Branch[]

  @@map("organizations")
}

model Branch {
  id             String   @id @default(uuid())
  name           String
  organizationId String   @map("organization_id")
  isDefault      Boolean  @default(false) @map("is_default")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  locations    Location[]

  @@map("branches")
}

model Department {
  id             String   @id @default(uuid())
  name           String
  organizationId String   @map("organization_id")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  users        User[]

  @@map("departments")
}

model Location {
  id        String   @id @default(uuid())
  name      String
  address   String?
  branchId  String   @map("branch_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  branch Branch @relation(fields: [branchId], references: [id])
  users  User[]

  @@map("locations")
}

// ============================================
// AGENTS
// ============================================

model Agent {
  id            String    @id @default(uuid())
  machineId     String    @unique @map("machine_id")
  name          String
  status        String    @default("Pending") // Connected, Disconnected, Pending, Error
  os            String    // Windows, MacOS, Linux
  osVersion     String?   @map("os_version")
  agentVersion  String?   @map("agent_version")
  lastHeartbeat DateTime? @map("last_heartbeat")
  registeredAt  DateTime  @default(now()) @map("registered_at")
  ipAddress     String?   @map("ip_address")
  hostname      String?
  serialNumber  String?   @map("serial_number")
  assetId       String?   @map("asset_id")
  capabilities  String[]  @default([])
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  asset    Asset?         @relation(fields: [assetId], references: [id])
  tags     AgentTag[]
  groups   AgentGroupMembership[]
  commands AgentCommand[]

  @@index([machineId])
  @@index([status])
  @@index([assetId])
  @@map("agents")
}

model AgentTag {
  agentId String @map("agent_id")
  tag     String

  agent Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)

  @@id([agentId, tag])
  @@map("agent_tags")
}

model AgentGroup {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now()) @map("created_at")

  members AgentGroupMembership[]

  @@map("agent_groups")
}

model AgentGroupMembership {
  agentId String @map("agent_id")
  groupId String @map("group_id")

  agent Agent      @relation(fields: [agentId], references: [id], onDelete: Cascade)
  group AgentGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@id([agentId, groupId])
  @@map("agent_group_memberships")
}

model AgentCommand {
  id         String    @id @default(uuid())
  agentId    String    @map("agent_id")
  type       String    // scan, deploy, reboot, update
  status     String    @default("pending") // pending, completed, failed
  createdAt  DateTime  @default(now()) @map("created_at")
  executedAt DateTime? @map("executed_at")
  result     String?

  agent Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)

  @@index([agentId])
  @@index([status])
  @@map("agent_commands")
}

model AgentDownload {
  id          String   @id @default(uuid())
  os          String
  version     String
  releaseDate DateTime @map("release_date")
  downloadUrl String   @map("download_url")
  fileSize    BigInt?  @map("file_size")
  checksum    String?
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("agent_downloads")
}

model AgentVersion {
  id            String   @id @default(uuid())
  platform      String   // Linux, Windows, Mac
  architecture  String   // x86, amd64, arm64
  version       String
  lastUpdatedAt DateTime @default(now()) @map("last_updated_at")
  downloadUrl   String?  @map("download_url")
  fileSize      BigInt?  @map("file_size")
  checksum      String?

  @@unique([platform, architecture, version])
  @@map("agent_versions")
}

// ============================================
// ASSETS
// ============================================

model Asset {
  id              String    @id @default(uuid())
  name            String
  status          String    @default("Available") // In Use, Available, Under Maintenance, Retired
  categoryId      String?   @map("category_id")
  subCategoryId   String?   @map("sub_category_id")
  manufacturer    String?
  model           String?
  serialNumber    String?   @map("serial_number")
  purchaseDate    DateTime? @map("purchase_date")
  warrantyExpiry  DateTime? @map("warranty_expiry")
  purchasePrice   Decimal?  @map("purchase_price") @db.Decimal(10, 2)
  vendor          String?
  assetTag        String?   @unique @map("asset_tag")
  loggedInUser    String?   @map("logged_in_user")
  lastSeen        DateTime? @map("last_seen")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  category       Category?    @relation(fields: [categoryId], references: [id])
  subCategory    SubCategory? @relation(fields: [subCategoryId], references: [id])
  agents         Agent[]
  tags           AssetTag[]
  hardware       AssetHardware?
  software       AssetSoftware[]
  security       AssetSecurity?
  network        AssetNetwork[]
  telemetry      AssetTelemetry[]
  vulnerabilities AssetVulnerability[]
  patchStatus    AssetPatchStatus[]
  auditLogs      AssetAuditLog[]

  @@index([status])
  @@index([categoryId])
  @@map("assets")
}

model Category {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  assets        Asset[]
  subCategories SubCategory[]

  @@map("categories")
}

model SubCategory {
  id          String   @id @default(uuid())
  name        String
  description String?
  categoryId  String   @map("category_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  category Category @relation(fields: [categoryId], references: [id])
  assets   Asset[]

  @@unique([categoryId, name])
  @@map("sub_categories")
}

model AssetTag {
  assetId String @map("asset_id")
  tagId   String @map("tag_id")

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  tag   Tag   @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([assetId, tagId])
  @@map("asset_tags")
}

model Tag {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  color       String?
  icon        String?
  priority    Int      @default(0)
  compliance  Boolean  @default(false)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  assets AssetTag[]

  @@map("tags")
}

model AssetHardware {
  id              String   @id @default(uuid())
  assetId         String   @unique @map("asset_id")
  manufacturer    String?
  model           String?
  serialNumber    String?  @map("serial_number")
  biosVendor      String?  @map("bios_vendor")
  biosVersion     String?  @map("bios_version")
  secureBoot      Boolean? @map("secure_boot")
  tpmEnabled      Boolean? @map("tpm_enabled")
  cpuName         String?  @map("cpu_name")
  cpuCores        Int?     @map("cpu_cores")
  cpuThreads      Int?     @map("cpu_threads")
  cpuSpeed        Decimal? @map("cpu_speed") @db.Decimal(5, 2)
  architecture    String?
  totalMemory     BigInt?  @map("total_memory")
  memorySlots     Int?     @map("memory_slots")
  gpuName         String?  @map("gpu_name")
  gpuVram         BigInt?  @map("gpu_vram")
  batteryHealth   Int?     @map("battery_health")
  batteryCycles   Int?     @map("battery_cycles")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  asset        Asset          @relation(fields: [assetId], references: [id], onDelete: Cascade)
  storages     AssetStorage[]
  memoryModules AssetMemory[]
  networkAdapters AssetNetworkAdapter[]

  @@map("asset_hardware")
}

model AssetStorage {
  id          String   @id @default(uuid())
  hardwareId  String   @map("hardware_id")
  name        String
  type        String?  // SSD, HDD, NVMe
  capacity    BigInt
  freeSpace   BigInt?  @map("free_space")
  smartStatus String?  @map("smart_status")
  mountPoint  String?  @map("mount_point")
  createdAt   DateTime @default(now()) @map("created_at")

  hardware AssetHardware @relation(fields: [hardwareId], references: [id], onDelete: Cascade)

  @@map("asset_storage")
}

model AssetMemory {
  id         String   @id @default(uuid())
  hardwareId String   @map("hardware_id")
  slot       String?
  type       String?  // DDR4, DDR5
  size       BigInt
  speed      Int?
  manufacturer String?
  createdAt  DateTime @default(now()) @map("created_at")

  hardware AssetHardware @relation(fields: [hardwareId], references: [id], onDelete: Cascade)

  @@map("asset_memory")
}

model AssetNetworkAdapter {
  id         String   @id @default(uuid())
  hardwareId String   @map("hardware_id")
  name       String
  macAddress String?  @map("mac_address")
  type       String?  // Ethernet, WiFi, Virtual
  speed      String?
  createdAt  DateTime @default(now()) @map("created_at")

  hardware AssetHardware @relation(fields: [hardwareId], references: [id], onDelete: Cascade)

  @@map("asset_network_adapters")
}

model AssetSoftware {
  id           String    @id @default(uuid())
  assetId      String    @map("asset_id")
  name         String
  version      String?
  vendor       String?
  installDate  DateTime? @map("install_date")
  size         BigInt?
  type         String?   // Application, Service, Driver
  isSystem     Boolean   @default(false) @map("is_system")
  createdAt    DateTime  @default(now()) @map("created_at")

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([assetId])
  @@map("asset_software")
}

model AssetSecurity {
  id                String   @id @default(uuid())
  assetId           String   @unique @map("asset_id")
  encryptionStatus  String?  @map("encryption_status")
  encryptionType    String?  @map("encryption_type")
  firewallEnabled   Boolean? @map("firewall_enabled")
  firewallProduct   String?  @map("firewall_product")
  antivirusProduct  String?  @map("antivirus_product")
  antivirusEnabled  Boolean? @map("antivirus_enabled")
  antivirusUpdated  DateTime? @map("antivirus_updated")
  secureBootEnabled Boolean? @map("secure_boot_enabled")
  uacEnabled        Boolean? @map("uac_enabled")
  complianceScore   Int?     @map("compliance_score")
  lastScanDate      DateTime? @map("last_scan_date")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@map("asset_security")
}

model AssetNetwork {
  id          String   @id @default(uuid())
  assetId     String   @map("asset_id")
  hostname    String?
  fqdn        String?
  ipAddress   String?  @map("ip_address")
  macAddress  String?  @map("mac_address")
  gateway     String?
  dnsServers  String[] @map("dns_servers")
  domainJoined Boolean? @map("domain_joined")
  createdAt   DateTime @default(now()) @map("created_at")

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([assetId])
  @@map("asset_network")
}

model AssetTelemetry {
  id           String   @id @default(uuid())
  assetId      String   @map("asset_id")
  cpuUsage     Decimal? @map("cpu_usage") @db.Decimal(5, 2)
  memoryUsage  Decimal? @map("memory_usage") @db.Decimal(5, 2)
  diskUsage    Decimal? @map("disk_usage") @db.Decimal(5, 2)
  networkIn    BigInt?  @map("network_in")
  networkOut   BigInt?  @map("network_out")
  temperature  Decimal? @db.Decimal(5, 2)
  uptime       BigInt?
  collectedAt  DateTime @default(now()) @map("collected_at")

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([assetId, collectedAt])
  @@map("asset_telemetry")
}

// ============================================
// PATCHES
// ============================================

model Patch {
  id                String    @id @default(uuid())
  patchId           String    @unique @map("patch_id") // e.g., KB5034441
  title             String
  description       String?
  severity          String    // CRITICAL, High, Medium, Low, UNSPECIFIED
  releaseDate       DateTime  @map("release_date")
  vendor            String?
  os                String?
  osVersion         String?   @map("os_version")
  architecture      String?
  category          String?   // Security, Feature, Cumulative
  downloadUrl       String?   @map("download_url")
  fileSize          BigInt?   @map("file_size")
  rebootRequired    Boolean   @default(false) @map("reboot_required")
  supersedes        String?   // Patch ID this supersedes
  supersededBy      String?   @map("superseded_by") // Patch ID that supersedes this
  testStatus        String?   @map("test_status") // pending, passed, failed
  approvalStatus    String?   @map("approval_status") // pending, approved, rejected
  testedBy          String?   @map("tested_by")
  testedAt          DateTime? @map("tested_at")
  testNotes         String?   @map("test_notes")
  approvedBy        String?   @map("approved_by")
  approvedAt        DateTime? @map("approved_at")
  rejectionReason   String?   @map("rejection_reason")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  affectedProducts  PatchAffectedProduct[]
  fileDetails       PatchFileDetail[]
  vulnerabilities   PatchVulnerability[]
  deployments       DeploymentPatch[]
  assetStatus       AssetPatchStatus[]

  @@index([severity])
  @@index([releaseDate])
  @@index([os])
  @@map("patches")
}

model PatchAffectedProduct {
  id        String @id @default(uuid())
  patchId   String @map("patch_id")
  product   String
  version   String?

  patch Patch @relation(fields: [patchId], references: [id], onDelete: Cascade)

  @@map("patch_affected_products")
}

model PatchFileDetail {
  id        String @id @default(uuid())
  patchId   String @map("patch_id")
  fileName  String @map("file_name")
  filePath  String @map("file_path")
  version   String?
  size      BigInt?
  checksum  String?

  patch Patch @relation(fields: [patchId], references: [id], onDelete: Cascade)

  @@map("patch_file_details")
}

model PatchVulnerability {
  id              String @id @default(uuid())
  patchId         String @map("patch_id")
  vulnerabilityId String @map("vulnerability_id")

  patch         Patch         @relation(fields: [patchId], references: [id], onDelete: Cascade)
  vulnerability Vulnerability @relation(fields: [vulnerabilityId], references: [id], onDelete: Cascade)

  @@unique([patchId, vulnerabilityId])
  @@map("patch_vulnerabilities")
}

model AssetPatchStatus {
  id          String    @id @default(uuid())
  assetId     String    @map("asset_id")
  patchId     String    @map("patch_id")
  status      String    // Installed, Missing, Failed, Pending
  installedAt DateTime? @map("installed_at")
  failedAt    DateTime? @map("failed_at")
  failReason  String?   @map("fail_reason")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  patch Patch @relation(fields: [patchId], references: [id], onDelete: Cascade)

  @@unique([assetId, patchId])
  @@map("asset_patch_status")
}

model Deployment {
  id               String    @id @default(uuid())
  name             String
  description      String?
  type             String    // SCHEDULE, INSTANT
  configType       String    @map("config_type") // INSTALL, ROLLBACK
  scope            String    // Global, Group, Endpoint
  endpoints        String[]
  deploymentPolicy String?   @map("deployment_policy")
  retryCount       Int       @default(3) @map("retry_count")
  batchSize        Int?      @map("batch_size")
  status           String    @default("PENDING") // PENDING, IN_PROGRESS, COMPLETED, FAILED
  scheduledAt      DateTime? @map("scheduled_at")
  startedAt        DateTime? @map("started_at")
  completedAt      DateTime? @map("completed_at")
  createdBy        String    @map("created_by")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  patches DeploymentPatch[]
  tasks   DeploymentTask[]

  @@index([status])
  @@map("deployments")
}

model DeploymentPatch {
  deploymentId String @map("deployment_id")
  patchId      String @map("patch_id")

  deployment Deployment @relation(fields: [deploymentId], references: [id], onDelete: Cascade)
  patch      Patch      @relation(fields: [patchId], references: [id], onDelete: Cascade)

  @@id([deploymentId, patchId])
  @@map("deployment_patches")
}

model DeploymentTask {
  id           String    @id @default(uuid())
  deploymentId String    @map("deployment_id")
  endpointId   String    @map("endpoint_id")
  endpointName String    @map("endpoint_name")
  status       String    @default("PENDING") // PENDING, IN_PROGRESS, SUCCESS, FAILED
  startedAt    DateTime? @map("started_at")
  completedAt  DateTime? @map("completed_at")
  errorMessage String?   @map("error_message")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  deployment Deployment @relation(fields: [deploymentId], references: [id], onDelete: Cascade)

  @@index([deploymentId])
  @@index([status])
  @@map("deployment_tasks")
}

model ZeroTouchConfig {
  id              String   @id @default(uuid())
  enabled         Boolean  @default(false)
  scheduleTime    String?  @map("schedule_time") // e.g., "14:00:00"
  targetGroups    String[] @map("target_groups")
  severityFilter  String[] @map("severity_filter") // Critical, Important, Moderate, Low
  autoReboot      Boolean  @default(false) @map("auto_reboot")
  rebootDelay     Int      @default(30) @map("reboot_delay") // minutes
  excludedPatches String[] @map("excluded_patches")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("zero_touch_config")
}

// ============================================
// VULNERABILITIES
// ============================================

model Vulnerability {
  id              String    @id @default(uuid())
  cveId           String    @unique @map("cve_id") // e.g., CVE-2024-12345
  title           String
  description     String?
  severity        String    // CRITICAL, HIGH, MEDIUM, LOW
  cvssScore       Decimal?  @map("cvss_score") @db.Decimal(3, 1)
  cvssVector      String?   @map("cvss_vector")
  epssScore       Decimal?  @map("epss_score") @db.Decimal(5, 4)
  exploitable     Boolean   @default(false)
  isZeroDay       Boolean   @default(false) @map("is_zero_day")
  publishedDate   DateTime? @map("published_date")
  lastModified    DateTime? @map("last_modified")
  attackVector    String?   @map("attack_vector")
  attackComplexity String?  @map("attack_complexity")
  cweId           String?   @map("cwe_id")
  mitreAttackId   String?   @map("mitre_attack_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  references      VulnerabilityReference[]
  affectedAssets  AssetVulnerability[]
  affectedSoftware VulnerabilitySoftware[]
  patches         PatchVulnerability[]
  exceptions      VulnerabilityException[]

  @@index([severity])
  @@index([publishedDate])
  @@index([isZeroDay])
  @@map("vulnerabilities")
}

model VulnerabilityReference {
  id              String @id @default(uuid())
  vulnerabilityId String @map("vulnerability_id")
  source          String // NVD, CERT, Microsoft, etc.
  url             String

  vulnerability Vulnerability @relation(fields: [vulnerabilityId], references: [id], onDelete: Cascade)

  @@map("vulnerability_references")
}

model AssetVulnerability {
  id              String    @id @default(uuid())
  assetId         String    @map("asset_id")
  vulnerabilityId String    @map("vulnerability_id")
  status          String    @default("Open") // Open, Mitigated, Exception
  discoveredAt    DateTime  @default(now()) @map("discovered_at")
  mitigatedAt     DateTime? @map("mitigated_at")

  asset         Asset         @relation(fields: [assetId], references: [id], onDelete: Cascade)
  vulnerability Vulnerability @relation(fields: [vulnerabilityId], references: [id], onDelete: Cascade)

  @@unique([assetId, vulnerabilityId])
  @@map("asset_vulnerabilities")
}

model VulnerabilitySoftware {
  id              String @id @default(uuid())
  vulnerabilityId String @map("vulnerability_id")
  name            String
  vendor          String?
  version         String?
  versionStart    String? @map("version_start")
  versionEnd      String? @map("version_end")

  vulnerability Vulnerability @relation(fields: [vulnerabilityId], references: [id], onDelete: Cascade)

  @@map("vulnerability_software")
}

model VulnerabilityException {
  id              String    @id @default(uuid())
  vulnerabilityId String    @map("vulnerability_id")
  scope           String    // Global, Group, Endpoint
  scopeIds        String[]  @map("scope_ids")
  reason          String    // Acceptable Risk, Not Applicable
  justification   String?
  createdBy       String    @map("created_by")
  approvedBy      String?   @map("approved_by")
  expiresAt       DateTime? @map("expires_at")
  deletedAt       DateTime? @map("deleted_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  vulnerability Vulnerability @relation(fields: [vulnerabilityId], references: [id], onDelete: Cascade)

  @@map("vulnerability_exceptions")
}

// ============================================
// JOBS
// ============================================

model PatchJob {
  id               String    @id @default(uuid())
  name             String
  description      String?
  type             String    // SCHEDULE, INSTANT
  configType       String    @map("config_type") // INSTALL, ROLLBACK
  scope            String    // Global, Group, Endpoint
  endpoints        String[]
  patches          String[]
  deploymentPolicy String?   @map("deployment_policy")
  retryCount       Int       @default(3) @map("retry_count")
  batchSize        Int?      @map("batch_size")
  status           String    @default("SCHEDULED") // SCHEDULED, RUNNING, COMPLETED, FAILED
  scheduledAt      DateTime? @map("scheduled_at")
  startedAt        DateTime? @map("started_at")
  completedAt      DateTime? @map("completed_at")
  createdBy        String    @map("created_by")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  @@index([status])
  @@map("patch_jobs")
}

model VulnerabilityJob {
  id           String    @id @default(uuid())
  name         String
  description  String?
  scope        String    // Global, Group, Endpoint
  endpoints    String[]
  scanType     String    @map("scan_type") // instant, scheduled
  recurrence   String?   // once, daily, weekly, monthly
  status       String    @default("SCHEDULED") // SCHEDULED, RUNNING, COMPLETED, FAILED
  scheduledAt  DateTime? @map("scheduled_at")
  lastRun      DateTime? @map("last_run")
  nextRun      DateTime? @map("next_run")
  createdBy    String    @map("created_by")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@index([status])
  @@map("vulnerability_jobs")
}

model VulnerabilityDbSync {
  id              String    @id @default(uuid())
  scanJobInterval Int       @default(24) @map("scan_job_interval")
  scanJobUnit     String    @default("Hour") @map("scan_job_unit")
  databaseSyncTime String   @default("02:00:00") @map("database_sync_time")
  lastSync        DateTime? @map("last_sync")
  totalCve        Int       @default(0) @map("total_cve")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@map("vulnerability_db_sync")
}

model SoftwareCatalog {
  id                     String   @id @default(uuid())
  deploymentId           String   @unique @map("deployment_id") // e.g., SWP-017
  applicationName        String   @map("application_name")
  description            String?
  tags                   String[]
  os                     String   // Windows, Mac, Linux
  version                String
  applicationLocationType String   @map("application_location_type")
  installationCommand    String?  @map("installation_command")
  uninstallationCommand  String?  @map("uninstallation_command")
  upgradeCommand         String?  @map("upgrade_command")
  iconUrl                String?  @map("icon_url")
  selfService            Boolean  @default(false) @map("self_service")
  architecture           String   // x64, x86, ARM64
  applicationType        String   @map("application_type") // MSI, EXE, APPLICATION, ZIP
  applicationFileUrl     String?  @map("application_file_url")
  createdBy              String   @map("created_by")
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  bundles SoftwareBundleItem[]

  @@map("software_catalog")
}

model SoftwareBundle {
  id          String   @id @default(uuid())
  bundleId    String   @unique @map("bundle_id")
  bundleName  String   @map("bundle_name")
  os          String
  description String?
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  items SoftwareBundleItem[]

  @@map("software_bundles")
}

model SoftwareBundleItem {
  bundleId   String @map("bundle_id")
  softwareId String @map("software_id")

  bundle   SoftwareBundle  @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  software SoftwareCatalog @relation(fields: [softwareId], references: [id], onDelete: Cascade)

  @@id([bundleId, softwareId])
  @@map("software_bundle_items")
}

model SoftwareDeployment {
  id               String    @id @default(uuid())
  deploymentId     String    @unique @map("deployment_id") // e.g., ADR-007
  deploymentName   String    @map("deployment_name")
  description      String?
  deploymentType   String    @map("deployment_type") // install, uninstall, upgrade
  selectionType    String    @map("selection_type") // application, bundle
  selectedItems    String[]  @map("selected_items")
  scope            String    // all, windows, mac, linux
  endpoints        String[]
  deploymentPolicy String?   @map("deployment_policy")
  retryCount       Int       @default(3) @map("retry_count")
  notifyTo         String    @default("admin") @map("notify_to")
  status           String    @default("PENDING") // PENDING, IN_PROGRESS, COMPLETED, FAILED
  pending          Int       @default(0)
  succeeded        Int       @default(0)
  failed           Int       @default(0)
  createdBy        String    @map("created_by")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  @@index([status])
  @@map("software_deployments")
}

model ConfigCatalog {
  id               String   @id @default(uuid())
  configurationId  String   @unique @map("configuration_id") // e.g., CFG-001
  name             String
  os               String
  description      String?
  tags             String[]
  configurationType String   @map("configuration_type") // command, policy, script
  architecture     String
  isRemediation    Boolean  @default(false) @map("is_remediation")
  commandType      String   @map("command_type") // powershell, cmd, bash, sh
  command          String
  createdBy        String   @map("created_by")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  bundles ConfigBundleItem[]

  @@map("config_catalog")
}

model ConfigBundle {
  id          String   @id @default(uuid())
  bundleId    String   @unique @map("bundle_id")
  bundleName  String   @map("bundle_name")
  os          String
  description String?
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  items ConfigBundleItem[]

  @@map("config_bundles")
}

model ConfigBundleItem {
  bundleId String @map("bundle_id")
  configId String @map("config_id")

  bundle ConfigBundle  @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  config ConfigCatalog @relation(fields: [configId], references: [id], onDelete: Cascade)

  @@id([bundleId, configId])
  @@map("config_bundle_items")
}

model ConfigDeployment {
  id               String    @id @default(uuid())
  deploymentId     String    @unique @map("deployment_id")
  deploymentName   String    @map("deployment_name")
  description      String?
  selectionType    String    @map("selection_type") // configuration, bundle
  selectedItems    String[]  @map("selected_items")
  scope            String
  endpoints        String[]
  deploymentPolicy String?   @map("deployment_policy")
  retryCount       Int       @default(3) @map("retry_count")
  notifyTo         String    @default("admin") @map("notify_to")
  status           String    @default("PENDING")
  pending          Int       @default(0)
  succeeded        Int       @default(0)
  failed           Int       @default(0)
  createdBy        String    @map("created_by")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  @@index([status])
  @@map("config_deployments")
}

// ============================================
// DISCOVERY
// ============================================

model IpRange {
  id               String    @id @default(uuid())
  name             String
  startIp          String    @map("start_ip")
  endIp            String    @map("end_ip")
  subnet           String?
  credentialId     String?   @map("credential_id")
  scanScheduleType String?   @map("scan_schedule_type") // once, daily, weekly
  scanScheduleTime String?   @map("scan_schedule_time")
  scanScheduleDay  Int?      @map("scan_schedule_day")
  lastScan         DateTime? @map("last_scan")
  discoveredDevices Int       @default(0) @map("discovered_devices")
  status           String    @default("active")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  credential DeviceCredential? @relation(fields: [credentialId], references: [id])

  @@map("ip_ranges")
}

model DeviceCredential {
  id            String   @id @default(uuid())
  name          String
  type          String   // SSH, WMI, SNMP, WinRM
  username      String?
  passwordHash  String?  @map("password_hash") // Encrypted
  domain        String?
  snmpCommunity String?  @map("snmp_community")
  snmpVersion   String?  @map("snmp_version")
  port          Int?
  createdBy     String   @map("created_by")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  ipRanges IpRange[]

  @@map("device_credentials")
}

// ============================================
// REPORTS
// ============================================

model Report {
  id          String    @id @default(uuid())
  name        String
  description String?
  type        String    // Patch, Asset, Vulnerability, Compliance, Audit, Custom
  format      String    // PDF, CSV, Excel
  filters     Json?
  columns     String[]
  scheduleId  String?   @map("schedule_id")
  generatedAt DateTime? @map("generated_at")
  filePath    String?   @map("file_path")
  createdBy   String    @map("created_by")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  schedule ReportSchedule? @relation(fields: [scheduleId], references: [id])

  @@index([type])
  @@map("reports")
}

model ReportSchedule {
  id          String   @id @default(uuid())
  name        String
  frequency   String   // daily, weekly, monthly
  dayOfWeek   Int?     @map("day_of_week")
  dayOfMonth  Int?     @map("day_of_month")
  time        String   // e.g., "09:00"
  recipients  String[]
  enabled     Boolean  @default(true)
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  reports Report[]

  @@map("report_schedules")
}

// ============================================
// SETTINGS
// ============================================

model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  isSystem    Boolean  @default(false) @map("is_system")
  permissions Json     // Module-based permissions
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("roles")
}

model AlertConfiguration {
  id         String   @id @default(uuid())
  type       String   // email, slack, sms, webhook
  enabled    Boolean  @default(true)
  config     Json     // Type-specific configuration
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("alert_configurations")
}

model ServerSettings {
  id                     String   @id @default(uuid())
  sessionTimeoutMinutes  Int      @default(30) @map("session_timeout_minutes")
  sessionIdleMinutes     Int      @default(15) @map("session_idle_minutes")
  logLevel               String   @default("info") @map("log_level")
  maintenanceMode        Boolean  @default(false) @map("maintenance_mode")
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  @@map("server_settings")
}

model MailServer {
  id        String   @id @default(uuid())
  host      String
  port      Int      @default(587)
  username  String?
  password  String?  // Encrypted
  useTls    Boolean  @default(true) @map("use_tls")
  fromEmail String   @map("from_email")
  fromName  String?  @map("from_name")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("mail_server")
}

model LdapConfig {
  id            String   @id @default(uuid())
  name          String
  server        String
  port          Int      @default(389)
  baseDn        String   @map("base_dn")
  bindDn        String?  @map("bind_dn")
  bindPassword  String?  @map("bind_password") // Encrypted
  userFilter    String?  @map("user_filter")
  groupFilter   String?  @map("group_filter")
  useSsl        Boolean  @default(false) @map("use_ssl")
  enabled       Boolean  @default(true)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("ldap_configs")
}

model PlatformLicense {
  id             String    @id @default(uuid())
  licenseKey     String    @unique @map("license_key")
  licenseTo      String    @map("license_to")
  expiresAt      DateTime  @map("expires_at")
  maxEndpoints   Int       @map("max_endpoints")
  isValid        Boolean   @default(true) @map("is_valid")
  activatedAt    DateTime  @default(now()) @map("activated_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@map("platform_licenses")
}

// ============================================
// AUDIT
// ============================================

model AuditLog {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id")
  action      String   // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  module      String   // auth, agents, assets, patches, etc.
  entityId    String?  @map("entity_id")
  entityType  String?  @map("entity_type")
  oldValue    Json?    @map("old_value")
  newValue    Json?    @map("new_value")
  ipAddress   String?  @map("ip_address")
  userAgent   String?  @map("user_agent")
  createdAt   DateTime @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([module])
  @@index([createdAt])
  @@map("audit_logs")
}

model AssetAuditLog {
  id        String   @id @default(uuid())
  assetId   String   @map("asset_id")
  action    String
  field     String?
  oldValue  String?  @map("old_value")
  newValue  String?  @map("new_value")
  changedBy String   @map("changed_by")
  createdAt DateTime @default(now()) @map("created_at")

  asset Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([assetId])
  @@index([createdAt])
  @@map("asset_audit_logs")
}
```

---

## Seed Data

**prisma/seed.ts:**
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default organization
  const org = await prisma.organization.upsert({
    where: { id: 'default-org' },
    update: {},
    create: {
      id: 'default-org',
      name: 'Default Organization',
      isDefault: true,
    },
  });

  // Create default branch
  const branch = await prisma.branch.upsert({
    where: { id: 'default-branch' },
    update: {},
    create: {
      id: 'default-branch',
      name: 'Headquarters',
      organizationId: org.id,
      isDefault: true,
    },
  });

  // Create default location
  const location = await prisma.location.upsert({
    where: { id: 'default-location' },
    update: {},
    create: {
      id: 'default-location',
      name: 'Main Office',
      branchId: branch.id,
    },
  });

  // Create admin role
  await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Full system access',
      isSystem: true,
      permissions: {
        agents: { view: true, add: true, edit: true, delete: true },
        assets: { view: true, add: true, edit: true, delete: true },
        patches: { view: true, add: true, edit: true, delete: true },
        vulnerabilities: { view: true, add: true, edit: true, delete: true },
        jobs: { view: true, add: true, edit: true, delete: true },
        reports: { view: true, add: true, edit: true, delete: true },
        settings: { view: true, add: true, edit: true, delete: true },
      },
    },
  });

  // Create user role
  await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Basic user access',
      isSystem: true,
      permissions: {
        agents: { view: true, add: false, edit: false, delete: false },
        assets: { view: true, add: false, edit: false, delete: false },
        patches: { view: true, add: false, edit: false, delete: false },
        vulnerabilities: { view: true, add: false, edit: false, delete: false },
        jobs: { view: true, add: false, edit: false, delete: false },
        reports: { view: true, add: false, edit: false, delete: false },
        settings: { view: false, add: false, edit: false, delete: false },
      },
    },
  });

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@patchiq.io' },
    update: {},
    create: {
      email: 'admin@patchiq.io',
      passwordHash,
      name: 'System Administrator',
      role: 'admin',
      organizationId: org.id,
      locationId: location.id,
      isActive: true,
      isOnboarded: true,
    },
  });

  // Create default categories
  const categories = ['Laptop', 'Desktop', 'Server', 'Network Device', 'Mobile'];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Create server settings (singleton)
  await prisma.serverSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      sessionTimeoutMinutes: 30,
      sessionIdleMinutes: 15,
      logLevel: 'info',
    },
  });

  // Create vulnerability DB sync settings (singleton)
  await prisma.vulnerabilityDbSync.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      scanJobInterval: 24,
      scanJobUnit: 'Hour',
      databaseSyncTime: '02:00:00',
      totalCve: 0,
    },
  });

  // Create agent downloads
  const agentDownloads = [
    { os: 'Windows 11', version: '2.1.0', downloadUrl: '/downloads/windows-agent.exe' },
    { os: 'MacOS', version: '2.1.0', downloadUrl: '/downloads/macos-agent.dmg' },
    { os: 'Linux', version: '2.0.5', downloadUrl: '/downloads/linux-agent.deb' },
  ];
  for (const download of agentDownloads) {
    await prisma.agentDownload.create({
      data: {
        ...download,
        releaseDate: new Date(),
      },
    });
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## TDD Scenarios

### Test: Database Connection

```typescript
// tests/integration/database.test.ts
import { prisma } from '@/db/client';

describe('Database', () => {
  it('should connect to the database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  it('should have users table', async () => {
    const users = await prisma.user.findMany({ take: 1 });
    expect(Array.isArray(users)).toBe(true);
  });
});
```

### Test: Seed Data Exists

```typescript
// tests/integration/seed.test.ts
import { prisma } from '@/db/client';

describe('Seed Data', () => {
  it('should have admin user', async () => {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@patchiq.io' },
    });
    expect(admin).toBeDefined();
    expect(admin?.role).toBe('admin');
  });

  it('should have default organization', async () => {
    const org = await prisma.organization.findFirst({
      where: { isDefault: true },
    });
    expect(org).toBeDefined();
  });

  it('should have system roles', async () => {
    const roles = await prisma.role.findMany({
      where: { isSystem: true },
    });
    expect(roles.length).toBeGreaterThanOrEqual(2);
  });
});
```

---

## Verification Checklist

- [ ] Prisma schema compiles without errors
- [ ] Migrations run successfully
- [ ] Seed data is inserted
- [ ] All indexes are created
- [ ] Foreign key constraints work
- [ ] Unique constraints enforce uniqueness
- [ ] Soft delete fields exist where needed
- [ ] Timestamp fields auto-populate

---

## Commands

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init

# Seed the database
npm run db:seed

# Open Prisma Studio
npx prisma studio
```

---

## Next Task
After completing this task, proceed to:
- **Task 02: Core Utilities** - JWT, encryption, validation
- **Task 03: Auth Module** - Can start in parallel once DB is ready
