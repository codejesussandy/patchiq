# PRD: B.6 — AI Chat Panel Real Integration

> **Sprint 1 Track B** | **Priority:** Should Have (Week 3) | **Owner:** Dev 2
> **Status:** PENDING
> **Sprint 2 Prerequisite:** AI/MCP agent access theme requires working chat UI
> **Dependencies:** **BLOCKED BY A.16** (Dev 1 must ship AI backend endpoint first)

---

## 1. Problem Statement

The AI chat panel (`components/chat/AIChatPanel.tsx`, 220 lines) is a fully-built UI with:
- Resizable sidebar
- Message rendering with markdown support
- Typing indicators
- Suggested prompts ("How do I deploy patches?", "Show me security overview")
- Auto-scrolling to latest messages

However, `sendMessage()` (lines 102-111) is a **`setTimeout` mock** that returns a hardcoded "coming soon" string after a random delay (800-1500ms). No backend connection exists.

**What's broken:**
- Users see a polished AI interface that does nothing useful
- Suggested prompts promise functionality that doesn't exist
- The chat panel is pure vaporware — looks professional but has zero AI capability
- Sprint 2's AI/MCP theme (tool use, function calling, RAG) cannot begin without a working chat foundation

**Who is affected:** Every user who opens the chat panel (accessible from main layout header).

**Cost of not solving:** The AI assistant — a key differentiator for PatchIQ — remains fake. Sprint 2 AI/MCP work is blocked. Users may lose trust if they discover the "AI" is just hardcoded responses.

---

## 2. Goals

| # | Goal | Measure |
|---|------|------------|
| G1 | Chat sends messages to real LLM backend | `POST /v1/ai/chat` called with user message, returns actual AI response |
| G2 | Conversations maintain context | Multi-turn conversations work — LLM receives prior messages and responds coherently |
| G3 | Errors are handled gracefully | 401, 429, 502/503, 504 errors show user-friendly messages, not stack traces |
| G4 | UI remains responsive | Typing indicator shows while waiting for response, chat doesn't freeze |
| G5 | No regressions in existing UI | Sidebar, suggested prompts, markdown rendering, auto-scroll all continue working |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Streaming responses (SSE/WebSocket) | Sprint 1 uses request-response pattern. Streaming is Sprint 2 enhancement for better UX. |
| N2 | Conversation persistence in database | Messages live in frontend state only. DB persistence is Sprint 2. |
| N3 | Tool use / function calling (MCP) | Sprint 2 AI/MCP theme. V1 is conversational Q&A only. |
| N4 | RAG over PatchIQ data | Requires vector embeddings, not in scope. Sprint 2 feature. |
| N5 | Model selection UI | Hardcoded to default model. Admin model config is Sprint 2. |
| N6 | Token usage display | Nice-to-have, but not required. Can add if time permits. |

---

## 4. User Stories

- As a **platform admin**, I want to ask the AI assistant questions about patch management best practices so that I can make informed deployment decisions without leaving PatchIQ.
- As a **security analyst**, I want to ask the assistant about vulnerability context (e.g., "What is Log4Shell?") so that I can quickly understand threats while triaging.
- As a **new user**, I want to click suggested prompts and get helpful answers so that I can learn what PatchIQ does without reading documentation.
- As a **power user**, I want to have multi-turn conversations with the AI so that I can ask follow-up questions and refine my queries.
- As a **user**, I want to see clear error messages when the AI is unavailable so that I know what's wrong and can retry later.

---

## 5. Requirements

### Must-Have (P0)

#### R1: Create AI service layer

**File:** `frontend/src/services/ai.service.ts` (new)

**Service methods:**

```typescript
import api from './api.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

interface ChatResponse {
  message: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class AiService {
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await api.post('/ai/chat', request);
    return response.data;
  }
}

export default new AiService();
```

**Acceptance Criteria:**
- [x] New file created: `frontend/src/services/ai.service.ts`
- [x] TypeScript interfaces match backend contract (A.16 PRD)
- [x] Service uses existing `api.service.ts` (auto-handles auth, envelope unwrapping)
- [x] `npm run check-types` passes

#### R2: Replace mock sendMessage with real API call

**File:** `frontend/src/components/chat/AIChatPanel.tsx` (lines 102-111)

**Current (mock):**
```typescript
const sendMessage = async () => {
  if (!input.trim()) return;

  const userMsg: Message = {
    id: `user-${Date.now()}`,
    text: input,
    sender: 'user',
  };
  setMessages((prev) => [...prev, userMsg]);
  setInput('');
  setIsTyping(true);

  setTimeout(() => {
    const response = 'AI assistant is coming soon...';
    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      text: response,
      sender: 'bot',
    };
    setMessages((prev) => [...prev, botMsg]);
    setIsTyping(false);
  }, 800 + Math.random() * 700);
};
```

**New (real):**
```typescript
import aiService from '@/services/ai.service';

const sendMessage = async () => {
  if (!input.trim()) return;

  const userMsg: Message = {
    id: `user-${Date.now()}`,
    text: input,
    sender: 'user',
  };
  setMessages((prev) => [...prev, userMsg]);
  setInput('');
  setIsTyping(true);

  try {
    // Convert internal message format to API format
    const conversationHistory = messages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.text,
    }));

    // Call real API
    const response = await aiService.sendChatMessage({
      message: userMsg.text,
      conversationHistory: conversationHistory.slice(-20), // Last 20 messages
    });

    // Add assistant response
    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      text: response.message,
      sender: 'bot',
    };
    setMessages((prev) => [...prev, botMsg]);
  } catch (error: any) {
    // Error handling (see R3)
    const errorMsg = getErrorMessage(error);
    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      text: errorMsg,
      sender: 'bot',
    };
    setMessages((prev) => [...prev, botMsg]);
  } finally {
    setIsTyping(false);
  }
};
```

**Acceptance Criteria:**
- [x] `setTimeout` mock removed
- [x] API call to `/ai/chat` on every message send
- [x] Conversation history passed with last 20 messages
- [x] Bot response displays AI's actual reply
- [x] Typing indicator shows during API call, hides after response

#### R3: Add comprehensive error handling

**Error scenarios to handle:**

| HTTP Status | Scenario | User-Friendly Message |
|-------------|----------|----------------------|
| 401 | Unauthorized (token expired) | "Your session has expired. Please refresh the page and log in again." |
| 429 | Rate limit exceeded | "You're sending messages too quickly. Please wait a moment and try again." |
| 502/503 | AI service unavailable | "The AI service is temporarily unavailable. Please try again in a few moments." |
| 504 | Request timeout | "The AI is taking too long to respond. Please try again." |
| 500 | Backend error | "An error occurred. Please try again later." |
| Network error | No internet / backend down | "Unable to connect. Please check your internet connection." |

**Implementation:**

```typescript
function getErrorMessage(error: any): string {
  if (error.response) {
    const status = error.response.status;
    switch (status) {
      case 401:
        return "Your session has expired. Please refresh the page and log in again.";
      case 429:
        return "You're sending messages too quickly. Please wait a moment and try again.";
      case 502:
      case 503:
        return "The AI service is temporarily unavailable. Please try again in a few moments.";
      case 504:
        return "The AI is taking too long to respond. Please try again.";
      default:
        return "An error occurred. Please try again later.";
    }
  }
  return "Unable to connect. Please check your internet connection.";
}
```

**Acceptance Criteria:**
- [x] All error scenarios return user-friendly messages (not technical stack traces)
- [x] Error messages display as bot messages in the chat (not toast notifications)
- [x] Typing indicator stops after error
- [x] User can retry sending messages after errors

#### R4: Test with real OpenRouter backend

**Prerequisites:**
- Dev 1 has shipped A.16 and merged to `main`
- Backend `.env` has `OPENROUTER_API_KEY` configured
- AI chat endpoint is live at `POST /v1/ai/chat`

**Acceptance Criteria:**
- [x] Send "What is PatchIQ?" → Get relevant response about patch management platform
- [x] Send follow-up "How do I deploy a patch?" → Response references prior context
- [x] Test suggested prompts ("Show me security overview") → AI responds appropriately
- [x] Test error cases (remove API key) → Graceful fallback message
- [x] No console errors, no UI freezing

---

### Nice-to-Have (P1)

#### R5: Display token usage (optional)

Add small footer text under bot messages:

```typescript
<div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
  Model: {response.model} | Tokens: {response.usage.totalTokens}
</div>
```

**Acceptance Criteria:**
- [ ] Model name and token count displayed under each bot message
- [ ] Helps users understand AI usage (useful for admins monitoring costs)

#### R6: Add retry button for failed messages

**Acceptance Criteria:**
- [ ] Error messages include a "Retry" button
- [ ] Clicking retry re-sends the last user message

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| API integration success | 100% | Mock replaced, real API called on every message |
| Multi-turn conversations | Works | Follow-up questions reference prior context |
| Error handling coverage | 100% | All 6 error scenarios handled gracefully |
| Response latency | <10s p95 | AI responses arrive within 10 seconds (95% of requests) |
| UI responsiveness | No freezing | Chat remains interactive during API calls |

---

## 7. Test Plan

### Manual Smoke Tests

```
Test: Send first message to AI
  Given: User is logged in, chat panel is open
  When: User types "What is PatchIQ?" and clicks Send
  Then: User message appears in chat
  And: Typing indicator ("PatchIQ Assistant is typing...") displays
  And: API call to POST /v1/ai/chat succeeds
  And: AI response appears in chat (not "coming soon" mock)
  And: Typing indicator disappears

Test: Multi-turn conversation
  Given: User has sent one message ("What is PatchIQ?")
  When: User sends follow-up ("How do I deploy a patch?")
  Then: API call includes conversationHistory with both messages
  And: AI response references prior context
  And: Conversation flows naturally

Test: Suggested prompts
  Given: Chat panel is open with empty message history
  When: User clicks suggested prompt "Show me security overview"
  Then: Prompt appears as user message
  And: AI responds with security-related information

Test: Error handling — Rate limit (429)
  Given: User sends 21 messages within 1 minute
  When: 21st message is sent
  Then: API returns 429
  And: Error message displays in chat: "You're sending messages too quickly..."
  And: User can send messages again after waiting

Test: Error handling — Session expired (401)
  Given: User's auth token has expired
  When: User sends a message
  Then: API returns 401
  And: Error message displays: "Your session has expired..."
  And: User is prompted to refresh page

Test: Error handling — AI service down (502/503)
  Given: Backend OpenRouter API key is invalid or service is down
  When: User sends a message
  Then: Backend returns 502/503
  And: Error message displays: "The AI service is temporarily unavailable..."

Test: Long message handling
  Given: User types a very long message (>1000 characters)
  When: User sends message
  Then: API accepts it (backend validates <4000 chars)
  And: AI responds appropriately (may summarize if response is long)
```

### Integration Tests (Optional, P2)

```typescript
// frontend/tests/integration/ai-chat.test.ts

describe('AI Chat Integration', () => {
  it('sends message to backend and displays response', async () => {
    const mockResponse = {
      message: 'PatchIQ is a patch management platform...',
      model: 'anthropic/claude-sonnet-4-20250514',
      usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
    };

    jest.spyOn(aiService, 'sendChatMessage').mockResolvedValue(mockResponse);

    render(<AIChatPanel />);
    const input = screen.getByPlaceholderText('Ask PatchIQ Assistant...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'What is PatchIQ?' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('PatchIQ is a patch management platform...')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    jest.spyOn(aiService, 'sendChatMessage').mockRejectedValue({
      response: { status: 429 },
    });

    render(<AIChatPanel />);
    const input = screen.getByPlaceholderText('Ask PatchIQ Assistant...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/sending messages too quickly/i)).toBeInTheDocument();
    });
  });
});
```

---

## 8. Implementation Notes

### File Changes

| File | Action | Lines Changed |
|------|--------|---------------|
| `services/ai.service.ts` | Create | ~40 lines (new) |
| `components/chat/AIChatPanel.tsx` | Modify | ~50 lines (replace sendMessage + add error handling) |

**Total:** ~90 lines

### Message Format Conversion

**Internal format (frontend):**
```typescript
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}
```

**API format (backend):**
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

**Conversion:**
```typescript
const conversationHistory = messages.map((msg) => ({
  role: msg.sender === 'user' ? 'user' : 'assistant',
  content: msg.text,
}));
```

### Conversation History Limit

Backend accepts up to 20 messages in `conversationHistory` (per A.16 PRD). Frontend should slice:

```typescript
conversationHistory: conversationHistory.slice(-20)
```

This prevents token overflow while maintaining enough context for multi-turn conversations.

### Estimated Effort

2-3 hours
- 30 minutes: Create `ai.service.ts` with TypeScript interfaces
- 1 hour: Update `sendMessage()` with API call, format conversion, error handling
- 30 minutes: Manual testing (5-6 test scenarios)
- 30 minutes: Edge case handling, polish

---

## 9. Open Questions

**Q1:** What if the AI response is very long (>1000 words)?
- **Answer:** Backend enforces `OPENROUTER_MAX_TOKENS=1024` completion limit (per A.16). Responses will be reasonably short. If longer responses are needed, increase backend config in Sprint 2.

**Q2:** Should we show typing indicator for entire duration or fake a "typing" animation?
- **Answer:** Show real typing indicator (`isTyping=true`) for entire API call. Don't fake typing speed — users prefer seeing real progress.

**Q3:** Should we add a "Clear Conversation" button?
- **Answer:** Nice-to-have. Add if time permits, but not required for Sprint 1.

**Q4:** What about markdown rendering for AI responses (bold, lists, code blocks)?
- **Answer:** Existing chat panel likely already supports markdown (common in AI UIs). Verify during testing. If not, use a markdown renderer like `react-markdown`.

---

## 10. Dependencies

**Blocks:**
- Sprint 2 AI/MCP theme (tool use, function calling, RAG)

**Blocked by:**
- **A.16** (AI Chat Backend Endpoint) — Dev 1 must ship this first
  - Status: Check ROADMAP.md — if A.16 is `COMPLETED`, B.6 can start immediately

---

## 11. Definition of Done

- [x] Dev 1 has merged A.16 to `main` (backend endpoint exists)
- [x] Dev 2 has rebased `sprint-1/track-b` onto `main`
- [x] `ai.service.ts` created with `sendChatMessage()` method
- [x] `AIChatPanel.tsx` updated to call real API (mock removed)
- [x] Error handling for 401, 429, 502/503, 504, network errors
- [x] Manual smoke tests pass (6 scenarios)
- [x] Multi-turn conversations work (context maintained)
- [x] `npm run check-types` passes
- [x] `npm run lint` passes
- [x] Git commit: "feat(ai): integrate AI chat panel with OpenRouter backend (A.16)"
- [x] PR merged to `sprint-1/track-b` branch
