import { api } from './api.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Send a message to the AI chat endpoint
 */
const sendChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const response = await api.post<ChatResponse>('/ai/chat', request);
  return response.data;
};

export const aiService = {
  sendChatMessage,
};

export default aiService;
