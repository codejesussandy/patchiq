import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { AIChatPanel } from '../../../components/chat/AIChatPanel';
import { server } from '../../msw/server';
import { http, HttpResponse } from 'msw';

describe('AI Chat Panel', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders chat panel when open', () => {
    const onClose = vi.fn();
    render(<AIChatPanel open={true} onClose={onClose} />);

    expect(screen.getByText('PatchIQ Assistant')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    const onClose = vi.fn();
    const { container } = render(<AIChatPanel open={false} onClose={onClose} />);

    // Panel exists in DOM but is not open — CSS class 'open' absent
    const panel = container.querySelector('.ai-chat-panel');
    expect(panel).toBeInTheDocument();
    expect(panel).not.toHaveClass('open');
  });

  it('shows suggested prompts when empty', () => {
    const onClose = vi.fn();
    render(<AIChatPanel open={true} onClose={onClose} />);

    expect(screen.getByText('What can PatchIQ AI assist with?')).toBeInTheDocument();
    expect(screen.getByText('How do I deploy patches?')).toBeInTheDocument();
    expect(screen.getByText('Show me security overview')).toBeInTheDocument();
  });

  it('sends message and shows response', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AIChatPanel open={true} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/ask about patches/i);
    await user.type(input, 'What patches are available?');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/I can help you with patch management/i)).toBeInTheDocument();
    });
  });

  it('shows user message in chat history', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AIChatPanel open={true} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/ask about patches/i);
    const userMessage = 'Show me all critical patches';
    await user.type(input, userMessage);

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(userMessage)).toBeInTheDocument();
    });
  });

  it('shows loading indicator while waiting', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    // Delay the response to catch the typing indicator
    server.use(
      http.post('*/ai/chat', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          success: true,
          data: {
            message: 'Delayed response',
            model: 'gpt-4',
            usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
          },
        });
      })
    );

    render(<AIChatPanel open={true} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/ask about patches/i);
    await user.type(input, 'Show vulnerabilities');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Typing indicator (3 dots) should appear
    await waitFor(() => {
      const typingDots = document.querySelectorAll('.ai-chat-typing-dot');
      expect(typingDots.length).toBe(3);
    });

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Delayed response')).toBeInTheDocument();
    });
  });

  it('shows error message when API fails', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    server.use(
      http.post('*/ai/chat', () => {
        return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
      })
    );

    render(<AIChatPanel open={true} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/ask about patches/i);
    await user.type(input, 'Test message');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
  });

  it('closes panel when close button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AIChatPanel open={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close AI chat');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles empty input', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    let chatCalled = false;

    server.use(
      http.post('*/ai/chat', () => {
        chatCalled = true;
        return HttpResponse.json({ success: true, data: { message: 'response', model: 'gpt-4', usage: {} } });
      })
    );

    render(<AIChatPanel open={true} onClose={onClose} />);

    // Send button should be disabled when input is empty
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();

    // Try clicking anyway — no API call should be made
    await user.click(sendButton);
    expect(chatCalled).toBe(false);
  });
});
