# AI-Sentinel

pnpm workspace monorepo for the AI Sentinel project.

## Development

Install dependencies:

```bash
pnpm install
```

Useful commands:

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-server run start
pnpm --filter @workspace/ai-exposure-review run dev
pnpm --filter @workspace/mockup-sandbox run dev
```

## Backend

The backend lives in [artifacts/api-server](/c:/Users/Ben/Documents/Code/AI-Sentinel/artifacts/api-server) and uses Fastify, Prisma, PostgreSQL, JWT scaffolding, Zod-based env validation, Swagger docs, ESLint, Prettier, Vitest, and Docker.

Local run:

```bash
Copy-Item artifacts/api-server/.env.example artifacts/api-server/.env
docker compose -f artifacts/api-server/docker-compose.yml up -d postgres
pnpm install
pnpm --filter @workspace/api-server run prisma:db:push
pnpm --filter @workspace/api-server run dev
```

Useful backend commands:

```bash
pnpm run backend:dev
pnpm run backend:lint
pnpm run backend:test
pnpm run backend:build
```

Backend URLs after startup:

```text
API: http://localhost:4000/api/v1
Health: http://localhost:4000/api/v1/health
Swagger UI: http://localhost:4000/docs
```

## Railway Deployment

This repo is prepared for three separate Railway services:

1. `postgres`
2. `api`
3. `web`

### Service layout

- Railway Postgres: use the Railway PostgreSQL template/plugin.
- API service: point the Railway service root directory to [artifacts/api-server](/c:/Users/Ben/Documents/Code/AI-Sentinel/artifacts/api-server) so it uses [artifacts/api-server/railway.toml](/c:/Users/Ben/Documents/Code/AI-Sentinel/artifacts/api-server/railway.toml).
- Web service: point the Railway service root directory to [artifacts/ai-exposure-review](/c:/Users/Ben/Documents/Code/AI-Sentinel/artifacts/ai-exposure-review) so it uses [artifacts/ai-exposure-review/railway.toml](/c:/Users/Ben/Documents/Code/AI-Sentinel/artifacts/ai-exposure-review/railway.toml).

### API service env

Set these on the Railway API service:

```text
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<long-random-secret>
INTEGRATION_TOKEN_ENCRYPTION_SECRET=<long-random-secret>
CORS_ORIGIN=<your Railway web URL>
CORS_CREDENTIALS=false
GITHUB_CLIENT_ID=<github oauth app client id>
GITHUB_CLIENT_SECRET=<github oauth app client secret>
GITHUB_REDIRECT_URI=<your Railway web URL>/integrations/github/callback
GITHUB_USE_MOCK=false
BOOTSTRAP_SEED_ON_STARTUP=true
BOOTSTRAP_USER_EMAIL=<initial admin email>
BOOTSTRAP_USER_PASSWORD=<initial admin password>
BOOTSTRAP_USER_DISPLAY_NAME=<initial admin display name>
BOOTSTRAP_WORKSPACE_NAME=<initial workspace name>
BOOTSTRAP_WORKSPACE_SLUG=<initial-workspace-slug>
```

Notes:

```text
- The API start command runs `prisma migrate deploy` before starting the server.
- If BOOTSTRAP_SEED_ON_STARTUP=true, the API also runs the Prisma seed once on startup so you have an initial account and workspace in production.
- Railway will provide PORT automatically.
- If the API sits behind Railway's proxy, set TRUST_PROXY=true.
```

### Web service env

Set these on the Railway web service:

```text
VITE_API_BASE_URL=<your Railway API URL>
BASE_PATH=/
```

Notes:

```text
- The web app builds as static assets and is served by [server.mjs](/c:/Users/Ben/Documents/Code/AI-Sentinel/artifacts/ai-exposure-review/server.mjs).
- SPA route fallback is enabled, so direct links like `/reports/:id` will still load.
```

### Deployment scripts

These root scripts are used by Railway:

```text
pnpm railway:api:build
pnpm railway:api:start
pnpm railway:web:build
pnpm railway:web:start
```

### GitHub Integration

The backend uses a GitHub OAuth App for the current repository connection flow. Required env vars in [artifacts/api-server/.env.example](/c:/Users/Ben/Documents/Code/AI-Sentinel/artifacts/api-server/.env.example):

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_REDIRECT_URI
INTEGRATION_TOKEN_ENCRYPTION_SECRET
GITHUB_USE_MOCK=false
```

Recommended GitHub OAuth App settings:

```text
Homepage URL: your frontend app URL, e.g. http://localhost:5173
Authorization callback URL: your frontend callback route, e.g. http://localhost:5173/integrations/github/callback
Scopes requested by the backend: repo read:user
```

Frontend connection flow:

1. Call `POST /api/v1/workspaces/:workspaceId/integrations/github/initiate` while authenticated to get `authorizationUrl` and `state`.
2. Redirect the browser to `authorizationUrl`.
3. Let GitHub redirect back to the frontend route configured in `GITHUB_REDIRECT_URI`.
4. Read `code` and `state` from the frontend callback URL.
5. Call `POST /api/v1/workspaces/:workspaceId/integrations/github/callback` with `{ code, state }`.
6. After success, call `POST /api/v1/workspaces/:workspaceId/integrations/github/sync` to import and normalize accessible repositories.

Notes:

```text
- The backend validates the stored OAuth state and PKCE verifier before exchanging the code.
- GitHub access tokens are encrypted at rest with INTEGRATION_TOKEN_ENCRYPTION_SECRET.
- If GitHub revokes the token, sync will mark the connection revoked and the frontend should prompt the user to reconnect.
```
