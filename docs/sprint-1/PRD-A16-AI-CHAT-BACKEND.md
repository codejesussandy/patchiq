# PRD: A.16 — AI Chat Backend Endpoint

> **Sprint 1 Track A** | **Priority:** Should Have (Week 3-4) | **Owner:** Dev 1
> **Status:** COMPLETED
> **Sprint 2 Prerequisite:** AI/MCP Agent Access theme requires a working chat backend.
> **Blocks:** B.6 (AI Chat Panel real integration)

---

## 1. Problem Statement

The frontend has a fully-built AI chat panel (`components/chat/AIChatPanel.tsx`, 220 lines) with a resizable sidebar, typing indicators, suggested prompts, and message rendering. But `sendMessage()` (line 102-111) is a `setTimeout` mock that returns a hardcoded "coming soon" string after a random delay. No backend endpoint exists.

**What's broken:**
- Users see a polished AI chat UI that does nothing useful
- The suggested prompts ("How do I deploy patches?", "Show me security overview") promise functionality that doesn't exist
- Sprint 2's AI/MCP theme cannot begin without a working backend to build on

**Who is affected:** Every user who opens the chat panel (accessible from the main layout header).

**Cost of not solving:** The AI assistant — a key differentiator — remains vaporware. Sprint 2 AI/MCP work is blocked.

---

## 2. Goals

| # | Goal | Measure |
|---|------|---------|
| G1 | Chat endpoint returns real LLM responses | `POST /v1/ai/chat` returns a non-hardcoded response from OpenRouter |
| G2 | Responses are contextual to PatchIQ domain | System prompt includes PatchIQ domain context (patches, assets, vulnerabilities) |
| G3 | Conversation history is maintained per session | Multi-turn conversations work — the LLM receives prior messages |
| G4 | Graceful degradation when LLM is unavailable | Missing API key or OpenRouter outage returns a helpful fallback message, not a 500 |
| G5 | Cost is bounded | Token limits and rate limiting prevent runaway API costs |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Streaming/SSE responses | Frontend currently uses a simple request-response pattern with typing indicator. Streaming is a Sprint 2 enhancement. |
| N2 | RAG or vector search over PatchIQ data | Requires embedding infrastructure not yet built. Sprint 2 scope. |
| N3 | Tool use / function calling (MCP) | Sprint 2 AI/MCP theme. V1 is conversational only. |
| N4 | Persistent conversation history in database | Messages live in frontend state only. DB persistence is Sprint 2. |
| N5 | Model selection UI | Hardcode a sensible default model. Admin model config is Sprint 2. |
| N6 | Self-hosted / local LLM support | OpenRouter provides access to many models; local inference adds complexity with no Sprint 1 benefit. |

---

## 4. User Stories

- As a **platform admin**, I want to ask the AI assistant questions about patch management best practices so that I can make informed deployment decisions without leaving PatchIQ.
- As a **security analyst**, I want to ask the assistant about vulnerability context (e.g., "What is Log4Shell?") so that I can quickly understand threats while triaging.
- As a **new user**, I want to click suggested prompts and get helpful answers so that I can learn what PatchIQ does without reading documentation.
- As a **platform admin**, I want the chat to still work (with a fallback message) if the AI service is down so that the panel doesn't crash or show cryptic errors.
- As a **self-hosted admin**, I want to configure my own OpenRouter API key so that the AI feature works in my deployment.

---

## 5. Requirements

### Must-Have (P0)

#### R1: New `ai` backend module

Create `backend/src/modules/ai/` with the standard module pattern:

**Files to create:**
- `ai.routes.ts` — Route definitions
- `ai.controller.ts` — Request handling
- `ai.service.ts` — OpenRouter integration + system prompt
- `ai.validators.ts` — Zod schemas for request/response
- `index.ts` — Module exports

**Files to modify:**
- `backend/src/app.ts` — Mount `aiRoutes` at `/v1/ai`
- `backend/.env.example` — Add OpenRouter config vars
- `backend/src/config/index.ts` — Add AI config section (if config is centralized)

**Acceptance Criteria:**
- [x] Module follows existing pattern (controller → service → validator)
- [x] Routes mounted at `/v1/ai` in `app.ts`
- [x] `make check-types` passes with no errors

#### R2: `POST /v1/ai/chat` endpoint

**Request body:**
```json
{
  "message": "How do I deploy a patch?",
  "conversationHistory": [
    { "role": "user", "content": "What is PatchIQ?" },
    { "role": "assistant", "content": "PatchIQ is a patch management platform..." }
  ]
}
```

**Response (standard envelope):**
```json
{
  "success": true,
  "data": {
    "message": "To deploy a patch in PatchIQ, you can...",
    "model": "anthropic/claude-sonnet-4-20250514",
    "usage": {
      "promptTokens": 245,
      "completionTokens": 180,
      "totalTokens": 425
    }
  }
}
```

**Acceptance Criteria:**
- [x] Endpoint requires authentication (uses `authenticate` middleware)
- [x] Request validated with Zod: `message` (string, 1-4000 chars), `conversationHistory` (optional array of `{role, content}`)
- [x] Returns standard `{ success, data }` envelope
- [x] Response includes the LLM's reply text, model used, and token usage
- [x] Empty or whitespace-only messages return 400 validation error
- [x] `conversationHistory` is capped at last 20 messages to prevent token overflow

#### R3: OpenRouter integration

Use the [OpenRouter API](https://openrouter.ai/docs) (OpenAI-compatible) to call LLMs.

**Configuration (env vars):**
```env
# AI / OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=anthropic/claude-sonnet-4-20250514
OPENROUTER_MAX_TOKENS=1024
```

**Implementation details:**
- Use the `openai` npm package pointed at OpenRouter's base URL (OpenRouter is OpenAI-compatible)
- Set `Authorization: Bearer ${OPENROUTER_API_KEY}` header
- Set `HTTP-Referer` and `X-Title` headers per OpenRouter docs
- Default model: `anthropic/claude-sonnet-4-20250514` (configurable via env)
- Max completion tokens: 1024 (configurable via env)

**Acceptance Criteria:**
- [x] Uses `openai` npm package with `baseURL` set to OpenRouter
- [x] API key read from `OPENROUTER_API_KEY` env var
- [x] Model configurable via `OPENROUTER_MODEL` env var
- [x] Max tokens configurable via `OPENROUTER_MAX_TOKENS` env var
- [x] `HTTP-Referer` header set to PatchIQ app URL
- [x] `X-Title` header set to `PatchIQ`

#### R4: PatchIQ system prompt

The system prompt grounds the LLM in PatchIQ domain context. It should be a static string (no dynamic data queries in V1).

**System prompt content:**
```
You are PatchIQ Assistant, an AI helper embedded in the PatchIQ patch and vulnerability management platform.

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
- Format responses with markdown bold (**text**) for emphasis where helpful.
```

**Acceptance Criteria:**
- [x] System prompt is included as the first message in every OpenRouter request
- [x] System prompt describes PatchIQ's domain, key concepts, and response guidelines
- [x] System prompt is defined as a constant (easy to update without code changes)

#### R5: Graceful error handling

**Acceptance Criteria:**
- [x] If `OPENROUTER_API_KEY` is not set: endpoint returns `{ success: true, data: { message: "AI assistant is not configured. Please set the OPENROUTER_API_KEY environment variable.", model: "fallback" } }` (200, not 500)
- [x] If OpenRouter returns a rate limit error (429): return `{ success: false, error: "AI service is temporarily busy. Please try again in a moment." }` with status 429
- [x] If OpenRouter returns any other error: return `{ success: false, error: "AI service is temporarily unavailable." }` with status 502
- [x] If OpenRouter times out (>30s): abort the request and return 504
- [x] All errors are logged with the Pino logger (include error details, do NOT log the API key)
- [x] The API key is never included in error responses or logs

#### R6: Rate limiting

**Acceptance Criteria:**
- [x] AI chat endpoint has its own rate limit: 20 requests per user per minute
- [x] Rate limit is applied per authenticated user (not global)
- [x] Rate limit exceeded returns 429 with a clear message

### Nice-to-Have (P1)

#### R7: Token usage logging

- [x] Each chat request logs: userId, model, promptTokens, completionTokens, timestamp
- [x] Logged via Pino structured logger (not console.log)
- [x] Enables future cost tracking and abuse detection

#### R8: Admin health check

- [x] `GET /v1/ai/health` returns whether OpenRouter is configured and reachable
- [x] Returns `{ configured: boolean, model: string, status: "ok" | "unreachable" | "not_configured" }`
- [x] Requires admin role

### Future Considerations (P2)

#### R9: Streaming responses (Sprint 2)
Design the service layer so that switching from `chat.completions.create()` to `chat.completions.create({ stream: true })` is a minimal change. Keep the OpenRouter client as a separate instance, not inline.

#### R10: Tool use / function calling (Sprint 2 MCP)
The service should accept a `tools` parameter that can be passed through to OpenRouter. Don't implement it, but don't design it out.

#### R11: Conversation persistence (Sprint 2)
Frontend currently manages conversation state. Sprint 2 may add a `ChatConversation` Prisma model. Keep the endpoint stateless (accepts history as input) so this is additive.

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Endpoint responds | 100% of requests get a non-500 response | Error rate in logs |
| Response latency | p95 < 10s | Pino request logger duration |
| Frontend integration unblocked | B.6 can start | B.6 status moves to IN_PROGRESS |

---

## 7. Test Plan

### Unit Tests (`backend/tests/unit/ai-service.test.ts`)

```
Test: AI service constructs correct OpenRouter request
  Given: A message "How do I deploy a patch?" with empty history
  When: The service builds the OpenRouter API call
  Then: Messages array contains system prompt + user message
  And: Model matches OPENROUTER_MODEL env var
  And: max_tokens matches OPENROUTER_MAX_TOKENS env var

Test: AI service includes conversation history
  Given: A message with 3 prior history messages
  When: The service builds the request
  Then: Messages array is [system, ...history, userMessage]
  And: History is in correct chronological order

Test: AI service caps conversation history at 20 messages
  Given: conversationHistory with 30 messages
  When: The service builds the request
  Then: Only the last 20 history messages are included (plus system + current)

Test: AI service returns fallback when API key is missing
  Given: OPENROUTER_API_KEY is empty/undefined
  When: chat() is called
  Then: Returns fallback message without calling OpenRouter
  And: Does not throw an error

Test: AI service handles OpenRouter timeout
  Given: OpenRouter takes >30s to respond
  When: chat() is called
  Then: Request is aborted
  And: Returns a timeout error message

Test: AI service handles OpenRouter error responses
  Given: OpenRouter returns 429 (rate limit)
  When: chat() is called
  Then: Throws/returns an error with appropriate status code
  And: Error message does not contain the API key

Test: AI service handles OpenRouter 500 errors
  Given: OpenRouter returns 500
  When: chat() is called
  Then: Returns 502 (bad gateway) to the client
```

### Integration Tests (`backend/tests/unit/ai-routes.test.ts`)

```
Test: POST /v1/ai/chat requires authentication
  Given: No auth token
  When: POST /v1/ai/chat with a message body
  Then: Returns 401

Test: POST /v1/ai/chat validates request body
  Given: Authenticated user
  When: POST /v1/ai/chat with empty body
  Then: Returns 400 with validation error

  When: POST /v1/ai/chat with message exceeding 4000 chars
  Then: Returns 400 with validation error

  When: POST /v1/ai/chat with message: ""
  Then: Returns 400 with validation error

Test: POST /v1/ai/chat returns LLM response
  Given: Authenticated user, OpenRouter mocked to return "test response"
  When: POST /v1/ai/chat with message: "Hello"
  Then: Returns 200 with { success: true, data: { message: "test response", model: "...", usage: {...} } }

Test: POST /v1/ai/chat returns standard envelope
  Given: Authenticated user, valid request
  When: POST /v1/ai/chat
  Then: Response matches { success: boolean, data?: { message: string, model: string, usage: object }, error?: string }

Test: POST /v1/ai/chat handles missing API key gracefully
  Given: OPENROUTER_API_KEY is not set
  When: POST /v1/ai/chat with a valid message
  Then: Returns 200 with fallback message (not 500)

Test: Rate limit enforced
  Given: Authenticated user
  When: Sending 21 requests within 1 minute
  Then: 21st request returns 429
```

### Manual Smoke Tests

- [ ] Send "What is PatchIQ?" → get a relevant domain-aware response
- [ ] Send "How do I deploy a patch?" → get step-by-step PatchIQ workflow
- [ ] Send a follow-up question → response references prior context
- [ ] Remove `OPENROUTER_API_KEY` from env → get graceful fallback message
- [ ] Set invalid API key → get "unavailable" message (not stack trace)
- [ ] `make check-all` passes

---

## 8. Implementation Notes

### Dependency

Install `openai` npm package (works with OpenRouter's OpenAI-compatible API):
```bash
cd backend && npm install openai
```

### OpenRouter Client Setup (reference)

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000',
    'X-Title': 'PatchIQ',
  },
});
```

### File Footprint

| Action | File | Est. Lines |
|--------|------|-----------|
| Create | `modules/ai/ai.routes.ts` | ~30 |
| Create | `modules/ai/ai.controller.ts` | ~80 |
| Create | `modules/ai/ai.service.ts` | ~150 |
| Create | `modules/ai/ai.validators.ts` | ~40 |
| Create | `modules/ai/index.ts` | ~5 |
| Modify | `app.ts` | +3 (import + mount) |
| Modify | `.env.example` | +6 |
| Create | `tests/unit/ai-service.test.ts` | ~150 |
| Create | `tests/unit/ai-routes.test.ts` | ~120 |
| **Total** | | **~585 lines** |

### Estimated Effort
8-12 hours (new module, OpenRouter integration, comprehensive error handling, tests)

---

## 9. Open Questions

None — scope is clear. OpenRouter API is well-documented and OpenAI-compatible.
