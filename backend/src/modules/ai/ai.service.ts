import OpenAI from 'openai';
import { config } from '@config/index';
import { createLogger } from '@shared/services/logger';
import { HttpError, TooManyRequestsError } from '@shared/errors';

const logger = createLogger('ai');

const SYSTEM_PROMPT = `You are PatchIQ Assistant, an AI helper embedded in the PatchIQ patch and vulnerability management platform.

PatchIQ helps IT teams:
- Manage and deploy software patches across their infrastructure
- Track vulnerabilities (CVEs) and correlate them with installed software
- Discover and inventory network assets (servers, workstations, network devices)
- Monitor agent-managed endpoints for compliance and security posture
- Generate reports on patch compliance, vulnerability exposure, and deployment status

Key concepts:
- **Patches**: Software updates that fix bugs or vulnerabilities. Managed through a lifecycle: upload → test → approve → deploy.
- **Deployments**: The process of pushing patches or software to target assets. Supports software, patch, and config deployment types.
- **Assets**: Managed devices (servers, workstations, etc.) with installed agents that report inventory.
- **Vulnerabilities (CVEs)**: Known security flaws tracked from NVD, CISA KEV, and other sources.
- **Jobs**: Background tasks like CVE sync, patch scanning, and scheduled deployments.
- **Discovery**: Network scanning to find unmanaged devices.

When answering:
- Be concise and actionable. Users are IT professionals.
- If asked about PatchIQ-specific workflows, explain the steps within the platform.
- If asked about general security/IT topics, provide accurate information.
- If you don't know something PatchIQ-specific, say so rather than guessing.
- Format responses with markdown bold (**text**) for emphasis where helpful.`;

interface ChatResult {
  message: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AiService {
  private client: OpenAI | null = null;

  private getClient(): OpenAI | null {
    if (!config.ai.apiKey) {
      return null;
    }
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: config.ai.apiKey,
        baseURL: config.ai.baseUrl,
        defaultHeaders: {
          'HTTP-Referer': process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000',
          'X-Title': 'PatchIQ',
        },
      });
    }
    return this.client;
  }

  async chat(
    message: string,
    conversationHistory: ConversationMessage[] = [],
    userId?: string
  ): Promise<ChatResult> {
    const client = this.getClient();

    if (!client) {
      return {
        message:
          'AI assistant is not configured. Please set the OPENROUTER_API_KEY environment variable.',
        model: 'fallback',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    const model = config.ai.model;
    const maxTokens = config.ai.maxTokens;

    // Cap history at last 20 messages
    const trimmedHistory = conversationHistory.slice(-20);

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...trimmedHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // 30s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await client.chat.completions.create(
        {
          model,
          max_tokens: maxTokens,
          messages,
        },
        { signal: controller.signal }
      );

      const choice = response.choices[0];
      const usage = response.usage;

      const result: ChatResult = {
        message: choice?.message?.content || '',
        model: response.model || model,
        usage: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          totalTokens: usage?.total_tokens ?? 0,
        },
      };

      // R7: Token usage logging
      logger.info(
        {
          userId,
          model: result.model,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
        },
        'AI chat completion'
      );

      return result;
    } catch (error: unknown) {
      const apiErr = error as { status?: number };
      if (apiErr.status === 429) {
        logger.error({ err: error, model }, 'OpenRouter rate limit hit');
        throw new TooManyRequestsError('AI service is temporarily busy. Please try again in a moment.');
      }

      if (error instanceof Error && error.name === 'AbortError') {
        logger.error({ model }, 'OpenRouter request timed out after 30s');
        throw new HttpError(504, 'GatewayTimeout', 'AI service timed out. Please try again.');
      }

      logger.error({ err: error, model }, 'OpenRouter API error');
      throw new HttpError(502, 'BadGateway', 'AI service is temporarily unavailable.');
    } finally {
      clearTimeout(timeout);
    }
  }

  // R8: Health check
  async healthCheck(): Promise<{ configured: boolean; model: string; status: 'ok' | 'unreachable' | 'not_configured' }> {
    if (!config.ai.apiKey) {
      return { configured: false, model: config.ai.model, status: 'not_configured' };
    }

    const client = this.getClient();
    if (!client) {
      return { configured: false, model: config.ai.model, status: 'not_configured' };
    }

    try {
      // Quick probe — list models to verify connectivity
      await client.models.list();
      return { configured: true, model: config.ai.model, status: 'ok' };
    } catch {
      logger.warn('OpenRouter health check failed — service unreachable');
      return { configured: true, model: config.ai.model, status: 'unreachable' };
    }
  }
}

export const aiService = new AiService();
