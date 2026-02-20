import { http, HttpResponse } from 'msw';

const mockChatResponse = {
  message: 'I can help you with patch management, vulnerability scanning, and more. What would you like to know?',
  model: 'gpt-4',
  usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
};

export const aiHandlers = [
  // POST /ai/chat
  http.post('*/ai/chat', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockChatResponse, userMessage: body.message || '' } });
  }),
];

export { mockChatResponse };
