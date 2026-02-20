import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test-utils';
import { ErrorBoundary, RootErrorBoundary } from '@/components/ErrorBoundary';

// A component that throws an error for testing
const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error from React and ErrorBoundary
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Working content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Working content')).toBeInTheDocument();
  });

  it('renders fallback UI when an error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays the error message in the fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback content</div>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback content')).toBeInTheDocument();
  });

  it('renders Try Again button in default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders Go to Dashboard button in default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('renders Refresh Page button in default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('calls onReset when Try Again is clicked', async () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByText('Try Again'));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('logs error to console', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(consoleError).toHaveBeenCalled();
  });
});

describe('RootErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <RootErrorBoundary>
        <div>Root content</div>
      </RootErrorBoundary>,
    );
    expect(screen.getByText('Root content')).toBeInTheDocument();
  });

  it('renders plain HTML fallback when an error is caught', () => {
    render(
      <RootErrorBoundary>
        <ThrowingComponent />
      </RootErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText('The application encountered an unexpected error. Please refresh the page.'),
    ).toBeInTheDocument();
  });

  it('renders Refresh Page button', () => {
    render(
      <RootErrorBoundary>
        <ThrowingComponent />
      </RootErrorBoundary>,
    );
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });
});
