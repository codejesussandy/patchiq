# Form Validation Security - Remediation Implementation Guide

**Last Updated:** 2026-02-17 | **Target Completion:** 1-2 weeks | **Effort:** 40-60 hours

---

## Quick Start: Step-by-Step Implementation

### STEP 1: Add DOMPurify Dependency (30 minutes)

```bash
# Install DOMPurify and types
npm install dompurify
npm install --save-dev @types/dompurify

# Verify installation
npm ls dompurify
```

### STEP 2: Create Sanitization Utility (1 hour)

Create `/frontend/src/utils/sanitize.ts`:

```typescript
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML input to prevent XSS attacks
 * Removes all HTML tags and dangerous attributes
 */
export const sanitizeHTML = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  // Configure DOMPurify to be very strict
  const config = {
    ALLOWED_TAGS: [], // No tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
  };

  return DOMPurify.sanitize(input, config);
};

/**
 * Sanitize input for safe storage
 * Removes HTML, scripts, event handlers
 */
export const sanitizeInput = (input: string, allowHTML = false): string => {
  if (!input || typeof input !== 'string') return '';

  if (!allowHTML) {
    return sanitizeHTML(input);
  }

  // For fields that allow HTML (like descriptions), use relaxed config
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    KEEP_CONTENT: true,
  };

  return DOMPurify.sanitize(input, config);
};

/**
 * Strip all HTML tags from input
 */
export const stripHTML = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '');
};

/**
 * Encode special characters for safe display
 */
export const encodeHTML = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return input.replace(/[&<>"']/g, (char) => map[char]);
};
```

### STEP 3: Create Input Validation Utility (1.5 hours)

Create `/frontend/src/utils/validation.ts`:

```typescript
/**
 * Comprehensive input validation functions
 */

/**
 * Detect XSS payload patterns
 */
export const detectXSSPayload = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;

  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /on\w+\s*=\s*["']?[^"']*["']?/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<img[^>]*on\w+/gi,
    /<svg[^>]*on\w+/gi,
    /javascript:/gi,
    /data:text\/html/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(value));
};

/**
 * Detect SQL injection patterns
 */
export const detectSQLInjection = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;

  const sqlPatterns = [
    /;\s*(DROP|DELETE|INSERT|UPDATE|EXEC|SELECT|ALTER|CREATE|MODIFY)/i,
    /('\s*OR\s*'|"\s*OR\s*"|'=|"=)/,
    /--\s*$/,
    /%27\s*(OR|UNION)/i,
    /\/\*.*\*\//,
    /xp_/i,
    /sp_/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(value));
};

/**
 * Validate hostname format
 * Allows: alphanumeric, dash, dot
 * Pattern: subdomain.domain.extension (flexible)
 */
export const validateHostname = (value: string): string | null => {
  if (!value) return null;

  const hostnameRegex = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$/i;

  if (!hostnameRegex.test(value)) {
    return 'Hostname can only contain letters, numbers, hyphens, and dots';
  }

  if (value.length > 255) {
    return 'Hostname must be 255 characters or less';
  }

  return null;
};

/**
 * Validate email format
 */
export const validateEmail = (value: string): string | null => {
  if (!value) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(value)) {
    return 'Please enter a valid email address (e.g., user@example.com)';
  }

  if (value.length > 255) {
    return 'Email address must be 255 characters or less';
  }

  return null;
};

/**
 * Validate IP address format
 */
export const validateIPAddress = (value: string): string | null => {
  if (!value) return null;

  const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d)?[0-9]|[1-9]?)\.){3}(25[0-5]|(2[0-4]|1\d)?[0-9]|[1-9]?)$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})$/;

  if (!ipv4Regex.test(value) && !ipv6Regex.test(value)) {
    return 'Please enter a valid IPv4 or IPv6 address';
  }

  return null;
};

/**
 * Validate MAC address format
 */
export const validateMACAddress = (value: string): string | null => {
  if (!value) return null;

  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

  if (!macRegex.test(value)) {
    return 'Please enter a valid MAC address (e.g., 00:1A:2B:3C:4D:5E)';
  }

  return null;
};

/**
 * Validate asset name
 */
export const validateAssetName = (value: string): string | null => {
  if (!value) return 'Asset name is required';

  if (value.length < 1) {
    return 'Asset name is required';
  }

  if (value.length > 255) {
    return 'Asset name must be 255 characters or less';
  }

  if (detectXSSPayload(value)) {
    return 'Asset name contains invalid characters or patterns';
  }

  if (detectSQLInjection(value)) {
    return 'Asset name contains invalid characters';
  }

  return null;
};

/**
 * Validate URL format
 */
export const validateURL = (value: string): string | null => {
  if (!value) return null;

  try {
    new URL(value);
    return null;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
};

/**
 * Sanitize and validate input
 * Returns: { isValid: boolean, error: string | null, sanitized: string }
 */
export const validateAndSanitize = (
  value: string,
  fieldType: 'text' | 'email' | 'hostname' | 'ip' | 'mac' | 'url' | 'name'
): { isValid: boolean; error: string | null; sanitized: string } => {
  let error: string | null = null;
  let sanitized = value;

  // Check for XSS
  if (detectXSSPayload(value)) {
    error = 'Input contains invalid characters or scripts';
  }

  // Check for SQL injection
  if (detectSQLInjection(value)) {
    error = error || 'Input contains invalid characters';
  }

  // Field-specific validation
  switch (fieldType) {
    case 'email':
      error = error || validateEmail(value);
      break;
    case 'hostname':
      error = error || validateHostname(value);
      break;
    case 'ip':
      error = error || validateIPAddress(value);
      break;
    case 'mac':
      error = error || validateMACAddress(value);
      break;
    case 'url':
      error = error || validateURL(value);
      break;
    case 'name':
      error = error || validateAssetName(value);
      break;
    case 'text':
    default:
      if (value.length > 255) {
        error = error || 'Field must be 255 characters or less';
      }
      break;
  }

  // Sanitize if valid
  if (!error) {
    sanitized = value.trim();
  }

  return {
    isValid: error === null,
    error,
    sanitized,
  };
};
```

### STEP 4: Update AddAssetModal Component (2 hours)

File: `/frontend/src/pages/assets/components/AddAssetModal.tsx`

```typescript
import { sanitizeHTML, sanitizeInput } from '../../../utils/sanitize';
import { validateAndSanitize } from '../../../utils/validation';

export const AddAssetModal = ({ visible, onClose, onSuccess, mode = 'add', asset }: AddAssetModalProps) => {
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();

  // ... existing code ...

  /**
   * Real-time field validation
   */
  const handleFieldChange = (changedValues: any) => {
    const errors: { [key: string]: string } = {};

    // Validate asset name
    if (changedValues.assetName !== undefined) {
      const validation = validateAndSanitize(changedValues.assetName, 'name');
      if (validation.error) {
        errors.assetName = validation.error;
      }
    }

    // Validate hostname
    if (changedValues.hostname !== undefined) {
      const validation = validateAndSanitize(changedValues.hostname, 'hostname');
      if (validation.error) {
        errors.hostname = validation.error;
      }
    }

    // Validate IP address
    if (changedValues.ipAddress !== undefined) {
      const validation = validateAndSanitize(changedValues.ipAddress, 'ip');
      if (validation.error) {
        errors.ipAddress = validation.error;
      }
    }

    // Validate owner email
    if (changedValues.ownerEmail !== undefined) {
      const validation = validateAndSanitize(changedValues.ownerEmail, 'email');
      if (validation.error) {
        errors.ownerEmail = validation.error;
      }
    }

    setFieldErrors(errors);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = form.getFieldsValue(true);

      // Sanitize all string inputs
      const transformedData = {
        name: sanitizeHTML(values.assetName),
        categoryId: values.categoryId || undefined,
        subCategoryId: values.subCategoryId || undefined,
        osType: sanitizeHTML(values.os || values.osType),
        osVersion: sanitizeHTML(values.osVersion),
        model: sanitizeHTML(values.model),
        serialNumber: sanitizeHTML(values.serialNumber),
        status: values.status,
        manufacturer: sanitizeHTML(values.make),
        tags: values.assetTags || [],
        hostname: sanitizeHTML(values.hostname),
        ipAddress: values.ipAddress, // Already validated at backend
        macAddress: sanitizeHTML(values.macAddress),
        ownerName: sanitizeHTML(values.ownerTechnician),
        ownerEmail: values.ownerEmail, // Already validated
        ownerDepartment: sanitizeHTML(values.ownerDepartment),
        vendor: sanitizeHTML(values.vendor),
        purchaseDate: values.purchaseDate?.toISOString?.() || values.purchaseDate,
        warrantyExpiry: values.warrantyExpiryDate?.toISOString?.() || values.warrantyExpiryDate,
        purchaseOrderNumber: sanitizeHTML(values.purchaseOrderNumber),
        purchaseCost: values.cost && !isNaN(parseFloat(values.cost)) ? parseFloat(values.cost) : undefined,
        invoiceNumber: sanitizeHTML(values.invoiceNo),
        currency: sanitizeHTML(values.currency),
        currentValue: values.currentValue && !isNaN(parseFloat(values.currentValue)) ? parseFloat(values.currentValue) : undefined,
        salvageValue: values.salvageValue && !isNaN(parseFloat(values.salvageValue)) ? parseFloat(values.salvageValue) : undefined,
        depreciationType: sanitizeHTML(values.depreciationType),
        amcVendor: sanitizeHTML(values.amcVendor),
        amcCost: sanitizeHTML(values.amcCost),
        amcExpiryDate: values.amcExpiryDate?.toISOString?.() || values.amcExpiryDate,
        endOfLife: values.endOfLife?.toISOString?.() || values.endOfLife,
        endOfSupport: values.endOfSupport?.toISOString?.() || values.endOfSupport,
      };

      // ... rest of existing code ...
    } catch (error) {
      // ... error handling ...
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={mode === 'add' ? 'Add Asset' : 'Edit Asset'}
      visible={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
    >
      <Form
        form={form}
        layout="vertical"
        onFieldsChange={(_, allFields) => {
          const changedValues = allFields.reduce((acc, field) => {
            acc[field.name[0] as string] = field.value;
            return acc;
          }, {} as any);
          handleFieldChange(changedValues);
        }}
      >
        {/* Asset Name Field with validation */}
        <Form.Item
          label="Asset Name *"
          name="assetName"
          rules={[{ required: true, message: 'Asset name is required' }]}
          help={
            <>
              {fieldErrors.assetName && <span style={{ color: 'red' }}>{fieldErrors.assetName}</span>}
              <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                {form.getFieldValue('assetName')?.length || 0}/255 characters
              </span>
            </>
          }
        >
          <Input
            placeholder="Enter asset name"
            maxLength={255}
            status={fieldErrors.assetName ? 'error' : ''}
          />
        </Form.Item>

        {/* Hostname Field with validation */}
        <Form.Item
          label="Hostname"
          name="hostname"
          help={
            <>
              {fieldErrors.hostname && <span style={{ color: 'red' }}>{fieldErrors.hostname}</span>}
              <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                Alphanumeric, hyphens, and dots only
              </span>
            </>
          }
        >
          <Input
            placeholder="e.g., server-01.example.com"
            maxLength={255}
            status={fieldErrors.hostname ? 'error' : ''}
          />
        </Form.Item>

        {/* IP Address Field */}
        <Form.Item
          label="IP Address"
          name="ipAddress"
          help={
            fieldErrors.ipAddress && <span style={{ color: 'red' }}>{fieldErrors.ipAddress}</span>
          }
        >
          <Input
            placeholder="e.g., 192.168.1.100"
            status={fieldErrors.ipAddress ? 'error' : ''}
          />
        </Form.Item>

        {/* Owner Email Field */}
        <Form.Item
          label="Owner Email"
          name="ownerEmail"
          help={
            fieldErrors.ownerEmail && <span style={{ color: 'red' }}>{fieldErrors.ownerEmail}</span>
          }
        >
          <Input
            type="email"
            placeholder="e.g., owner@example.com"
            status={fieldErrors.ownerEmail ? 'error' : ''}
          />
        </Form.Item>

        {/* ... rest of form fields ... */}

        {/* Submit Button */}
        <Form.Item>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={Object.keys(fieldErrors).length > 0}
          >
            {mode === 'add' ? 'Create Asset' : 'Update Asset'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

### STEP 5: Create Reusable Validated Input Component (1 hour)

Create `/frontend/src/components/ValidatedInput.tsx`:

```typescript
import { Input, Form, InputProps } from 'antd';
import { validateAndSanitize } from '../utils/validation';
import { sanitizeHTML } from '../utils/sanitize';
import { useState } from 'react';

interface ValidatedInputProps extends InputProps {
  fieldType?: 'text' | 'email' | 'hostname' | 'ip' | 'mac' | 'url' | 'name';
  maxLength?: number;
  showCharacterCount?: boolean;
  onSanitizedChange?: (sanitized: string) => void;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  fieldType = 'text',
  maxLength = 255,
  showCharacterCount = true,
  onSanitizedChange,
  value,
  onChange,
  ...props
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Validate
    const validation = validateAndSanitize(newValue, fieldType);
    setError(validation.error);

    // Callback
    if (onSanitizedChange && validation.isValid) {
      onSanitizedChange(validation.sanitized);
    }

    // Original onChange
    onChange?.(e);
  };

  return (
    <div>
      <Input
        {...props}
        value={value}
        onChange={handleChange}
        maxLength={maxLength}
        status={error ? 'error' : ''}
      />
      <div style={{ marginTop: '4px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
        {error && <span style={{ color: '#ff4d4f' }}>{error}</span>}
        {showCharacterCount && (
          <span style={{ color: '#666', marginLeft: 'auto' }}>
            {(value as string)?.length || 0}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};
```

### STEP 6: Update patch/user forms similarly (2 hours per form)

Apply the same sanitization and validation patterns to:
- `/frontend/src/pages/patches/PatchForm.tsx` (if exists)
- User management forms in `/frontend/src/pages/settings/`

---

## Testing the Implementation

### Unit Tests - Create `/frontend/src/utils/__tests__/validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  detectXSSPayload,
  detectSQLInjection,
  validateHostname,
  validateEmail,
} from '../validation';

describe('Input Validation', () => {
  describe('XSS Detection', () => {
    it('should detect script tags', () => {
      expect(detectXSSPayload("<script>alert('xss')</script>")).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(detectXSSPayload('<img onerror="alert(\'xss\')" />')).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      expect(detectXSSPayload('javascript:alert("xss")')).toBe(true);
    });

    it('should allow clean input', () => {
      expect(detectXSSPayload('Normal asset name')).toBe(false);
    });
  });

  describe('SQL Injection Detection', () => {
    it('should detect DROP statements', () => {
      expect(detectSQLInjection("'; DROP TABLE assets; --")).toBe(true);
    });

    it('should detect OR conditions', () => {
      expect(detectSQLInjection("1' OR '1'='1")).toBe(true);
    });

    it('should allow clean input', () => {
      expect(detectSQLInjection('server-01')).toBe(false);
    });
  });

  describe('Hostname Validation', () => {
    it('should accept valid hostnames', () => {
      expect(validateHostname('server-01.example.com')).toBeNull();
      expect(validateHostname('localhost')).toBeNull();
      expect(validateHostname('my-server.corp.local')).toBeNull();
    });

    it('should reject invalid hostnames', () => {
      expect(validateHostname('server_01')).not.toBeNull(); // underscore
      expect(validateHostname('server@example.com')).not.toBeNull(); // @ symbol
      expect(validateHostname('-invalid')).not.toBeNull(); // starts with dash
    });
  });

  describe('Email Validation', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('user@example.com')).toBeNull();
      expect(validateEmail('user.name+tag@example.co.uk')).toBeNull();
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('@example.com')).not.toBeNull(); // missing local
      expect(validateEmail('user@')).not.toBeNull(); // missing domain
      expect(validateEmail('user@@example.com')).not.toBeNull(); // double @
    });
  });
});
```

### E2E Tests - Add to `/frontend/e2e/form-security.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Form Validation Security', () => {
  test('should reject XSS payload in asset name', async ({ page }) => {
    await page.goto('http://localhost:5173/assets');
    await page.click('button:has-text("Add Asset")');

    const nameInput = page.locator('input[placeholder*="name"]').first();
    await nameInput.fill('<script>alert("xss")</script>');

    // Error should appear
    const error = page.locator('text=invalid characters').first();
    await expect(error).toBeVisible();

    // Submit should be disabled
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeDisabled();
  });

  test('should accept valid hostname', async ({ page }) => {
    await page.goto('http://localhost:5173/assets');
    await page.click('button:has-text("Add Asset")');

    const hostnameInput = page.locator('input[placeholder*="hostname"]').first();
    await hostnameInput.fill('server-01.example.com');

    // No error should appear
    const error = page.locator('text=invalid characters').first();
    await expect(error).not.toBeVisible();
  });

  test('should show character counter', async ({ page }) => {
    await page.goto('http://localhost:5173/assets');
    await page.click('button:has-text("Add Asset")');

    const nameInput = page.locator('input[placeholder*="name"]').first();
    await nameInput.fill('Test Asset Name');

    // Character counter should show
    const counter = page.locator('text=/\\d+\\/255/').first();
    await expect(counter).toBeVisible();
    expect(await counter.textContent()).toMatch(/15\/255/);
  });

  test('should enforce max length', async ({ page }) => {
    await page.goto('http://localhost:5173/assets');
    await page.click('button:has-text("Add Asset")');

    const nameInput = page.locator('input[placeholder*="name"]').first();

    // Try to enter 300 characters
    const longText = 'A'.repeat(300);
    await nameInput.fill(longText);

    // Should be limited to 255
    const value = await nameInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(255);
  });

  test('should reject invalid email', async ({ page }) => {
    await page.goto('http://localhost:5173/assets');
    await page.click('button:has-text("Add Asset")');

    const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('@example.com');

      // Error should appear
      const error = page.locator('text=valid email').first();
      await expect(error).toBeVisible();
    }
  });
});
```

---

## Deployment Checklist

Before deploying security fixes:

- [ ] DOMPurify package installed and verified
- [ ] Sanitization utility tested
- [ ] Validation utility tested
- [ ] All form components updated
- [ ] Unit tests passing (100% XSS/SQLi detection)
- [ ] E2E tests passing (user flows work)
- [ ] Performance tested (sanitization < 100ms)
- [ ] Accessible labels and help text present
- [ ] Error messages user-friendly
- [ ] Backend validation still working
- [ ] No console errors or warnings
- [ ] Cross-browser testing complete
- [ ] Security review completed
- [ ] Documentation updated

---

## Performance Considerations

### Sanitization Performance
- DOMPurify.sanitize() is fast: ~1-10ms per call
- Batch operations where possible
- Cache compiled regex patterns

### Validation Performance
- Regex validation: ~0.1-1ms per call
- Use early returns for efficiency
- Memoize validation results where appropriate

### Bundle Size Impact
- DOMPurify: ~50KB gzipped
- Validation utilities: ~5KB gzipped
- Total: Negligible impact (~55KB added)

---

## Security Review Checklist

After implementation, verify:

1. **Input Validation**
   - [ ] All user inputs validated
   - [ ] XSS patterns detected
   - [ ] SQL patterns detected
   - [ ] Length limits enforced
   - [ ] Email format validated
   - [ ] URL format validated

2. **Output Encoding**
   - [ ] React JSX auto-escaping used
   - [ ] No dangerouslySetInnerHTML usage
   - [ ] HTML encoded where necessary

3. **Defense in Depth**
   - [ ] Frontend validation present
   - [ ] Backend validation present
   - [ ] Both independently effective

4. **User Experience**
   - [ ] Clear error messages
   - [ ] Helpful field hints
   - [ ] Character counters
   - [ ] Real-time validation feedback

5. **Monitoring**
   - [ ] Security errors logged
   - [ ] Validation failures tracked
   - [ ] Potential attacks detected

---

## References & Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://react.dev/learn/security)
- [CWE-79: Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)

---

**Implementation Status:** Ready for development
**Estimated Timeline:** 1-2 weeks for full implementation
**Resource Requirement:** 1-2 developers
**Testing Effort:** 20-30 hours

