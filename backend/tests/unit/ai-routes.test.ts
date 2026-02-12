import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

// Mock the AI service
jest.mock('@modules/ai/ai.service', () => ({
  __esModule: true,
  aiService: {
    chat: jest.fn(),
    healthCheck: jest.fn(),
  },
  AiService: jest.fn(),
}));

// Mock logger
jest.mock('@shared/services/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock config (used by error handler and various modules)
jest.mock('@config/index', () => ({
  config: {
    ai: {
      apiKey: 'test-api-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'anthropic/claude-sonnet-4-20250514',
      maxTokens: 1024,
    },
    isTest: true,
    isProduction: false,
  },
}));

import { aiService } from '@modules/ai/ai.service';
import { validateBody } from '@middleware/validation';
import { chatRequestSchema } from '@modules/ai/ai.validators';
import { sendSuccess } from '@shared/utils/response';

const mockChat = aiService.chat as jest.Mock;

let app: express.Application;

beforeAll(() => {
  app = express();
  app.use(express.json());

  // Build a minimal route that mirrors ai.routes.ts but skips auth + rate limiting.
  // This lets us test validation and controller logic independently.
  app.post(
    '/v1/ai/chat',
    validateBody(chatRequestSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { message, conversationHistory } = req.body;
        const result = await aiService.chat(message, conversationHistory, 'test-user-id');
        sendSuccess(res, result);
      } catch (error) {
        next(error);
      }
    }
  );

  // Error handler matching the project's errorHandler behavior
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Handle Zod validation errors (ZodError has .issues)
    if (err.issues) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        },
      });
      return;
    }
    // Handle HttpError
    if (err.statusCode) {
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.error, message: err.message },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'InternalServerError', message: err.message },
    });
  });
});

describe('AI Routes — POST /v1/ai/chat', () => {
  beforeEach(() => {
    mockChat.mockReset();
  });

  it('should return 400 for empty body', async () => {
    const res = await request(app).post('/v1/ai/chat').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for message exceeding 4000 characters', async () => {
    const longMessage = 'x'.repeat(4001);
    const res = await request(app).post('/v1/ai/chat').send({ message: longMessage });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for whitespace-only message', async () => {
    const res = await request(app).post('/v1/ai/chat').send({ message: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 200 with LLM response', async () => {
    mockChat.mockResolvedValueOnce({
      message: 'PatchIQ manages patches across your infrastructure.',
      model: 'anthropic/claude-sonnet-4-20250514',
      usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
    });

    const res = await request(app)
      .post('/v1/ai/chat')
      .send({ message: 'What is PatchIQ?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('PatchIQ manages patches across your infrastructure.');
    expect(res.body.data.model).toBe('anthropic/claude-sonnet-4-20250514');
  });

  it('should return standard envelope shape', async () => {
    mockChat.mockResolvedValueOnce({
      message: 'Test response',
      model: 'test-model',
      usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
    });

    const res = await request(app)
      .post('/v1/ai/chat')
      .send({ message: 'Hello' });

    expect(res.status).toBe(200);
    // Verify envelope shape
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('message');
    expect(res.body.data).toHaveProperty('model');
    expect(res.body.data).toHaveProperty('usage');
    expect(res.body.data.usage).toEqual({
      promptTokens: 5,
      completionTokens: 3,
      totalTokens: 8,
    });
  });

  it('should handle missing API key gracefully with 200 fallback', async () => {
    mockChat.mockResolvedValueOnce({
      message: 'AI assistant is not configured. Please set the OPENROUTER_API_KEY environment variable.',
      model: 'fallback',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });

    const res = await request(app)
      .post('/v1/ai/chat')
      .send({ message: 'Hello' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.model).toBe('fallback');
    expect(res.body.data.message).toContain('not configured');
  });
});
