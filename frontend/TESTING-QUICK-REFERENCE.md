# Frontend Testing Quick Reference

## Commands

```bash
# Run all unit tests
npm run test:unit

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:unit:coverage

# Interactive UI
npm run test:unit:ui

# Run specific test file
npm run test:unit -- path/to/test.ts

# E2E tests (Playwright)
npm test
```

## Test File Structure

```
src/
  components/
    shared/
      __tests__/
        Component.test.tsx
      Component.tsx
```

## Component Test Template

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<MyComponent onClick={onClick} />);
    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

## Hook Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(initialValue);
  });

  it('updates state', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.setValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });
});
```

## Utility Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { myUtility } from '../myUtility';

describe('myUtility', () => {
  it('handles valid input', () => {
    expect(myUtility('input')).toBe('expected');
  });

  it('handles edge cases', () => {
    expect(myUtility(null)).toBe('default');
    expect(myUtility('')).toBe('default');
  });
});
```

## Common Queries (React Testing Library)

```typescript
// By Role (preferred)
screen.getByRole('button', { name: 'Submit' });
screen.getByRole('textbox', { name: 'Email' });

// By Label
screen.getByLabelText('Email');

// By Text
screen.getByText('Welcome');

// By Test ID (last resort)
screen.getByTestId('submit-button');

// Async queries (wait for element)
await screen.findByText('Loaded');
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

## User Interactions

```typescript
const user = userEvent.setup();

// Click
await user.click(screen.getByRole('button'));

// Type
await user.type(screen.getByLabelText('Email'), 'test@example.com');

// Select
await user.selectOptions(screen.getByRole('combobox'), 'option1');

// Hover
await user.hover(screen.getByText('Tooltip trigger'));
```

## Mocking

```typescript
// Mock function
const mockFn = vi.fn();
mockFn('test');
expect(mockFn).toHaveBeenCalledWith('test');

// Mock implementation
const mockFn = vi.fn((x) => x * 2);

// Mock module
vi.mock('../api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: [] })),
}));
```

## Coverage Targets

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

## Resources

- Full Guide: `frontend/UNIT-TESTING-GUIDE.md`
- Vitest Docs: https://vitest.dev/
- React Testing Library: https://testing-library.com/react

## Tips

- Test behavior, not implementation
- Use accessible queries (getByRole, getByLabel)
- One concept per test
- Mock external dependencies
- Clean up after tests (automatic in setup)
