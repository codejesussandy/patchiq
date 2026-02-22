-- Remove package manager ID columns from software_packages
ALTER TABLE "software_packages" DROP COLUMN IF EXISTS "winget_id";
ALTER TABLE "software_packages" DROP COLUMN IF EXISTS "choco_id";
ALTER TABLE "software_packages" DROP COLUMN IF EXISTS "apt_pkg";
ALTER TABLE "software_packages" DROP COLUMN IF EXISTS "brew_pkg";
ALTER TABLE "software_packages" DROP COLUMN IF EXISTS "dnf_pkg";
