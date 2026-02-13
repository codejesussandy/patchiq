const fs = require('fs');

const filePath = 'src/modules/settings/settings.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Pattern to match the old logo upload section
const oldPattern = /\/\/ Upload logo if provided\s+if \(logoFile\) \{\s+const objectKey = `branding\/logo-\$\{Date\.now\(\)\}-\$\{logoFile\.originalname\}`;[\s\S]*?create: \{ key: 'branding\.logoObjectKey', value: JSON\.parse\(JSON\.stringify\(objectKey\)\), category: 'branding' \},\s+\}\);?\s+\}/;

const newCode = `// Upload logo if provided
    if (logoFile) {
      // Get old logo object key for cleanup
      const oldLogoSetting = await prisma.setting.findUnique({
        where: { key: 'branding.logoObjectKey' },
      });
      const oldObjectKey = oldLogoSetting?.value as string | undefined;

      // Generate new object key using UUID for uniqueness
      const uuid = crypto.randomUUID();
      const ext = logoFile.originalname.split('.').pop() || 'png';
      const objectKey = \`branding/logo-\${uuid}.\${ext}\`;

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
    }`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newCode);
  fs.writeFileSync(filePath, content);
  console.log('✓ Updated updateBranding() with orphan cleanup');
} else {
  console.log('⚠ Pattern not found, file may have already been updated');
  process.exit(1);
}
