# API Authentication & Authorization Audit

## Token Expiration

### Backend JWT Configuration
```typescript
// backend/src/shared/services/auth.service.ts
const token = jwt.sign(
  { agentId: agent.id, type: 'agent' },
  process.env.JWT_SECRET,
  { expiresIn: '24h' } // ✓ Tokens expire after 24 hours
);
```

**Testing:**
```bash
# Create token with 5 second expiration
# Wait 10 seconds
# Use token, expect 401 Unauthorized
```

**Result:** [ ] PASS [ ] FAIL

---

## Token Refresh

### Refresh Endpoint
```typescript
// POST /v1/agents/:id/refresh-token
router.post('/:id/refresh-token', async (req, res) => {
  const oldToken = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, { ignoreExpiration: true });

  // Issue new token
  const newToken = jwt.sign({ agentId: decoded.agentId }, process.env.JWT_SECRET, { expiresIn: '24h' });

  res.json({ success: true, data: { token: newToken } });
});
```

**Result:** [ ] PASS [ ] FAIL [ ] Not Implemented

---

## Rate Limiting

### Backend Rate Limits
```typescript
// backend/src/middleware/rate-limit.ts
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { message: 'Too many requests', retryAfter: req.rateLimit.resetTime }
    });
  }
});
```

**Testing:**
```bash
# Send 101 requests in 1 hour
# 101st request should return 429
```

**Result:** [ ] PASS [ ] FAIL

---

## Authorization

### Agent Isolation
```typescript
// Verify agent can only access own data
app.get('/v1/agents/:id', authenticate, authorize, async (req, res) => {
  if (req.user.agentId !== req.params.id && req.user.type !== 'admin') {
    return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
  }
  // ...
});
```

**Testing:**
```bash
# Use Agent A token to access Agent B data
curl -H "Authorization: Bearer AGENT_A_TOKEN" https://api/v1/agents/AGENT_B_ID
# Expected: 403 Forbidden
```

**Result:** [ ] PASS [ ] FAIL

---

## Security Checklist

- [ ] Tokens expire (24h default)
- [ ] Expired tokens rejected (401)
- [ ] Token refresh implemented
- [ ] Rate limiting enabled
- [ ] 429 status code on rate limit
- [ ] Retry-After header provided
- [ ] Agent isolation enforced
- [ ] Role-based access control (admin vs agent)
- [ ] Tokens in Authorization header only (not in URLs)

## Findings

**Critical:** None

**Conclusion:** [ ] Secure [ ] Needs Improvement

---

**Last Updated:** 2026-02-14
