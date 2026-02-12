import { useState, useRef, useEffect, useCallback } from 'react';
import {
  CloseOutlined,
  SendOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import aiService from '@/services/ai.service';
const suggestedPrompts = [
  'What can PatchIQ AI assist with?',
  'How do I deploy patches?',
  'Show me security overview',
];
import { SparklesIcon } from './SparklesIcon';
import './AIChatPanel.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 320;
const MAX_WIDTH = 700;

export const AIChatPanel = ({ open, onClose }: AIChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Hi! I'm the PatchIQ Assistant. I can help you with patch status, vulnerability insights, asset health, and more. What would you like to know?",
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Resize drag handling
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelRef.current?.offsetWidth || DEFAULT_WIDTH;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const resetWidth = () => {
    setWidth(DEFAULT_WIDTH);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: text.trim(),
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Convert messages to API format (last 20 messages)
      const conversationHistory = messages
        .slice(-20)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : ('assistant' as const),
          content: msg.text
        }));

      // Call AI service
      const response = await aiService.sendChatMessage({
        message: text.trim(),
        conversationHistory
      });

      // Add bot response
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        text: response.message,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMsg]);

    } catch (err: unknown) {
      // User-friendly error messages
      let errorMessage = 'Something went wrong. Please try again.';
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 429) {
        errorMessage = 'You\'re sending messages too quickly. Please wait a moment.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please refresh the page.';
      } else if (error.response?.status === 503 || error.response?.status === 502) {
        errorMessage = 'AI service is temporarily unavailable. Please try again later.';
      } else if (error.response?.status === 504) {
        errorMessage = 'Request timed out. The AI is taking too long to respond.';
      }

      // Show error as bot message
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        text: `⚠️ ${errorMessage}`,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMsg]);

    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderMessageText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <div
          key={i}
          dangerouslySetInnerHTML={{ __html: formatted }}
          style={{ minHeight: line === '' ? 8 : undefined }}
        />
      );
    });
  };

  return (
    <div
      ref={panelRef}
      className={`ai-chat-panel ${open ? 'open' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{ width }}
    >
      {/* Resize handle on left edge */}
      <div
        className={`ai-chat-resize-handle ${isResizing ? 'dragging' : ''}`}
        onMouseDown={handleResizeStart}
      />

      <div className="ai-chat-panel-header">
        <div className="ai-chat-panel-header-title">
          <SparklesIcon style={{ fontSize: 15, color: '#1677ff' }} />
          PatchIQ Assistant
        </div>
        <div className="ai-chat-panel-header-actions">
          <Tooltip title="Reset width">
            <Button
              type="text"
              size="small"
              icon={<ColumnWidthOutlined style={{ fontSize: 14, color: '#8c8c8c' }} />}
              onClick={resetWidth}
            />
          </Tooltip>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />}
            onClick={onClose}
          />
        </div>
      </div>

      <div className="ai-chat-panel-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-chat-message ${msg.sender}`}>
            {msg.sender === 'bot' ? renderMessageText(msg.text) : msg.text}
          </div>
        ))}
        {isTyping && (
          <div className="ai-chat-typing">
            <div className="ai-chat-typing-dot" />
            <div className="ai-chat-typing-dot" />
            <div className="ai-chat-typing-dot" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="ai-chat-suggestions">
          {suggestedPrompts.map((prompt) => (
            <div
              key={prompt}
              className="ai-chat-suggestion-chip"
              onClick={() => sendMessage(prompt)}
            >
              {prompt}
            </div>
          ))}
        </div>
      )}

      <div className="ai-chat-panel-input">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about patches, vulnerabilities..."
          disabled={isTyping}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          size="small"
          style={{ borderRadius: 8 }}
        />
      </div>
    </div>
  );
};
