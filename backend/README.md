# PatchIQ Backend

Node.js/TypeScript backend API server for PatchIQ patch and vulnerability management platform.

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3+
- **Framework**: Express 4.x
- **Database**: PostgreSQL 16 with Prisma ORM
- **Authentication**: JWT with refresh token rotation
- **Validation**: Zod
- **Testing**: Jest + Supertest

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for local development)
- PostgreSQL 16 (or use Docker)

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Start database** (using Docker):
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Seed the database** (optional):
   ```bash
   npm run db:seed
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

The server will be available at `http://localhost:3000`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema changes (dev only) |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:generate` | Generate Prisma client |

## Project Structure

```
backend/
├── src/
│   ├── app.ts                    # Express app setup
│   ├── server.ts                 # Server entry point
│   ├── config/                   # Configuration
│   ├── middleware/               # Express middleware
│   ├── modules/                  # Feature modules
│   │   ├── auth/                 # Authentication
│   │   ├── agents/               # Agent management
│   │   ├── assets/               # Asset management
│   │   ├── patches/              # Patch management
│   │   ├── vulnerabilities/      # Vulnerability management
│   │   └── ...
│   ├── shared/                   # Shared code
│   │   ├── types/                # TypeScript types
│   │   ├── utils/                # Utility functions
│   │   ├── validators/           # Zod schemas
│   │   └── errors/               # Error classes
│   └── db/
│       ├── prisma/               # Prisma schema & migrations
│       └── client.ts             # Prisma client
├── tests/
│   ├── setup.ts                  # Test setup
│   ├── utils/                    # Test utilities
│   ├── unit/                     # Unit tests
│   └── integration/              # Integration tests
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## API Documentation

### Base URL
```
/v1
```

### Authentication
All protected endpoints require a Bearer token:
```
Authorization: Bearer <access_token>
```

### Health Check
```
GET /health
```

### API Version Info
```
GET /v1
```

## Environment Variables

See `.env.example` for all available environment variables.

### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `USE_MOCK_NVD` | true | Use mock NVD service |
| `USE_MOCK_EMAIL` | true | Use mock email service |

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- health.test.ts

# Run in watch mode
npm run test:watch
```

## Docker

### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Production Build
```bash
docker build --target production -t patchiq-backend .
docker run -p 3000:3000 patchiq-backend
```

## License

PROPRIETARY - All rights reserved.
