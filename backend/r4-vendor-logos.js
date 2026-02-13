const fs = require('fs');

const filePath = 'src/modules/settings/settings.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update listVendorLogos to return permanent URLs
const oldListPattern = /async listVendorLogos\(\) \{\s+return prisma\.vendorLogo\.findMany\(\{\s+orderBy: \{ createdAt: 'desc' \},\s+\}\);\s+\}/;

const newListCode = `async listVendorLogos() {
    const logos = await prisma.vendorLogo.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Transform logoUrl to permanent endpoint
    return logos.map(logo => ({
      ...logo,
      logoUrl: \`/v1/settings/vendor-logos/\${logo.id}/image\`,
    }));
  }`;

if (oldListPattern.test(content)) {
  content = content.replace(oldListPattern, newListCode);
  console.log('✓ Updated listVendorLogos() with permanent URLs');
} else {
  console.log('⚠ listVendorLogos pattern not found');
}

// 2. Update createVendorLogo with uniqueness check and type validation
const oldCreatePattern = /async createVendorLogo\(\s+data: \{ name: string; type: string \},\s+logoFile: \{ buffer: Buffer; originalname: string; mimetype: string \}\s+\) \{[\s\S]*?^\  \}/m;

const newCreateCode = `async createVendorLogo(
    data: { name: string; type: string },
    logoFile: { buffer: Buffer; originalname: string; mimetype: string }
  ) {
    // Validate type enum
    const validTypes = ['integration', 'vendor', 'os'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestError(\`Invalid vendor logo type. Must be one of: \${validTypes.join(', ')}\`);
    }

    // Check case-insensitive uniqueness
    const existingLogo = await prisma.vendorLogo.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingLogo) {
      throw new ConflictError(\`Vendor logo with name '\${data.name}' already exists\`);
    }

    // Generate object key with UUID
    const uuid = crypto.randomUUID();
    const ext = logoFile.originalname.split('.').pop() || 'png';
    const objectKey = \`vendor-logos/\${data.type}/\${uuid}.\${ext}\`;

    // Upload to MinIO
    await minioStorage.uploadBuffer(objectKey, logoFile.buffer, {
      contentType: logoFile.mimetype,
      metadata: {
        'original-filename': logoFile.originalname,
      },
    });

    // Create record (store object key, not presigned URL)
    return prisma.vendorLogo.create({
      data: {
        name: data.name,
        type: data.type,
        logoUrl: \`/v1/settings/vendor-logos/\${data.name}/image\`, // Placeholder, will be replaced by ID
        fileName: logoFile.originalname,
        objectKey,
      },
    });
  }`;

if (oldCreatePattern.test(content)) {
  content = content.replace(oldCreatePattern, newCreateCode);
  console.log('✓ Updated createVendorLogo() with validation and uniqueness check');
} else {
  console.log('⚠ createVendorLogo pattern not found');
}

// 3. Add getVendorLogoImage method after getVendorLogo
const getVendorLogoPattern = /(async getVendorLogo\(id: string\) \{[\s\S]*?\n  \})/;

const getVendorLogoImageCode = `

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
  }`;

if (getVendorLogoPattern.test(content)) {
  content = content.replace(getVendorLogoPattern, `$1${getVendorLogoImageCode}`);
  console.log('✓ Added getVendorLogoImage() method');
} else {
  console.log('⚠ getVendorLogo pattern not found');
}

// Write the updated content
fs.writeFileSync(filePath, content);
console.log('\n✓ All vendor logo updates applied successfully!');
