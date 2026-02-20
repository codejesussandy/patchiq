import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { ErrorState, NetworkErrorState, APIErrorState } from '@/components/shared/ErrorState';

describe('ErrorState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default title', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders default message', () => {
    render(<ErrorState />);
    expect(screen.getByText('Unable to load data. Please try again.')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorState title="Connection Lost" />);
    expect(screen.getByText('Connection Lost')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<ErrorState message="Could not connect to server" />);
    expect(screen.getByText('Could not connect to server')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    render(<ErrorState onRetry={vi.fn()} />);
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByText('Try Again'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not render retry button when showRetryButton is false', () => {
    render(<ErrorState onRetry={vi.fn()} showRetryButton={false} />);
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState />);
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });
});

describe('NetworkErrorState', () => {
  it('renders network error title and message', () => {
    render(<NetworkErrorState />);
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(
      screen.getByText('Unable to connect to the server. Please check your internet connection and try again.'),
    ).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    render(<NetworkErrorState onRetry={vi.fn()} />);
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});

describe('APIErrorState', () => {
  it('renders default API error title', () => {
    render(<APIErrorState />);
    expect(screen.getByText('Failed to Load Data')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<APIErrorState message="User not found" />);
    expect(screen.getByText('User not found')).toBeInTheDocument();
  });

  it('renders default message when none provided', () => {
    render(<APIErrorState />);
    expect(
      screen.getByText('An error occurred while fetching data from the server.'),
    ).toBeInTheDocument();
  });
});
