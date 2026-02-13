const fs = require('fs');

const filePath = 'src/modules/settings/settings.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Add getVendorLogoImage after getVendorLogo
if (!content.includes('async getVendorLogoImage')) {
  const pattern = /(async getVendorLogo\(id: string\) \{[\s\S]*?\n  \})\n/;

  const getVendorLogoImageMethod = `

  async getVendorLogoImage(id: string): Promise<string | null> {
    const logo = await prisma.vendorLogo.findUnique({ where: { id } });
    if (!logo) {
      throw new NotFoundError('Vendor logo not found');
    }

    if (!logo.objectKey) {
      return null;
    }

    // Generate fresh presigned URL with 1-hour expiry
    return minioStorage.getPresignedUrl(logo.objectKey, { expirySeconds: 3600 });
  }
`;

  if (pattern.test(content)) {
    content = content.replace(pattern, `$1\n${getVendorLogoImageMethod}\n`);
    fs.writeFileSync(filePath, content);
    console.log('✓ Added getVendorLogoImage() method');
  } else {
    console.log('⚠ Could not find getVendorLogo method');
    process.exit(1);
  }
} else {
  console.log('✓ getVendorLogoImage() already exists');
}
