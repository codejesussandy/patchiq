import { HttpError, TooManyRequestsError } from '@shared/errors';

const mockCreate = jest.fn();
const mockListModels = jest.fn();
const mockClient = {
  chat: { completions: { create: mockCreate } },
  models: { list: mockListModels },
};

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(),
  APIError: class APIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  },
}));

jest.mock('@config/index', () => ({
  config: {
    ai: {
      apiKey: 'test-api-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-sonnet-4-20250514',
      maxTokens: 1024,
    },
    isTest: true,
  },
}));

jest.mock('@shared/services/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { AiService } from '@modules/ai/ai.service';

const OpenAIMock = jest.requireMock('openai');

const SUCCESSFUL_RESPONSE = {
  choices: [{ message: { content: 'Hello from AI' } }],
  model: 'anthropic/claude-sonnet-4-20250514',
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

describe('AiService', () => {
  let service: AiService;
  let getClientSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCreate.mockReset();
    mockListModels.mockReset();
    service = new AiService();
    getClientSpy = jest.spyOn(service as any, 'getClient').mockReturnValue(mockClient);
  });

  it('should construct correct OpenRouter request', async () => {
    mockCreate.mockResolvedValueOnce(SUCCESSFUL_RESPONSE);
    await service.chat('What is PatchIQ?');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe('system');
    expect(callArgs.messages[0].content).toContain('PatchIQ Assistant');
    expect(callArgs.messages[1]).toEqual({ role: 'user', content: 'What is PatchIQ?' });
    expect(callArgs.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(callArgs.max_tokens).toBe(1024);
  });

  it('should include conversation history in messages', async () => {
    mockCreate.mockResolvedValueOnce(SUCCESSFUL_RESPONSE);
    const history = [
      { role: 'user' as const, content: 'Hi' },
      { role: 'assistant' as const, content: 'Hello!' },
      { role: 'user' as const, content: 'How are you?' },
    ];
    await service.chat('Tell me about patches', history);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(5);
    expect(callArgs.messages[0].role).toBe('system');
    expect(callArgs.messages[1]).toEqual({ role: 'user', content: 'Hi' });
    expect(callArgs.messages[2]).toEqual({ role: 'assistant', content: 'Hello!' });
    expect(callArgs.messages[3]).toEqual({ role: 'user', content: 'How are you?' });
    expect(callArgs.messages[4]).toEqual({ role: 'user', content: 'Tell me about patches' });
  });

  it('should cap conversation history at 20 messages', async () => {
    mockCreate.mockResolvedValueOnce(SUCCESSFUL_RESPONSE);
    const history = Array.from({ length: 30 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i}`,
    }));
    await service.chat('Final message', history);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(22);
    expect(callArgs.messages[1].content).toBe('Message 10');
    expect(callArgs.messages[21]).toEqual({ role: 'user', content: 'Final message' });
  });

  it('should return fallback when API key is missing', async () => {
    getClientSpy.mockReturnValue(null);
    const result = await service.chat('Hello');
    expect(result.model).toBe('fallback');
    expect(result.message).toContain('not configured');
    expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should return correct response shape with usage', async () => {
    mockCreate.mockResolvedValueOnce(SUCCESSFUL_RESPONSE);
    const result = await service.chat('Hello');
    expect(result.message).toBe('Hello from AI');
    expect(result.model).toBe('anthropic/claude-sonnet-4-20250514');
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
  });

  it('should throw HttpError 504 on OpenRouter timeout', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockCreate.mockRejectedValueOnce(abortError);
    await expect(service.chat('Hello')).rejects.toMatchObject({ statusCode: 504 });
  });

  it('should throw TooManyRequestsError on OpenRouter 429', async () => {
    const apiError = new OpenAIMock.APIError(429, 'Rate limited');
    apiError.status = 429;
    mockCreate.mockRejectedValueOnce(apiError);
    await expect(service.chat('Hello')).rejects.toThrow(TooManyRequestsError);
  });

  it('should throw HttpError 502 on OpenRouter generic errors', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Connection refused'));
    await expect(service.chat('Hello')).rejects.toMatchObject({
      statusCode: 502,
      message: expect.stringContaining('temporarily unavailable'),
    });
  });
});
