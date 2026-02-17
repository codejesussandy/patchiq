# Integration Testing Guide

This guide explains how to write and run integration tests for the PatchIQ frontend application.

## Table of Contents

- [What Are Integration Tests?](#what-are-integration-tests)
- [When to Write Integration Tests](#when-to-write-integration-tests)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Writing Integration Tests](#writing-integration-tests)
- [MSW (Mock Service Worker)](#msw-mock-service-worker)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## What Are Integration Tests?

Integration tests verify that multiple parts of your application work together correctly. Unlike unit tests that test individual functions in isolation, integration tests verify the interaction between:

- **React Components** + **React Query Hooks** + **API Services**
- **Forms** + **Validation** + **Submission** + **API calls**
- **User Interactions** + **State Management** + **UI Updates**

### Integration vs Unit vs E2E Tests

| Test Type | Scope | Speed | Dependencies |
|-----------|-------|-------|--------------|
| **Unit** | Single function/component | Fast | Mocked |
| **Integration** | Multiple components + hooks + services | Medium | API mocked with MSW |
| **E2E** | Full application flow | Slow | Real backend |

**Integration tests are the sweet spot** - they're faster than E2E tests but more comprehensive than unit tests.

---

## When to Write Integration Tests

Write integration tests for:

1. **CRUD Operations**
   - Create/Read/Update/Delete flows
   - Form submission → API call → Success feedback → List refresh

2. **Complex User Workflows**
   - Multi-step processes
   - Modal interactions
   - Search and filtering

3. **React Query Integration**
   - Data fetching + loading states
   - Cache invalidation after mutations
   - Error handling

4. **Form Validation**
   - Client-side validation
   - Server-side error responses
   - Field-level error display

5. **Component Interactions**
   - Parent-child communication
   - State sharing between components
   - Event propagation

---

## Test Infrastructure

### Directory Structure

```
frontend/src/__tests__/
├── integration/              # Integration test files
│   ├── asset-crud.test.tsx
│   ├── react-query-integration.test.tsx
│   ├── form-validation.test.tsx
│   └── data-table-filters.test.tsx
├── mocks/                    # MSW mock handlers
│   ├── handlers.ts
│   └── server.ts
├── utils/                    # Test utilities
│   └── test-utils.tsx
└── setup.ts                  # Global test setup
```

### Key Files

#### `vitest.integration.config.ts`
Vitest configuration for integration tests with 10-second timeout.

#### `src/__tests__/setup.ts`
Global setup that:
- Starts MSW server before all tests
- Resets handlers after each test
- Cleans up DOM after each test

#### `src/__tests__/utils/test-utils.tsx`
Custom render functions with all providers:
- `QueryClientProvider` (React Query)
- `BrowserRouter` (React Router)
- `AuthProvider` (Authentication)
- `App` (Ant Design)

#### `src/__tests__/mocks/handlers.ts`
MSW request handlers for mocking API responses.

---

## Running Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run in Watch Mode
```bash
npm run test:integration:watch
```

### Run with UI
```bash
npm run test:integration:ui
```

### Run Specific Test File
```bash
npx vitest run src/__tests__/integration/asset-crud.test.tsx
```

### Run Tests Matching Pattern
```bash
npx vitest run --config vitest.integration.config.ts -t "Create Asset"
```

---

## Writing Integration Tests

### Basic Test Structure

```tsx
import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../utils/test-utils';
import { MyComponent } from '../../components/MyComponent';

describe('My Feature Integration Tests', () => {
  it('should complete full workflow', async () => {
    const user = userEvent.setup();
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <MyComponent />
    );

    // 1. Wait for initial data to load
    await waitFor(() => {
      expect(getByText('Some Data')).toBeInTheDocument();
    });

    // 2. Interact with UI
    const button = getByText('Click Me');
    await user.click(button);

    // 3. Verify result
    await waitFor(() => {
      expect(getByText('Success!')).toBeInTheDocument();
    });
  });
});
```

### Using Custom Render

```tsx
// With all providers (default)
const { getByText } = renderWithProviders(<MyComponent />);

// With custom initial route
const { getByText } = renderWithProviders(<MyComponent />, {
  initialRoute: '/assets/123',
});

// With custom QueryClient
const customQueryClient = new QueryClient({ /* config */ });
const { getByText, queryClient } = renderWithProviders(<MyComponent />, {
  queryClient: customQueryClient,
});
```

### Async Operations

Always use `waitFor` for async operations:

```tsx
// ✅ Good - Wait for data
await waitFor(() => {
  expect(getByText('Loaded Data')).toBeInTheDocument();
});

// ❌ Bad - Race condition
expect(getByText('Loaded Data')).toBeInTheDocument();
```

### User Interactions

Use `userEvent` instead of `fireEvent`:

```tsx
const user = userEvent.setup();

// Type in input
await user.type(inputElement, 'Hello');

// Click button
await user.click(button);

// Select from dropdown
await user.click(selectElement);
await user.click(optionElement);

// Clear input
await user.clear(inputElement);
```

---

## MSW (Mock Service Worker)

MSW intercepts HTTP requests and returns mock responses without touching your application code.

### Basic Handler

```tsx
// src/__tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:3000/api/assets', () => {
    return HttpResponse.json({
      success: true,
      data: {
        data: [
          { id: '1', name: 'Asset 1' },
          { id: '2', name: 'Asset 2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    });
  }),
];
```

### Dynamic Handlers

```tsx
// Read query parameters
http.get('http://localhost:3000/api/assets', ({ request }) => {
  const url = new URL(request.url);
  const search = url.searchParams.get('search');

  // Filter based on search
  const filtered = search
    ? assets.filter(a => a.name.includes(search))
    : assets;

  return HttpResponse.json({ success: true, data: filtered });
});

// Read request body
http.post('http://localhost:3000/api/assets', async ({ request }) => {
  const body = await request.json();
  const newAsset = createMockAsset(body);
  return HttpResponse.json({ success: true, data: newAsset });
});

// Access URL parameters
http.get('http://localhost:3000/api/assets/:id', ({ params }) => {
  const { id } = params;
  return HttpResponse.json({
    success: true,
    data: { id, name: `Asset ${id}` }
  });
});
```

### Override Handlers in Tests

```tsx
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

it('should handle API error', async () => {
  // Override default handler for this test
  server.use(
    http.get('http://localhost:3000/api/assets', () => {
      return HttpResponse.json(
        {
          success: false,
          error: { message: 'Server error' },
        },
        { status: 500 }
      );
    })
  );

  // Test error handling
  const { getByText } = renderWithProviders(<MyComponent />);

  await waitFor(() => {
    expect(getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Mock Data Factories

Create reusable mock data factories:

```tsx
// src/__tests__/mocks/handlers.ts
export const createMockAsset = (overrides = {}) => ({
  id: 'test-1',
  name: 'Test Asset',
  assetType: 'DESKTOP',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Usage
const asset1 = createMockAsset({ id: '1', name: 'Asset 1' });
const asset2 = createMockAsset({ id: '2', name: 'Asset 2' });
```

---

## Best Practices

### 1. Test User Workflows, Not Implementation

```tsx
// ✅ Good - Tests what the user does
it('should create new asset when user fills form and clicks submit', async () => {
  const user = userEvent.setup();
  const { getByPlaceholderText, getByText } = renderWithProviders(<Page />);

  await user.click(getByText('Add Asset'));
  await user.type(getByPlaceholderText('Enter name'), 'New Asset');
  await user.click(getByText('Submit'));

  await waitFor(() => {
    expect(getByText('Asset created successfully')).toBeInTheDocument();
  });
});

// ❌ Bad - Tests implementation details
it('should call createAsset mutation', () => {
  const spy = vi.spyOn(assetService, 'createAsset');
  // ...
  expect(spy).toHaveBeenCalled();
});
```

### 2. Use Accessible Queries

Priority order for queries:

1. `getByRole` - Most accessible
2. `getByLabelText` - For form inputs
3. `getByPlaceholderText` - For inputs without labels
4. `getByText` - For content
5. `getByTestId` - Last resort

```tsx
// ✅ Best
const button = getByRole('button', { name: 'Submit' });
const input = getByLabelText('Asset Name');

// ✅ Good
const searchBox = getByPlaceholderText('Search...');

// ⚠️ OK
const heading = getByText('Asset Management');

// ❌ Last resort
const element = getByTestId('submit-button');
```

### 3. Test Loading and Error States

```tsx
it('should show loading state then data', async () => {
  const { getByText, queryByText } = renderWithProviders(<AssetList />);

  // Initially loading
  expect(getByText('Loading...')).toBeInTheDocument();

  // Then data appears
  await waitFor(() => {
    expect(queryByText('Loading...')).not.toBeInTheDocument();
    expect(getByText('Asset 1')).toBeInTheDocument();
  });
});

it('should show error state on failure', async () => {
  server.use(
    http.get('/api/assets', () =>
      HttpResponse.json({ error: 'Failed' }, { status: 500 })
    )
  );

  const { getByText } = renderWithProviders(<AssetList />);

  await waitFor(() => {
    expect(getByText(/error/i)).toBeInTheDocument();
  });
});
```

### 4. Clean Up After Each Test

The test setup automatically:
- Resets MSW handlers
- Clears React Query cache
- Cleans up DOM
- Clears localStorage

No manual cleanup needed!

### 5. Avoid Testing Library Implementation

```tsx
// ❌ Bad - Testing React Query internals
expect(queryClient.getQueryData(['assets'])).toEqual(expectedData);

// ✅ Good - Testing what the user sees
expect(getByText('Asset 1')).toBeInTheDocument();
```

### 6. Group Related Tests

```tsx
describe('Asset CRUD Operations', () => {
  describe('Create Asset', () => {
    it('should create asset successfully', () => {});
    it('should show validation errors', () => {});
    it('should handle API errors', () => {});
  });

  describe('Update Asset', () => {
    it('should update asset successfully', () => {});
    it('should pre-fill form with existing data', () => {});
  });

  describe('Delete Asset', () => {
    it('should delete after confirmation', () => {});
    it('should cancel deletion', () => {});
  });
});
```

---

## Examples

### Example 1: Testing React Query Hook

```tsx
function TestComponent() {
  const { data, isLoading, error } = useAssets();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map(asset => (
        <li key={asset.id}>{asset.name}</li>
      ))}
    </ul>
  );
}

it('should fetch and display assets', async () => {
  const { getByText } = renderWithProviders(<TestComponent />);

  expect(getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(getByText('Asset 1')).toBeInTheDocument();
    expect(getByText('Asset 2')).toBeInTheDocument();
  });
});
```

### Example 2: Testing Form Validation

```tsx
it('should prevent submission with invalid data', async () => {
  const handleSubmit = vi.fn();
  const user = userEvent.setup();
  const { getByPlaceholderText, getByText } = renderWithProviders(
    <FormModal open onClose={() => {}} onSubmit={handleSubmit}>
      <Form.Item name="email" rules={[{ type: 'email' }]}>
        <Input placeholder="Email" />
      </Form.Item>
    </FormModal>
  );

  const emailInput = getByPlaceholderText('Email');
  await user.type(emailInput, 'invalid-email');

  const submitButton = getByText('Submit');
  await user.click(submitButton);

  await waitFor(() => {
    expect(getByText('Invalid email format')).toBeInTheDocument();
  });

  expect(handleSubmit).not.toHaveBeenCalled();
});
```

### Example 3: Testing DataTable with Search

```tsx
it('should filter data when searching', async () => {
  const handleSearch = vi.fn();
  const user = userEvent.setup();
  const { getByPlaceholderText } = renderWithProviders(
    <DataTable
      data={mockData}
      columns={columns}
      searchable
      onSearch={handleSearch}
    />
  );

  const searchInput = getByPlaceholderText('Search...');
  await user.type(searchInput, 'test query');

  await waitFor(() => {
    expect(handleSearch).toHaveBeenCalledWith('test query');
  }, { timeout: 1000 }); // Account for debounce
});
```

### Example 4: Testing Complete CRUD Flow

```tsx
it('should complete create → read → update → delete flow', async () => {
  const user = userEvent.setup();
  const { getByText, getByPlaceholderText } = renderWithProviders(<AssetPage />);

  // 1. Initial list load
  await waitFor(() => {
    expect(getByText('Asset 1')).toBeInTheDocument();
  });

  // 2. Create new asset
  await user.click(getByText('Add Asset'));
  await user.type(getByPlaceholderText('Enter name'), 'New Asset');
  await user.click(getByText('Submit'));

  await waitFor(() => {
    expect(getByText('Asset created')).toBeInTheDocument();
  });

  // 3. Edit asset
  await user.click(getByText('Edit'));
  const nameInput = getByPlaceholderText('Enter name');
  await user.clear(nameInput);
  await user.type(nameInput, 'Updated Asset');
  await user.click(getByText('Submit'));

  await waitFor(() => {
    expect(getByText('Asset updated')).toBeInTheDocument();
  });

  // 4. Delete asset
  await user.click(getByText('Delete'));
  await user.click(getByText('Confirm'));

  await waitFor(() => {
    expect(getByText('Asset deleted')).toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Tests Timing Out

Increase timeout in specific tests:

```tsx
it('should complete slow operation', async () => {
  // Test code
}, 15000); // 15 second timeout
```

### MSW Not Intercepting Requests

Check that:
1. Server is started in `setup.ts`
2. Handler URL matches exactly (including protocol and port)
3. Request method matches (GET, POST, etc.)

```tsx
// ❌ Wrong - missing port
http.get('http://localhost/api/assets', ...)

// ✅ Correct
http.get('http://localhost:3000/api/assets', ...)
```

### React Query Not Updating

Ensure you're using `waitFor`:

```tsx
// ❌ Bad
expect(getByText('New Data')).toBeInTheDocument();

// ✅ Good
await waitFor(() => {
  expect(getByText('New Data')).toBeInTheDocument();
});
```

### Form Validation Not Showing

Wait for validation to trigger:

```tsx
await user.click(submitButton);

await waitFor(() => {
  expect(getByText('Validation error')).toBeInTheDocument();
});
```

---

## Resources

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)

---

## Summary

Integration tests are essential for:
- ✅ Verifying component interactions
- ✅ Testing React Query hooks with API calls
- ✅ Validating form workflows
- ✅ Ensuring user journeys work end-to-end

Use MSW to mock API responses and focus on testing what users experience, not implementation details.

Happy testing! 🧪
