#!/usr/bin/env node
/**
 * PatchIQ Type Generation Script
 *
 * Reads the Prisma schema and generates:
 *   - /shared/types/models.ts    (TypeScript interfaces for each Prisma model)
 *   - /shared/types/enums.ts     (TypeScript union types for enum-like string fields)
 *
 * Also mirrors shared type files to the backend (which can't import from /shared/
 * due to rootDir constraint):
 *   - /shared/types/api.ts     → /backend/src/shared/types/api.types.ts
 *   - /shared/types/enums.ts   → /backend/src/shared/types/enums.ts
 *
 * Usage:
 *   cd shared && npm run generate
 *   # or from root:
 *   npm run generate:types
 *
 * The script is idempotent — running it twice produces identical output.
 */

const fs = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────────────────
const SCHEMA_PATH = path.resolve(__dirname, '../../backend/src/db/prisma/schema.prisma');
const MODELS_OUTPUT = path.resolve(__dirname, '../types/models.generated.ts');
const ENUMS_OUTPUT = path.resolve(__dirname, '../types/enums.generated.ts');

// Backend mirror targets (backend can't import from /shared/ due to rootDir)
const BACKEND_TYPES_DIR = path.resolve(__dirname, '../../backend/src/shared/types');
const MIRROR_HEADER = '// DO NOT EDIT — auto-mirrored from /shared/types/ by generate-types.js\n// Source of truth: /shared/types/\n// Run `npm run generate:types` to update.\n\n';
const MIRRORS = [
  {
    source: path.resolve(__dirname, '../types/api.ts'),
    target: path.resolve(BACKEND_TYPES_DIR, 'api.types.ts'),
    label: 'api.ts → backend api.types.ts',
  },
  {
    source: path.resolve(__dirname, '../types/enums.ts'),
    target: path.resolve(BACKEND_TYPES_DIR, 'enums.ts'),
    label: 'enums.ts → backend enums.ts',
  },
];

// ── Prisma → TypeScript type mapping ───────────────────────────────────
const TYPE_MAP = {
  String: 'string',
  Int: 'number',
  BigInt: 'string',     // JSON serialization
  Float: 'number',
  Decimal: 'string',    // Precision-safe
  Boolean: 'boolean',
  DateTime: 'string',   // ISO 8601 strings
  Json: 'unknown',
  Bytes: 'Uint8Array',
};

// Fields to skip (relation fields, not scalar columns)
function isRelation(type, allModelNames) {
  const base = type.replace('?', '').replace('[]', '');
  return allModelNames.has(base);
}

// ── Schema Parser ──────────────────────────────────────────────────────
function parseSchema(schemaText) {
  const models = [];
  const lines = schemaText.split('\n');
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Start of model block
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      current = { name: modelMatch[1], fields: [], tableName: null };
      continue;
    }

    // End of block
    if (line === '}' && current) {
      models.push(current);
      current = null;
      continue;
    }

    if (!current) continue;

    // @@map("table_name")
    const tableMapMatch = line.match(/@@map\("(\w+)"\)/);
    if (tableMapMatch) {
      current.tableName = tableMapMatch[1];
      continue;
    }

    // Skip empty lines, comments, @@index, @@unique
    if (!line || line.startsWith('//') || line.startsWith('@@')) continue;

    // Parse field: fieldName Type? @annotations...
    const fieldMatch = line.match(/^(\w+)\s+([\w?[\]]+)/);
    if (!fieldMatch) continue;

    const fieldName = fieldMatch[1];
    let fieldType = fieldMatch[2];

    const isOptional = fieldType.endsWith('?');
    const isArray = fieldType.endsWith('[]');
    fieldType = fieldType.replace('?', '').replace('[]', '');

    // Check for @default value
    const defaultMatch = line.match(/@default\(([^)]+)\)/);
    const defaultValue = defaultMatch ? defaultMatch[1] : null;

    // Check for @map("column_name")
    const mapMatch = line.match(/@map\("([^"]+)"\)/);

    fields_push: {
      current.fields.push({
        name: fieldName,
        prismaType: fieldType,
        isOptional,
        isArray,
        defaultValue,
        dbColumn: mapMatch ? mapMatch[1] : null,
        rawLine: line,
      });
    }
  }

  return models;
}

// ── Enum Extraction ────────────────────────────────────────────────────
// Extract enum-like values from @default annotations and comments
function extractEnums(models) {
  const enums = new Map();

  // Known enum fields based on naming patterns and default values
  const ENUM_FIELDS = {
    role: { name: 'UserRole', values: ['ADMIN', 'USER', 'MANAGER'] },
    status: null, // Context-dependent, handled per model
  };

  // Collect from schema comments that indicate enum values
  for (const model of models) {
    for (const field of model.fields) {
      if (field.prismaType !== 'String') continue;

      // Extract from inline comments like: // PENDING, IN_PROGRESS, COMPLETED, FAILED
      const commentMatch = field.rawLine.match(/\/\/\s*((?:[A-Z_]+(?:,\s*)?)+)$/);
      if (commentMatch) {
        const values = commentMatch[1].split(',').map(v => v.trim()).filter(Boolean);
        if (values.length >= 2 && values.every(v => /^[A-Z_]+$/.test(v))) {
          const enumName = `${model.name}${capitalize(field.name)}`;
          enums.set(enumName, values);
        }
      }
    }
  }

  return enums;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Code Generation ────────────────────────────────────────────────────
function generateModels(models) {
  const modelNames = new Set(models.map(m => m.name));
  const lines = [];

  lines.push('/**');
  lines.push(' * Auto-generated from Prisma schema — DO NOT EDIT MANUALLY');
  lines.push(' * Source: backend/src/db/prisma/schema.prisma');
  lines.push(' *');
  lines.push(' * Dates are ISO 8601 strings (JSON serialization).');
  lines.push(' * BigInt fields are strings (JSON compatibility).');
  lines.push(' * Json fields are typed as `unknown`.');
  lines.push(' */');
  lines.push('');

  for (const model of models) {
    lines.push(`export interface ${model.name} {`);

    for (const field of model.fields) {
      // Skip relation fields (references to other models)
      if (isRelation(field.prismaType, modelNames)) {
        if (field.isArray) {
          lines.push(`  ${field.name}?: ${field.prismaType}[];`);
        } else {
          lines.push(`  ${field.name}?: ${field.prismaType}${field.isOptional ? ' | null' : ''};`);
        }
        continue;
      }

      const tsType = TYPE_MAP[field.prismaType];
      if (!tsType) continue; // Unknown type, skip

      let fullType = tsType;
      if (field.isArray) {
        fullType = `${tsType}[]`;
      }
      if (field.isOptional) {
        fullType = `${fullType} | null`;
      }

      lines.push(`  ${field.name}: ${fullType};`);
    }

    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

function generateEnums(enums) {
  const lines = [];

  lines.push('/**');
  lines.push(' * Auto-generated enum types from Prisma schema — DO NOT EDIT MANUALLY');
  lines.push(' * Source: backend/src/db/prisma/schema.prisma');
  lines.push(' *');
  lines.push(' * Convention: ALL values use UPPERCASE_SNAKE_CASE.');
  lines.push(' */');
  lines.push('');

  for (const [name, values] of enums) {
    const union = values.map(v => `'${v}'`).join(' | ');
    lines.push(`export type ${name} = ${union};`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Backend Mirror ──────────────────────────────────────────────────────
function mirrorToBackend() {
  let mirrored = 0;
  for (const { source, target, label } of MIRRORS) {
    if (!fs.existsSync(source)) {
      console.warn(`  Mirror source not found: ${source}`);
      continue;
    }
    const sourceContent = fs.readFileSync(source, 'utf-8');
    const mirroredContent = MIRROR_HEADER + sourceContent;

    if (fs.existsSync(target) && fs.readFileSync(target, 'utf-8') === mirroredContent) {
      console.log(`  ${label} — up to date`);
    } else {
      fs.writeFileSync(target, mirroredContent, 'utf-8');
      mirrored++;
      console.log(`  ${label} — updated`);
    }
  }
  return mirrored;
}

// ── Main ───────────────────────────────────────────────────────────────
function main() {
  // 1. Read schema
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Schema not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  console.log(`Read schema from ${SCHEMA_PATH}`);

  // 2. Parse
  const models = parseSchema(schema);
  console.log(`Parsed ${models.length} models`);

  const enums = extractEnums(models);
  console.log(`Extracted ${enums.size} enum types from schema comments`);

  // 3. Generate
  const modelsCode = generateModels(models);
  const enumsCode = generateEnums(enums);

  // 4. Write (only if changed, for idempotency)
  let modelsChanged = false;
  let enumsChanged = false;

  if (!fs.existsSync(MODELS_OUTPUT) || fs.readFileSync(MODELS_OUTPUT, 'utf-8') !== modelsCode) {
    fs.writeFileSync(MODELS_OUTPUT, modelsCode, 'utf-8');
    modelsChanged = true;
    console.log(`Wrote ${MODELS_OUTPUT}`);
  } else {
    console.log('models.generated.ts is up to date');
  }

  if (enums.size > 0) {
    if (!fs.existsSync(ENUMS_OUTPUT) || fs.readFileSync(ENUMS_OUTPUT, 'utf-8') !== enumsCode) {
      fs.writeFileSync(ENUMS_OUTPUT, enumsCode, 'utf-8');
      enumsChanged = true;
      console.log(`Wrote ${ENUMS_OUTPUT}`);
    } else {
      console.log('enums.generated.ts is up to date');
    }
  }

  // 5. Mirror shared types to backend
  console.log('\nMirroring shared types to backend...');
  const mirrorCount = mirrorToBackend();

  if (!modelsChanged && !enumsChanged && mirrorCount === 0) {
    console.log('\nNo changes — types are already in sync with schema.');
  } else {
    console.log('\nType generation complete.');
  }

  // 6. Summary
  console.log(`\n  Models: ${models.length}`);
  console.log(`  Enums:  ${enums.size}`);
  console.log(`  Output: ${path.relative(process.cwd(), MODELS_OUTPUT)}`);
  if (enums.size > 0) {
    console.log(`          ${path.relative(process.cwd(), ENUMS_OUTPUT)}`);
  }
}

main();
