-- AlterTable: Add applicability prerequisites to Patch
ALTER TABLE "patches" ADD COLUMN "prerequisites" JSONB;

-- AlterTable: Add OS edition, architecture, and installed features to Asset
ALTER TABLE "assets" ADD COLUMN "os_edition" TEXT;
ALTER TABLE "assets" ADD COLUMN "architecture" TEXT;
ALTER TABLE "assets" ADD COLUMN "installed_features" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex: Index on architecture for efficient filtering
CREATE INDEX "assets_architecture_idx" ON "assets"("architecture");

-- CreateIndex: Index on osEdition for efficient filtering
CREATE INDEX "assets_os_edition_idx" ON "assets"("os_edition");

-- CreateIndex: GIN index on installedFeatures for array contains queries
CREATE INDEX "assets_installed_features_idx" ON "assets" USING GIN ("installed_features");

-- Comment: Prerequisites JSON structure example
COMMENT ON COLUMN "patches"."prerequisites" IS 'Applicability prerequisites: { minOsVersion: "10.0.19041", maxOsVersion: "10.0.22631", requiredFeatures: ["IIS"], excludedFeatures: ["SQL Server"], osEditions: ["Pro", "Enterprise"], architectures: ["x86_64"] }';
