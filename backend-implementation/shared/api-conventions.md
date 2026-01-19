# API Conventions

## URL Structure

```
Base URL: /v1

Examples:
GET    /v1/assets
POST   /v1/assets
GET    /v1/assets/:id
PUT    /v1/assets/:id
DELETE /v1/assets/:id
GET    /v1/assets/:id/hardware   (sub-resource)
```

## Request Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

## Response Format

### Success - Single Item

```json
{
  "id": "uuid",
  "name": "Item Name",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Success - List (Paginated)

```json
{
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### Success - Simple List (No Pagination)

```json
[
  { "id": "1", "name": "Item 1" },
  { "id": "2", "name": "Item 2" }
]
```

### Success - Message Only

```json
{
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "error": "ErrorType",
  "message": "Human readable message",
  "details": {
    "field": "specific field issue"
  }
}
```

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (create) |
| 400 | Bad Request | Validation error, invalid request |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, constraint violation |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Unexpected server error |

## Pagination

Query parameters:
- `page` - Page number (1-indexed, default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Field to sort by
- `order` - Sort order (asc/desc, default: desc)

Example: `GET /v1/assets?page=2&limit=50&sort=createdAt&order=desc`

## Filtering

Query parameters match field names:
- `GET /v1/assets?status=In%20Use`
- `GET /v1/agents?os=Windows&status=Connected`
- `GET /v1/patches?severity=CRITICAL`

## Searching

Use `search` parameter for text search:
- `GET /v1/assets?search=MacBook`
- `GET /v1/vulnerabilities?search=CVE-2024`

## Date/Time Format

Always use ISO 8601 format in UTC:
```
2024-01-15T10:30:00.000Z
```

## IDs

Always use UUIDs:
```
550e8400-e29b-41d4-a716-446655440000
```

## Null vs Undefined

- `null` - Field exists but has no value
- Omitted - Field not returned (use in partial responses)

## Common Response Fields

```typescript
{
  id: string;            // UUID
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
  createdBy?: string;    // User ID
}
```
