# Implementation Plan: B.6 — AI Chat Panel Real Integration

> **Sprint:** 1 | **Track:** B (Frontend) | **Owner:** Dev 2
> **Priority:** P1 (Should Have) | **Effort:** 2-3 hours
> **Status:** 🔄 IN PLANNING
> **Date:** 2026-02-13

---

## 1. Executive Summary

**Problem:** The AI chat panel UI is fully built but `sendMessage()` returns a hardcoded "coming soon" message after a mock delay. Dev 1 just shipped A.16 (AI backend with OpenRouter integration), so we can now connect the frontend to a real LLM.

**Goal:** Replace the mock `setTimeout` implementation with real API calls to `/v1/ai/chat`, enabling users to have actual conversations with an AI assistant about PatchIQ.

**Success Criteria:**
- Mock timeout replaced with real API call
- Conversation history maintained across messages
- Error handling for API failures
- Token usage displayed (optional)
- No regressions in existing UI/UX

---

## 2. Discovery Phase

### 2.1 Backend API Contract (A.16)

**Endpoint:** `POST /v1/ai/chat`

**Request:**
```typescript
{
  message: string;              // User's message (1-4000 chars)
  conversationHistory?: Array<{  // Optional, last 20 messages
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    message: string;           // AI's response
    model: string;             // e.g., "anthropic/claude-sonnet-4-20250514"
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }
  }
}
```

**Authentication:** Bearer token required (existing axios interceptor handles this)

**Rate Limiting:** 20 requests/min per user

### 2.2 Current Frontend State

**File:** `frontend/src/components/chat/AIChatPanel.tsx`

**Lines 102-111 (Current Mock):**
```typescript
setTimeout(() => {
  const response = 'AI assistant is coming soon. This feature will be powered by a real AI backend to help you manage patches, vulnerabilities, and deployments.';
  const botMsg: Message = {
    id: `bot-${Date.now()}`,
    text: response,
    sender: 'bot',
  };
  setMessages((prev) => [...prev, botMsg]);
  setIsTyping(false);
}, 800 + Math.random() * 700);
```

**Message Interface (lines ~15-19):**
```typescript
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}
```

**State Variables:**
- `messages: Message[]` - All messages in conversation
- `input: string` - Current input text
- `isTyping: boolean` - Typing indicator state

### 2.3 Required Changes

1. **Create AI Service** - New file `frontend/src/services/ai.service.ts`
2. **Update sendMessage()** - Replace setTimeout with API call
3. **Convert Message Format** - Map internal format to API format
4. **Error Handling** - Show user-friendly errors
5. **Optional: Token Usage** - Display in UI (nice-to-have)

---

## 3. Technical Analysis

### 3.1 Message Format Mapping

**Frontend Format:**
```typescript
{ id: string, text: string, sender: 'user' | 'bot' }
```

**Backend Format:**
```typescript
{ role: 'user' | 'assistant', content: string }
```

**Conversion Logic:**
```typescript
// Frontend → Backend
const conversationHistory = messages.map(msg => ({
  role: msg.sender === 'user' ? 'user' : 'assistant',
  content: msg.text
}));

// Backend → Frontend
const botMsg: Message = {
  id: `bot-${Date.now()}`,
  text: response.data.message,
  sender: 'bot'
};
```

### 3.2 Conversation History Management

**Backend Requirement:** Last 20 messages to prevent token overflow

**Implementation:**
```typescript
const conversationHistory = messages
  .slice(-20)  // Last 20 messages
  .map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));
```

### 3.3 Error Handling Strategy

**Potential Errors:**
1. Network failure (500, timeout)
2. Rate limit exceeded (429)
3. Auth failure (401)
4. OpenRouter API down (503)
5. Empty/invalid message (400)

**User-Friendly Messages:**
```typescript
const errorMessages = {
  429: 'You\'re sending messages too quickly. Please wait a moment.',
  401: 'Session expired. Please refresh the page.',
  503: 'AI service is temporarily unavailable. Please try again later.',
  default: 'Something went wrong. Please try again.'
};
```

---

## 4. Implementation Strategy

### 4.1 Phase 1: Create AI Service (Agent Task)

**Agent:** Implementation agent
**Duration:** 15-30 minutes

**File:** `frontend/src/services/ai.service.ts` (NEW)

```typescript
import api from './api.service';

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
async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await api.post('/ai/chat', request);
  return response.data;
}

export default {
  sendChatMessage,
};
```

**Notes:**
- Follow existing service patterns (axios instance, response.data)
- Use TypeScript interfaces for type safety
- No double-unwrap (interceptor handles envelope)

### 4.2 Phase 2: Update AIChatPanel Component (Agent Task)

**Agent:** Implementation agent
**Duration:** 30-45 minutes

**File:** `frontend/src/components/chat/AIChatPanel.tsx`

**Changes to make:**

1. **Add import:**
```typescript
import aiService from '@/services/ai.service';
import { message as antMessage } from 'antd';
```

2. **Add error state (optional):**
```typescript
const [error, setError] = useState<string | null>(null);
```

3. **Replace sendMessage function (lines 88-112):**
```typescript
const sendMessage = async (text: string) => {
  if (!text.trim()) return;

  const userMsg: Message = {
    id: `user-${Date.now()}`,
    text,
    sender: 'user',
  };

  setMessages((prev) => [...prev, userMsg]);
  setInput('');
  setIsTyping(true);
  setError(null);

  try {
    // Convert messages to API format
    const conversationHistory = messages
      .slice(-20)  // Last 20 messages
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : ('assistant' as const),
        content: msg.text
      }));

    // Call AI service
    const response = await aiService.sendChatMessage({
      message: text,
      conversationHistory
    });

    // Add bot response
    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      text: response.message,
      sender: 'bot',
    };
    setMessages((prev) => [...prev, botMsg]);

    // Optional: Log token usage to console for debugging
    console.log('AI Response - Tokens:', response.usage);

  } catch (err: any) {
    console.error('AI chat error:', err);

    // User-friendly error message
    let errorMessage = 'Something went wrong. Please try again.';
    if (err.response?.status === 429) {
      errorMessage = 'You\'re sending messages too quickly. Please wait a moment.';
    } else if (err.response?.status === 401) {
      errorMessage = 'Session expired. Please refresh the page.';
    } else if (err.response?.status === 503) {
      errorMessage = 'AI service is temporarily unavailable. Please try again later.';
    }

    // Show error as bot message (or use antMessage.error)
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
```

4. **Optional: Add token usage display (nice-to-have):**

Add state:
```typescript
const [lastTokenUsage, setLastTokenUsage] = useState<{
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} | null>(null);
```

Update after successful response:
```typescript
setLastTokenUsage(response.usage);
```

Add UI indicator (in chat footer):
```typescript
{lastTokenUsage && (
  <div style={{ fontSize: '11px', color: '#999', marginTop: 4 }}>
    Tokens: {lastTokenUsage.totalTokens} ({lastTokenUsage.promptTokens}+{lastTokenUsage.completionTokens})
  </div>
)}
```

### 4.3 Phase 3: Testing (Agent Task)

**Agent:** QA agent
**Duration:** 30 minutes

**Test Cases:**

1. **Basic Conversation:**
   - Send message "What is PatchIQ?"
   - Verify AI responds with relevant answer
   - Verify typing indicator appears/disappears

2. **Multi-Turn Conversation:**
   - Send "What is PatchIQ?"
   - Send follow-up "How do I deploy patches?"
   - Verify AI has context from previous message

3. **Error Handling:**
   - Test with network disconnected (simulate)
   - Verify user-friendly error message appears
   - Verify chat doesn't crash

4. **Edge Cases:**
   - Empty message (should not send)
   - Very long message (should work up to 4000 chars)
   - Rapid messages (should handle gracefully)

5. **UI/UX Regression:**
   - Suggested prompts still work
   - Message rendering (markdown, line breaks) works
   - Sidebar resizing works
   - Scroll to bottom on new message works

---

## 5. Implementation Steps

### Step 1: Verify Backend is Ready
**Duration:** 5 minutes

```bash
# Check A.16 AI module exists
ls -la backend/src/modules/ai/

# Verify routes mounted
grep "aiRoutes" backend/src/app.ts

# Check env example has OpenRouter config
grep "OPENROUTER" backend/.env.example
```

### Step 2: Create AI Service
**Duration:** 15-30 minutes
**Agent:** Implementation agent

- Create `frontend/src/services/ai.service.ts`
- Add TypeScript interfaces
- Implement `sendChatMessage()` method
- Follow existing service patterns

### Step 3: Update AIChatPanel
**Duration:** 30-45 minutes
**Agent:** Implementation agent

- Import ai.service
- Replace mock setTimeout with API call
- Convert message formats
- Add error handling
- Remove eslint-disable comments if no longer needed

### Step 4: QA Validation
**Duration:** 30 minutes
**Agent:** QA agent

- TypeScript compilation check
- ESLint validation
- Manual test plan execution (if dev server available)
- Verify no regressions

### Step 5: Commit & Update PRD
**Duration:** 10 minutes (Manual)

- Git commit with detailed message
- Update PRD-TRACK-B.md to mark B.6 complete
- Document what was changed

---

## 6. Acceptance Criteria

### Must-Have (P0)

- [ ] **AC1:** AI service exists
  - `frontend/src/services/ai.service.ts` created
  - Exports `sendChatMessage(request)` method
  - Proper TypeScript types

- [ ] **AC2:** Mock implementation removed
  - No more `setTimeout()` in sendMessage
  - Real API call to `/v1/ai/chat`
  - Conversation history included in request

- [ ] **AC3:** Basic conversation works
  - User can send messages
  - AI responds with relevant answers
  - Typing indicator shows during API call

- [ ] **AC4:** Error handling implemented
  - Network errors show user-friendly message
  - Rate limit errors are graceful
  - No console errors on failure

- [ ] **AC5:** No regressions
  - Suggested prompts work
  - Message rendering works (markdown, line breaks)
  - Sidebar resizing works
  - TypeScript compiles with 0 errors

### Nice-to-Have (P1)

- [ ] **AC6:** Token usage displayed
  - Show token count in chat footer
  - Format: "Tokens: 425 (245+180)"
  - Updates after each response

- [ ] **AC7:** Enhanced error messages
  - Specific messages for 429, 401, 503
  - Retry button for failed messages
  - Connection status indicator

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OpenRouter API key not configured | Medium | High | Add clear error message, check .env.example documentation |
| Rate limiting too strict | Low | Medium | Document limit (20/min), consider frontend queueing |
| Long response times | Medium | Low | Typing indicator already handles this, consider timeout |
| Conversation history too large | Low | Low | Backend caps at 20 messages, frontend slices accordingly |
| Message format mismatch | Low | High | Validate with TypeScript, test with backend team |

---

## 8. Rollback Plan

If issues found after merge:

1. **Immediate:** Revert commits with `git revert {commit-hash}`
2. **Partial:** Revert AIChatPanel changes but keep ai.service.ts
3. **Fallback:** Re-add setTimeout mock with better error message
4. **Fix:** Identify issue, update implementation, re-test

---

## 9. Success Metrics

**Quantitative:**
- API calls to `/v1/ai/chat`: >0
- Error rate: <10% of conversations
- Average response time: <5 seconds
- TypeScript errors introduced: 0

**Qualitative:**
- Users receive helpful, contextual answers
- Error messages are clear and actionable
- No perceived performance degradation
- Chat panel feels responsive

---

## 10. Dependencies

**Depends On:**
- ✅ A.16 (AI Chat Backend) — COMPLETE

**Blocks:**
- Sprint 2 AI/MCP features
- Sprint 2 Settings Overhaul (AI-assisted settings)

---

## 11. Team Coordination

**Dev 1 (Track A):** A.16 complete, no coordination needed

**Dev 2 (Track B):** Owner of this task

**Timeline:**
- Verify backend: 5 min
- Create service: 15-30 min
- Update component: 30-45 min
- QA: 30 min
- Commit: 10 min
- **Total: 1.5-2 hours**

---

## 12. Execution Plan with Teammates

### Agent 1: Discovery Agent (Quick Verification)
**Task:** Verify A.16 backend implementation is complete and accessible
**Duration:** 5-10 minutes
**Deliverable:** Confirmation of endpoint availability, API contract validation

### Agent 2: Implementation Agent (General-purpose)
**Task:**
1. Create `ai.service.ts` with proper types
2. Update `AIChatPanel.tsx` to use real API
3. Add error handling
**Duration:** 45-75 minutes
**Deliverable:** Working AI chat integration, ready for QA

### Agent 3: QA Agent (General-purpose)
**Task:** Validate implementation against acceptance criteria
**Duration:** 30 minutes
**Deliverable:** QA report with PASS/FAIL status

---

## 13. File Structure

**New Files:**
```
frontend/src/
  services/
    ai.service.ts  (NEW)  - AI chat API client
```

**Modified Files:**
```
frontend/src/
  components/chat/
    AIChatPanel.tsx  - Replace mock with real API, add error handling
```

**Documentation:**
```
docs/sprint-1/
  PLAN-B6-AI-CHAT-INTEGRATION.md           (NEW) - This file
  IMPLEMENTATION-B6-SUMMARY.md             (NEW) - Implementation summary
  QA-REPORT-B6.md                          (NEW) - QA validation report
```

---

## 14. Key Design Decisions

### Decision 1: Keep Frontend Message Format

**Chosen:** Convert between formats in `sendMessage()` function

**Why:**
- Minimal changes to existing component
- Internal format is simpler (`text` vs `content`)
- Conversion logic is straightforward
- No need to refactor message rendering

**Alternative (rejected):**
Refactor entire component to use backend format — unnecessary complexity.

### Decision 2: Error Messages as Bot Messages

**Chosen:** Display errors as bot messages with ⚠️ prefix

**Why:**
- Consistent with chat UX
- Errors are part of conversation flow
- No separate error UI needed
- Users understand context

**Alternative:**
Use Ant Design message.error() — would be jarring, separate from chat context.

### Decision 3: Console Log Token Usage

**Chosen:** Log to console, optional UI display (P1)

**Why:**
- Useful for debugging
- Doesn't clutter UI for P0
- Can add UI later if valuable
- Developers can monitor usage

---

## 15. API Integration Notes

### Request Example
```typescript
POST /v1/ai/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "How do I deploy patches?",
  "conversationHistory": [
    { "role": "user", "content": "What is PatchIQ?" },
    { "role": "assistant", "content": "PatchIQ is a patch management platform..." }
  ]
}
```

### Response Example
```typescript
{
  "success": true,
  "data": {
    "message": "To deploy patches in PatchIQ, you can use the Deployments page...",
    "model": "anthropic/claude-sonnet-4-20250514",
    "usage": {
      "promptTokens": 245,
      "completionTokens": 180,
      "totalTokens": 425
    }
  }
}
```

### Error Response Example
```typescript
{
  "success": false,
  "error": "Rate limit exceeded. Please try again in 1 minute."
}
```

---

## 16. Testing Checklist

**Before Committing:**
- [ ] TypeScript compiles: `cd frontend && npx tsc --noEmit`
- [ ] ESLint passes: `cd frontend && npm run lint`
- [ ] Import paths use `@/` aliases
- [ ] No console.log statements (except debug token usage)
- [ ] Error handling covers all status codes
- [ ] Conversation history slices last 20 messages

**Manual Testing (if dev server available):**
- [ ] Can send message and receive AI response
- [ ] Multi-turn conversation maintains context
- [ ] Error handling shows user-friendly messages
- [ ] Typing indicator works correctly
- [ ] Suggested prompts still functional
- [ ] No UI regressions (layout, styling, interactions)

---

## 17. Open Questions

**Q1:** Should we add a "Retry" button for failed messages?
- **Answer:** Defer to Sprint 2 (nice-to-have, adds complexity)
- **Priority:** LOW

**Q2:** Should we show model name in UI?
- **Answer:** No, users don't need to know backend details
- **Priority:** LOW

**Q3:** Should we persist conversation history to localStorage/database?
- **Answer:** No, Sprint 2 feature (PRD A.16 Non-Goal N4)
- **Priority:** SPRINT 2

**Q4:** What if OpenRouter API key is not configured?
- **Answer:** Backend returns clear error, frontend shows message
- **Priority:** HANDLED

---

## 18. Next Steps

1. ✅ Plan document created (this file)
2. ⏳ Spawn Discovery Agent → Verify A.16 backend is accessible
3. ⏳ Spawn Implementation Agent → Create service + update component
4. ⏳ Spawn QA Agent → Validate implementation
5. ⏳ Manual testing → Test conversation flow
6. ⏳ Commit & update PRD → Mark B.6 complete

---

**Plan Status:** ✅ READY FOR EXECUTION
**Estimated Completion:** 1.5-2 hours from start
**Confidence Level:** High (backend complete, clear API contract, straightforward integration)
