# Task 00: Project Setup

## Overview
Initialize the backend project with proper structure, dependencies, and configuration.

**Priority:** P0 - Foundation
**Dependencies:** None
**Estimated Complexity:** Low
**Parallel:** No - Must complete first

---

## Objective
Create a Node.js/TypeScript backend project with Express, Prisma ORM, and testing infrastructure.

---

## Project Structure

```
backend/
├── src/
│   ├── app.ts                    # Express app setup
│   ├── server.ts                 # Server entry point
│   ├── config/
│   │   ├── index.ts              # Configuration loader
│   │   ├── database.ts           # Database config
│   │   └── env.ts                # Environment validation
│   ├── middleware/
│   │   ├── auth.ts               # JWT auth middleware
│   │   ├── error.ts              # Error handling
│   │   ├── validation.ts         # Request validation
│   │   └── rateLimit.ts          # Rate limiting
│   ├── modules/
│   │   ├── auth/
│   │   ├── agents/
│   │   ├── assets/
│   │   ├── patches/
│   │   ├── vulnerabilities/
│   │   ├── jobs/
│   │   ├── discovery/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── settings/
│   │   └── tags/
│   ├── shared/
│   │   ├── types/                # Shared TypeScript types
│   │   ├── utils/                # Utility functions
│   │   ├── validators/           # Zod schemas
│   │   └── errors/               # Custom error classes
│   └── db/
│       ├── prisma/
│       │   ├── schema.prisma     # Database schema
│       │   ├── migrations/       # Database migrations
│       │   └── seed.ts           # Seed data
│       └── client.ts             # Prisma client instance
├── tests/
│   ├── setup.ts                  # Test setup
│   ├── utils/                    # Test utilities
│   └── integration/              # Integration tests
├── .env.example
├── .env.test
├── package.json
├── tsconfig.json
├── jest.config.js
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Implementation Steps

### Step 1: Initialize Project

```bash
mkdir -p backend
cd backend
npm init -y
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install express cors helmet morgan dotenv

# TypeScript
npm install -D typescript @types/node @types/express ts-node nodemon

# Database
npm install @prisma/client
npm install -D prisma

# Validation
npm install zod

# Authentication
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs

# Utilities
npm install uuid date-fns
npm install -D @types/uuid

# Rate limiting
npm install express-rate-limit

# Testing
npm install -D jest @types/jest ts-jest supertest @types/supertest

# Linting
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier eslint-config-prettier
```

### Step 3: TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@modules/*": ["src/modules/*"],
      "@shared/*": ["src/shared/*"],
      "@config/*": ["src/config/*"],
      "@middleware/*": ["src/middleware/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Step 4: Jest Configuration

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Step 5: Environment Configuration

**.env.example:**
```env
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/patchiq_dev

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug

# External Services
NIST_NVD_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

### Step 6: Base Application Setup

**src/app.ts:**
```typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from '@middleware/error';
import { notFoundHandler } from '@middleware/notFound';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));

  // Parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes (to be added by other modules)
  // app.use('/v1/auth', authRoutes);
  // app.use('/v1/agents', agentRoutes);
  // etc.

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

**src/server.ts:**
```typescript
import { createApp } from './app';
import { config } from '@config/index';
import { prisma } from '@/db/client';

async function main() {
  const app = createApp();

  // Verify database connection
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(console.error);
```

### Step 7: Docker Configuration

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: patchiq_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: patchiq_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: patchiq_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: patchiq_backend
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/patchiq_dev
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

**Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Step 8: NPM Scripts

**package.json (scripts section):**
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node -r tsconfig-paths/register src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "ts-node prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
  }
}
```

---

## TDD Scenarios

### Test: Health Check Endpoint

```typescript
// tests/integration/health.test.ts
import request from 'supertest';
import { createApp } from '@/app';

describe('Health Check', () => {
  const app = createApp();

  it('should return 200 OK with status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});
```

### Test: 404 Not Found

```typescript
// tests/integration/notFound.test.ts
import request from 'supertest';
import { createApp } from '@/app';

describe('Not Found Handler', () => {
  const app = createApp();

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Not Found');
  });
});
```

---

## Verification Checklist

- [ ] Project directory structure created
- [ ] All dependencies installed
- [ ] TypeScript compiles without errors
- [ ] Jest tests run successfully
- [ ] Docker containers start successfully
- [ ] Health check endpoint responds
- [ ] Database connection works
- [ ] Environment variables loaded correctly

---

## Files to Create

1. `backend/package.json`
2. `backend/tsconfig.json`
3. `backend/jest.config.js`
4. `backend/.env.example`
5. `backend/.env.test`
6. `backend/docker-compose.yml`
7. `backend/Dockerfile`
8. `backend/src/app.ts`
9. `backend/src/server.ts`
10. `backend/src/config/index.ts`
11. `backend/src/middleware/error.ts`
12. `backend/src/middleware/notFound.ts`
13. `backend/tests/setup.ts`
14. `backend/tests/integration/health.test.ts`

---

## Next Task
After completing this task, proceed to:
- **Task 01: Database Setup** - Create Prisma schema and migrations
- **Task 02: Core Utilities** - Implement JWT, encryption, validation
