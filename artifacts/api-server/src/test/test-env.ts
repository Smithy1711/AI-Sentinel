import type { AppEnv } from "../config/env";

const baseTestEnv: AppEnv = {
  NODE_ENV: "test",
  SERVICE_NAME: "ai-exposure-review-api",
  HOST: "127.0.0.1",
  PORT: 4000,
  LOG_LEVEL: "silent",
  API_PREFIX: "/api/v1",
  SWAGGER_ENABLED: false,
  SWAGGER_PATH: "/docs",
  TRUST_PROXY: false,
  CORS_ORIGIN: "http://localhost:5173",
  CORS_CREDENTIALS: false,
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/ai_exposure_review?schema=public",
  JWT_SECRET: "12345678901234567890123456789012",
  JWT_EXPIRES_IN: "1h",
  RATE_LIMIT_MAX: 200,
  RATE_LIMIT_TIME_WINDOW_MS: 60_000,
  AUTH_RATE_LIMIT_MAX: 10,
  AUTH_RATE_LIMIT_TIME_WINDOW_MS: 60_000,
  INTEGRATION_TOKEN_ENCRYPTION_SECRET:
    "12345678901234567890123456789012-integration",
  GITHUB_BASE_URL: "https://github.com",
  GITHUB_API_BASE_URL: "https://api.github.com",
  GITHUB_OAUTH_SCOPES: "repo read:user",
  GITHUB_OAUTH_STATE_TTL_MINUTES: 10,
  GITHUB_CLIENT_ID: "",
  GITHUB_CLIENT_SECRET: "",
  GITHUB_REDIRECT_URI:
    "http://localhost:4000/api/v1/workspaces/default/integrations/github/callback",
  GITHUB_USE_MOCK: true,
};

export function createTestEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    ...baseTestEnv,
    ...overrides,
  };
}
