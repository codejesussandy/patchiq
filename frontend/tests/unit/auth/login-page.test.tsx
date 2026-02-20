import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test-utils';
import { Login } from '@/pages/Login';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    login: mockLogin,
    isAuthenticated: false,
    isLoading: false,
    user: null,
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the welcome title', () => {
    render(<Login />);
    expect(screen.getByText('Welcome to InventIQ')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<Login />);
    expect(screen.getByText(/enter your details to sign in/i)).toBeInTheDocument();
  });

  it('renders email input field', () => {
    render(<Login />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders password input field', () => {
    render(<Login />);
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders Log in button', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    render(<Login />);
    expect(screen.getByText('Forgot password')).toBeInTheDocument();
  });
});
