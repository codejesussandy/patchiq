#!/bin/bash
# R4: Branding — Permanent URLs & Cleanup
# This script applies all necessary changes for Sprint 2 Pipeline 2D R4

set -e

cd "$(dirname "$0")/.."

echo "Applying R4: Branding — Permanent URLs & Cleanup"
echo "================================================"

# 1. Update getBranding() to return permanent URL endpoint
echo "1. Updating getBranding() to return permanent URL..."
sed -i '/^  async getBranding/,/^  }$/{
  /return result;/{
    i\
    // Replace logoUrl with permanent endpoint if logoObjectKey exists\
    if (result.logoObjectKey) {\
      result.logoUrl = '\''/v1/settings/branding/logo'\'';\
    }\

  }
}' src/modules/settings/settings.service.ts

# 2. Add getBrandingLogo() method after getBranding()
echo "2. Adding getBrandingLogo() method..."
sed -i '/^  async getBranding/,/^  }$/!b;/^  }$/a\
\
  async getBrandingLogo(): Promise<string | null> {\
    const setting = await prisma.setting.findUnique({\
      where: { key: '\''branding.logoObjectKey'\'' },\
    });\
\
    if (!setting?.value) {\
      return null;\
    }\
\
    // Generate fresh presigned URL with 1-hour expiry\
    const objectKey = setting.value as string;\
    return minioStorage.getPresignedUrl(objectKey, { expirySeconds: 3600 });\
  }
' src/modules/settings/settings.service.ts

# 3. Update updateBranding() with orphan cleanup
echo "3. Updating updateBranding() with orphan cleanup logic..."
# This is complex, so we'll create a temporary file with the new method
cat > /tmp/updateBranding.txt << 'EOF'
  async updateBranding(
    input: { companyName?: string },
    logoFile?: { buffer: Buffer; originalname: string; mimetype: string }
  ): Promise<Record<string, unknown>> {
    // Update company name if provided
    if (input.companyName !== undefined) {
      await prisma.setting.upsert({
        where: { key: 'branding.companyName' },
        update: { value: JSON.parse(JSON.stringify(input.companyName)) },
        create: { key: 'branding.companyName', value: JSON.parse(JSON.stringify(input.companyName)), category: 'branding' },
      });
    }

    // Upload logo if provided
    if (logoFile) {
      // Get old logo object key for cleanup
      const oldLogoSetting = await prisma.setting.findUnique({
        where: { key: 'branding.logoObjectKey' },
      });
      const oldObjectKey = oldLogoSetting?.value as string | undefined;

      // Generate new object key using UUID for uniqueness
      const uuid = crypto.randomUUID();
      const ext = logoFile.originalname.split('.').pop() || 'png';
      const objectKey = `branding/logo-${uuid}.${ext}`;

      // Upload new logo to MinIO
      await minioStorage.uploadBuffer(objectKey, logoFile.buffer, {
        contentType: logoFile.mimetype,
        metadata: {
          'original-filename': logoFile.originalname,
        },
      });

      // Store logo info (object key instead of presigned URL)
      await prisma.setting.upsert({
        where: { key: 'branding.logoFileName' },
        update: { value: JSON.parse(JSON.stringify(logoFile.originalname)) },
        create: { key: 'branding.logoFileName', value: JSON.parse(JSON.stringify(logoFile.originalname)), category: 'branding' },
      });

      await prisma.setting.upsert({
        where: { key: 'branding.logoObjectKey' },
        update: { value: JSON.parse(JSON.stringify(objectKey)) },
        create: { key: 'branding.logoObjectKey', value: JSON.parse(JSON.stringify(objectKey)), category: 'branding' },
      });

      // Delete old logo from MinIO AFTER successful upload
      if (oldObjectKey) {
        try {
          await minioStorage.deleteObject(oldObjectKey);
          logger.info({ oldObjectKey }, 'Deleted old branding logo from MinIO');
        } catch (error) {
          logger.warn({ oldObjectKey, error }, 'Failed to delete old branding logo from MinIO');
        }
      }
    }

    return this.getBranding();
  }
EOF

# Replace the updateBranding method
perl -i -0pe 's/  async updateBranding\([^{]*\{.*?\n  \}/`cat /tmp/updateBranding.txt`/se' src/modules/settings/settings.service.ts

# 4. Update multer file size limit from 10MB to 5MB
echo "4. Updating multer file size limit to 5MB..."
sed -i 's/fileSize: 10 \* 1024 \* 1024/fileSize: 5 * 1024 * 1024/g' src/modules/settings/settings.routes.ts

# 5. Add companyName validation
echo "5. Adding companyName validation..."
sed -i '/export const updateBrandingSchema/,/);/{
  s/companyName: z\.string()\.max(200)\.optional(),/companyName: z.string().min(1).max(100).trim().refine(val => !\/\<[^\>]*\>\/\.test(val), '\''HTML tags not allowed'\'').optional(),/
}' src/modules/settings/settings.validators.ts

echo ""
echo "R4 branding changes applied successfully!"
echo ""
echo "Next steps:"
echo "1. Review the changes in settings.service.ts"
echo "2. Add controller and route for GET /branding/logo"
echo "3. Update vendor logo methods for permanent URLs"
echo "4. Run TypeScript compilation to verify changes"
