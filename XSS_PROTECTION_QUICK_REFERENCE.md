# XSS Protection Quick Reference for PatchIQ Frontend Developers

## TL;DR - The One Thing to Remember

**ALWAYS sanitize user input before submitting forms to the backend.**

```typescript
import { sanitizeInput } from '../../../utils/sanitize';

const sanitizedData = {
  ...formData,
  name: sanitizeInput(formData.name),
  description: sanitizeInput(formData.description),
};
```

---

## Available Sanitization Functions

All located in `/frontend/src/utils/sanitize.ts`:

### 1. `sanitizeInput(input: string, allowHTML?: boolean): string`
**Most Common - Use This for 99% of cases**

```typescript
// Default: removes all HTML
sanitizeInput('John <script>alert("xss")</script> Doe')
// Result: 'John  Doe'

// For fields that allow basic HTML (rare)
sanitizeInput('Click <a href="#">here</a>', true)
// Result: 'Click <a href="#">here</a>'
```

### 2. `sanitizeHTML(input: string): string`
**Strict sanitization - removes ALL HTML tags**

```typescript
sanitizeHTML('Hello <b>world</b>')
// Result: 'Hello world'
```

### 3. `stripHTML(input: string): string`
**Remove tags but keep text inside**

```typescript
stripHTML('Hello <b>world</b>')
// Result: 'Hello world'
```

### 4. `sanitizeObject(obj, fieldsToSanitize?): T`
**Batch sanitize multiple fields**

```typescript
const sanitized = sanitizeObject(formData, ['name', 'description', 'owner']);
```

### 5. `encodeHTML(input: string): string`
**HTML entity encoding (rare use case)**

```typescript
encodeHTML('Hello & goodbye')
// Result: 'Hello &amp; goodbye'
```

---

## When to Add Sanitization

### DO sanitize these:
- ✅ User names, emails, descriptions
- ✅ Asset metadata (names, descriptions, tags)
- ✅ Patch/deployment info (names, descriptions)
- ✅ Report subjects and messages
- ✅ Policy/alert names and descriptions
- ✅ Integration names and types
- ✅ Any text field users can edit

### DON'T sanitize these:
- ❌ Numbers, booleans (they're safe)
- ❌ Dates, timestamps (already validated)
- ❌ IDs, UUIDs (already validated)
- ❌ Select field values (predefined options only)
- ❌ Email addresses (validate instead)
- ❌ URLs (validate with URL() constructor)

---

## Implementation Pattern

### Pattern 1: Simple Form
```typescript
const handleSubmit = async () => {
  const values = await form.validateFields();

  // Sanitize
  const sanitized = {
    ...values,
    name: sanitizeInput(values.name),
    description: sanitizeInput(values.description),
  };

  // Submit
  await mutation.mutateAsync(sanitized);
};
```

### Pattern 2: Conditional Fields
```typescript
const sanitized = {
  ...values,
  name: sanitizeInput(values.name),
  // Only sanitize if field has value
  description: values.description ? sanitizeInput(values.description) : values.description,
  owner: values.owner ? sanitizeInput(values.owner) : undefined,
};
```

### Pattern 3: Dynamic Arrays
```typescript
// For forms with dynamic lists (add/remove rows)
const sanitized = {
  ...values,
  items: items.map(item => ({
    ...item,
    name: sanitizeInput(item.name),
    value: sanitizeInput(item.value),
  })),
};
```

### Pattern 4: Batch Sanitization
```typescript
import { sanitizeObject } from '../../../utils/sanitize';

const sanitized = sanitizeObject(values, [
  'firstName',
  'lastName',
  'description',
  'owner',
]);

await mutation.mutateAsync(sanitized);
```

---

## Common Mistakes to Avoid

### ❌ WRONG: Sanitize after mutation
```typescript
await mutation.mutateAsync(values);  // Data sent unsanitized!
const sanitized = sanitizeInput(values.name);  // Too late
```

### ✅ CORRECT: Sanitize before mutation
```typescript
const sanitized = { ...values, name: sanitizeInput(values.name) };
await mutation.mutateAsync(sanitized);
```

---

### ❌ WRONG: Forget optional fields
```typescript
const sanitized = {
  name: sanitizeInput(values.name),
  // description is missing - no protection!
};
```

### ✅ CORRECT: Handle all text fields
```typescript
const sanitized = {
  name: sanitizeInput(values.name),
  description: values.description ? sanitizeInput(values.description) : values.description,
};
```

---

### ❌ WRONG: Sanitize non-text fields
```typescript
const sanitized = {
  status: sanitizeInput(values.status),  // Select field - don't sanitize
  count: sanitizeInput(values.count),     // Number field - don't sanitize
};
```

### ✅ CORRECT: Only sanitize text
```typescript
const sanitized = {
  name: sanitizeInput(values.name),      // Text - sanitize
  status: values.status,                  // Select - don't sanitize
  count: values.count,                    // Number - don't sanitize
};
```

---

## Testing XSS Protection

### Manual Test Cases:

1. **Basic XSS Payload:**
   ```
   Input: <script>alert('XSS')</script>
   Expected: Empty string or plaintext with tags removed
   ```

2. **Event Handler:**
   ```
   Input: <img src=x onerror="alert('XSS')">
   Expected: Empty string or <img> tag without onerror
   ```

3. **JavaScript Protocol:**
   ```
   Input: <a href="javascript:alert('XSS')">Click</a>
   Expected: <a href="#">Click</a> or plain text
   ```

4. **Normal Text (Should Work):**
   ```
   Input: John O'Reilly Jr.
   Expected: John O'Reilly Jr.
   ```

5. **Special Characters (Should Work):**
   ```
   Input: Test-Name_123 & Co.
   Expected: Test-Name_123 & Co.
   ```

---

## Checklist for Code Review

When reviewing form submissions, verify:

- [ ] Import statement present: `import { sanitizeInput } from '...sanitize'`
- [ ] All text fields are sanitized in submit handler
- [ ] Optional fields handled correctly (check for null/undefined)
- [ ] Dynamic arrays sanitized properly if present
- [ ] Non-text fields (numbers, booleans, IDs) NOT sanitized
- [ ] Sanitized values used when calling `mutateAsync()`
- [ ] No `any` or `@ts-ignore` around sanitization code

---

## Troubleshooting

### Problem: Form submission fails after adding sanitization

**Check:**
- Did you sanitize the `email` field? (Validate instead, don't sanitize)
- Did you sanitize a `Select` field? (Don't - values are predefined)
- Did the sanitized data structure change? (Should be same keys)

### Problem: Data looks wrong after sanitization

**Examples:**
- Input: `"Sergei's Company"` → Output: `"Sergei's Company"` ✅ (Correct)
- Input: `"Test<img src=x>"` → Output: `"Test"` ✅ (Correct - dangerous tag removed)
- Input: `"A & B"` → Output: `"A & B"` ✅ (Correct - ampersand kept)

### Problem: Form validation isn't working

**Check:**
- Sanitization happens AFTER validation, not before
- Form validation rules are still in place on Input components
- You're not sanitizing in the validator function itself

---

## References

- Utilities: `/frontend/src/utils/sanitize.ts`
- Audit Report: `/XSS_PROTECTION_AUDIT_REPORT.md`
- Applied Fixes: `/XSS_PROTECTION_FIXES_APPLIED.md`
- OWASP: https://owasp.org/www-community/attacks/xss/

---

## Questions?

If you're unsure whether to sanitize a field, ask:
1. Can users type arbitrary text in this field?
   - Yes → Sanitize
   - No (predefined options) → Don't sanitize

2. Will this value be stored in the database?
   - Yes → Sanitize
   - No (temporary) → Still sanitize (defense in depth)

3. Could this value be displayed to other users?
   - Yes → Sanitize
   - No (personal data only) → Still sanitize

**When in doubt: SANITIZE! It's free (minimal performance impact) and safe.**

---

*Last updated: 2026-02-17*
