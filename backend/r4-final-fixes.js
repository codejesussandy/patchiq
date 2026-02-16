const fs = require('fs');

const filePath = 'src/modules/settings/settings.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update getBranding to return permanent URL
const getBrandingPattern = /(async getBranding\(\): Promise<Record<string, unknown>> \{[\s\S]*?)(    return result;\s+  \})/;

if (getBrandingPattern.test(content)) {
  content = content.replace(getBrandingPattern, (match, p1, p2) => {
    if (match.includes('Replace logoUrl with permanent endpoint')) {
      console.log('✓ getBranding already has permanent URL logic');
      return match;
    }
    return `${p1}
    // Replace logoUrl with permanent endpoint if logoObjectKey exists
    if (result.logoObjectKey) {
      result.logoUrl = '/v1/settings/branding/logo';
    }

${p2}`;
  });
}

// 2. Add getBrandingLogo method if it doesn't exist
if (!content.includes('async getBrandingLogo')) {
  const insertAfterGetBranding = /(  async getBranding\(\):[\s\S]*?\n  \})\n/;
  const getBrandingLogoMethod = `

  async getBrandingLogo(): Promise<string | null> {
    const setting = await prisma.setting.findUnique({
      where: { key: 'branding.logoObjectKey' },
    });

    if (!setting?.value) {
      return null;
    }

    // Generate fresh presigned URL with 1-hour expiry
    const objectKey = setting.value as string;
    return minioStorage.getPresignedUrl(objectKey, { expirySeconds: 3600 });
  }
`;

  if (insertAfterGetBranding.test(content)) {
    content = content.replace(insertAfterGetBranding, `$1\n${getBrandingLogoMethod}\n`);
    console.log('✓ Added getBrandingLogo() method');
  } else {
    console.log('⚠ Could not find insertion point for getBrandingLogo');
  }
} else {
  console.log('✓ getBrandingLogo() already exists');
}

// Write the file
fs.writeFileSync(filePath, content);
console.log('\n✓ All R4 branding fixes applied!');
