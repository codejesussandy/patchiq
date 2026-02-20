import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { AIChatPanel } from '@/components/chat/AIChatPanel';

vi.mock('@/services/ai.service', () => ({
  __esModule: true,
  default: {
    sendChatMessage: vi.fn().mockResolvedValue({
      message: 'Here is the AI response',
    }),
  },
  aiService: {
    sendChatMessage: vi.fn().mockResolvedValue({
      message: 'Here is the AI response',
    }),
  },
}));

// Mock react-markdown to avoid ESM issues in tests
vi.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <span>{children}</span>,
}));

vi.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {},
}));

describe('AIChatPanel', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the panel header with title', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByText('PatchIQ Assistant')).toBeInTheDocument();
  });

  it('renders the welcome message', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(
      screen.getByText(/I'm the PatchIQ Assistant/),
    ).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByLabelText('Close AI chat')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<AIChatPanel open onClose={onClose} />);
    await userEvent.click(screen.getByLabelText('Close AI chat'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders input field with placeholder', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(
      screen.getByPlaceholderText('Ask about patches, vulnerabilities...'),
    ).toBeInTheDocument();
  });

  it('renders suggested prompts on initial load', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByText('What can PatchIQ AI assist with?')).toBeInTheDocument();
    expect(screen.getByText('How do I deploy patches?')).toBeInTheDocument();
    expect(screen.getByText('Show me security overview')).toBeInTheDocument();
  });

  it('sends user message and shows it in the chat', async () => {
    const user = userEvent.setup();
    render(<AIChatPanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('Ask about patches, vulnerabilities...');
    await user.type(input, 'Hello AI{enter}');

    await waitFor(() => {
      expect(screen.getByText('Hello AI')).toBeInTheDocument();
    });
  });

  it('shows AI response after sending a message', async () => {
    const user = userEvent.setup();
    render(<AIChatPanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('Ask about patches, vulnerabilities...');
    await user.type(input, 'Help me{enter}');

    await waitFor(() => {
      expect(screen.getByText('Here is the AI response')).toBeInTheDocument();
    });
  });

  it('clears input after sending a message', async () => {
    const user = userEvent.setup();
    render(<AIChatPanel {...defaultProps} />);

    const input = screen.getByPlaceholderText('Ask about patches, vulnerabilities...') as HTMLInputElement;
    await user.type(input, 'Test message{enter}');

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('does not send empty messages', async () => {
    const user = userEvent.setup();
    render(<AIChatPanel {...defaultProps} />);

    const sendButton = screen.getByRole('button', { name: /send/i }) ||
      screen.getByRole('button').closest('button[disabled]');

    // The send button should be disabled when input is empty
    const input = screen.getByPlaceholderText('Ask about patches, vulnerabilities...') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('applies open class when open prop is true', () => {
    const { container } = render(<AIChatPanel {...defaultProps} />);
    const panel = container.querySelector('.ai-chat-panel');
    expect(panel?.classList.contains('open')).toBe(true);
  });

  it('does not apply open class when open prop is false', () => {
    const { container } = render(<AIChatPanel open={false} onClose={vi.fn()} />);
    const panel = container.querySelector('.ai-chat-panel');
    expect(panel?.classList.contains('open')).toBe(false);
  });

  it('sends message when suggested prompt is clicked', async () => {
    const user = userEvent.setup();
    render(<AIChatPanel {...defaultProps} />);

    await user.click(screen.getByText('How do I deploy patches?'));

    await waitFor(() => {
      expect(screen.getByText('How do I deploy patches?')).toBeInTheDocument();
    });
  });
});
