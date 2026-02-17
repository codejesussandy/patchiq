# Frontend Unit Testing Guide

This guide covers unit testing for the PatchIQ frontend using Vitest, React Testing Library, and best practices.

## Table of Contents

- [Quick Start](#quick-start)
- [Testing Philosophy](#testing-philosophy)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Testing Patterns](#testing-patterns)
- [Coverage Expectations](#coverage-expectations)
- [Best Practices](#best-practices)

## Quick Start

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:unit:coverage

# Open Vitest UI
npm run test:unit:ui

# Run specific test file
npm run test:unit -- src/hooks/__tests__/useModal.test.ts
```

## Testing Philosophy

### What to Test

✅ **DO test:**
- Component rendering with different props
- User interactions (clicks, form inputs, etc.)
- State changes and side effects
- Hook behavior and state management
- Utility functions and helpers
- Error handling
- Conditional rendering

❌ **DON'T test:**
- Implementation details (internal state, private methods)
- Third-party libraries
- Visual styling (use E2E tests for visual regression)
- Complex integration flows (use E2E tests)

### Test Pyramid

```
     /\
    /  \     E2E Tests (85 tests in Playwright)
   /    \    - Full user flows
  /------\   - Cross-module integration
 /        \
/__________\ Unit Tests (This layer)
             - Component logic
             - Hook behavior
             - Utility functions
```

## Running Tests

### Development Workflow

```bash
# Watch mode - runs tests on file changes
npm run test:watch

# Single run - for CI/CD
npm run test:unit

# Coverage - generates HTML report in coverage/
npm run test:unit:coverage

# UI Mode - interactive test runner
npm run test:unit:ui
```

### Running Specific Tests

```bash
# Run tests in a specific directory
npm run test:unit -- src/components/

# Run a single test file
npm run test:unit -- src/hooks/__tests__/useModal.test.ts

# Run tests matching a pattern
npm run test:unit -- --grep "should handle loading"
```

## Writing Tests

### Test File Structure

Place test files next to the code they test in a `__tests__` directory:

```
src/
  components/
    shared/
      __tests__/
        ConfirmModal.test.tsx
      ConfirmModal.tsx
  hooks/
    __tests__/
      useModal.test.ts
    useModal.ts
  utils/
    __tests__/
      dateFormat.test.ts
    dateFormat.ts
```

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Test suites: Use descriptive `describe` blocks
- Test cases: Use "should" statements

```typescript
describe('useModal', () => {
  it('should initialize with closed state', () => {
    // test code
  });

  it('should open modal with selected item', () => {
    // test code
  });
});
```

## Testing Patterns

### 1. Testing Components

Use React Testing Library to test components from the user's perspective.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmModal } from '../ConfirmModal';

describe('ConfirmModal', () => {
  it('renders with title and description', () => {
    render(
      <ConfirmModal
        title="Delete Item"
        description="Are you sure?"
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        title="Delete"
        description="Confirm?"
        open={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
```

**Key Points:**
- Use `userEvent` for user interactions (more realistic than `fireEvent`)
- Query by accessible roles and text (not implementation details)
- Mock callbacks with `vi.fn()`
- Test what the user sees, not internal state

### 2. Testing Hooks

Use `renderHook` from React Testing Library to test custom hooks.

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModal } from '../useModal';

describe('useModal', () => {
  it('initializes with closed state', () => {
    const { result } = renderHook(() => useModal());

    expect(result.current.open).toBe(false);
    expect(result.current.selectedItem).toBeNull();
  });

  it('opens modal with selected item', () => {
    const { result } = renderHook(() => useModal<string>());

    act(() => {
      result.current.onOpen('test-item');
    });

    expect(result.current.open).toBe(true);
    expect(result.current.selectedItem).toBe('test-item');
  });

  it('maintains referential equality for callbacks', () => {
    const { result, rerender } = renderHook(() => useModal());

    const firstOnOpen = result.current.onOpen;
    rerender();

    expect(result.current.onOpen).toBe(firstOnOpen);
  });
});
```

**Key Points:**
- Use `act()` for state updates
- Test callback stability (important for `useCallback`)
- Test with different generic types
- Test complete state transitions

### 3. Testing Utilities

Pure functions are the easiest to test.

```typescript
import { describe, it, expect } from 'vitest';
import { formatDuration } from '../dateFormat';

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(5000)).toBe('5s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
  });

  it('handles zero duration', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('handles negative duration', () => {
    expect(formatDuration(-1000)).toBe('0s');
  });
});
```

**Key Points:**
- Test happy path
- Test edge cases (null, undefined, empty, negative)
- Test boundary conditions
- One assertion per test (generally)

### 4. Testing React Query Hooks

For hooks that use React Query, you'll need to wrap them in a QueryClientProvider.

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssets } from '../useAssets';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useAssets', () => {
  it('fetches assets successfully', async () => {
    const { result } = renderHook(() => useAssets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### 5. Mocking Functions

```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock a module
vi.mock('../api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: [] })),
}));

// Mock with implementation
const mockFn = vi.fn((x: number) => x * 2);
mockFn(2); // returns 4

// Assert calls
expect(mockFn).toHaveBeenCalledWith(2);
expect(mockFn).toHaveBeenCalledTimes(1);

// Clear mocks
mockFn.mockClear();
```

### 6. Testing Async Code

```typescript
import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';

it('handles async operations', async () => {
  // Option 1: async/await
  const result = await someAsyncFunction();
  expect(result).toBe('expected');

  // Option 2: waitFor
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });

  // Option 3: findBy (combines getBy + waitFor)
  const element = await screen.findByText('Loaded');
  expect(element).toBeInTheDocument();
});
```

## Coverage Expectations

### Target Coverage

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

### Focus Areas

**High Priority** (aim for >80% coverage):
- Shared components (`src/components/shared/`)
- Custom hooks (`src/hooks/`)
- Utility functions (`src/utils/`)
- Form validation logic
- Data transformation functions

**Medium Priority** (aim for >60% coverage):
- Page components
- Complex UI components
- Service layer

**Low Priority** (coverage not required):
- Configuration files
- Type definitions
- Constants
- Integration tests (covered by E2E)

### Viewing Coverage Reports

```bash
npm run test:unit:coverage
```

Open `coverage/index.html` in a browser to see detailed coverage reports.

## Best Practices

### Do's

✅ **Test behavior, not implementation**
```typescript
// Good - tests behavior
it('displays error message on invalid input', () => {
  // test user sees error
});

// Bad - tests implementation
it('sets hasError state to true', () => {
  // test internal state
});
```

✅ **Use accessible queries**
```typescript
// Good - accessible to users and screen readers
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email');

// Okay - when role isn't available
screen.getByText('Welcome');

// Last resort - avoid when possible
screen.getByTestId('submit-button');
```

✅ **Keep tests focused and independent**
```typescript
// Good - one concept per test
it('should validate email format', () => { /* ... */ });
it('should show error for empty email', () => { /* ... */ });

// Bad - testing multiple concepts
it('should validate all form fields', () => {
  // tests email, password, name, etc.
});
```

✅ **Use meaningful test data**
```typescript
// Good - realistic data
const user = { name: 'John Doe', email: 'john@example.com' };

// Bad - non-descriptive data
const user = { name: 'test', email: 'test' };
```

### Don'ts

❌ **Don't test third-party libraries**
```typescript
// Bad - testing Ant Design's Button component
it('renders Ant Design Button', () => {
  // Ant Design is already tested
});
```

❌ **Don't test implementation details**
```typescript
// Bad - testing internal state
expect(component.state.count).toBe(1);

// Good - testing visible output
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

❌ **Don't use snapshots excessively**
```typescript
// Avoid - snapshots are brittle
expect(container).toMatchSnapshot();

// Better - assert specific behavior
expect(screen.getByText('Expected Text')).toBeInTheDocument();
```

❌ **Don't forget to clean up**
```typescript
// Vitest setup handles cleanup automatically
// But if you manually create resources, clean them up

afterEach(() => {
  // cleanup if needed
});
```

### Common Patterns

**Testing conditional rendering:**
```typescript
it('shows loading state', () => {
  render(<Component loading={true} />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

it('shows content when loaded', () => {
  render(<Component loading={false} data={mockData} />);
  expect(screen.getByText('Content')).toBeInTheDocument();
});
```

**Testing form interactions:**
```typescript
it('submits form with valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<Form onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
});
```

**Testing error boundaries:**
```typescript
it('catches and displays errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Example Test Files

### Component Test Example
See: `src/components/shared/__tests__/ConfirmModal.test.tsx`
- 9 tests covering all props and interactions
- Tests callbacks, loading states, and variants

### Hook Test Example
See: `src/hooks/__tests__/useModal.test.ts`
- 8 tests covering state management
- Tests callback stability and type safety

### Utility Test Example
See: `src/utils/__tests__/dateFormat.test.ts`
- 36 tests covering all formatting functions
- Tests edge cases and locale handling

## Troubleshooting

### Tests fail with "localStorage is not defined"

Update `vitest.setup.ts` to mock localStorage:

```typescript
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});
```

### Tests fail with "matchMedia is not defined"

Already configured in `vitest.setup.ts`. Ant Design components require this mock.

### Tests run slowly

- Check if you're running E2E tests by accident (use `npm run test:unit`)
- Disable coverage if you don't need it
- Use `test.concurrent` for independent tests
- Mock heavy dependencies

### Coverage reports are inaccurate

- Ensure you're running `npm run test:unit:coverage`
- Check `vitest.config.ts` for correct coverage configuration
- Excluded directories are defined in the config

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)

## Contributing

When adding new features:

1. Write tests first (TDD) or immediately after implementation
2. Ensure tests pass locally before committing
3. Aim for >70% coverage on new code
4. Update this guide if you discover new patterns

## Questions?

- Check existing test files for examples
- Review the [Vitest docs](https://vitest.dev/)
- Ask in team chat for guidance
