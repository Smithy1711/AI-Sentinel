import { z } from "zod";

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      if (normalized === "true") {
        return true;
      }

      if (normalized === "false") {
        return false;
      }
    }

    return defaultValue;
  }, z.boolean());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    SERVICE_NAME: z.string().trim().min(1).default("ai-exposure-review-api"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    API_PREFIX: z.string().trim().startsWith("/").default("/api/v1"),
    SWAGGER_ENABLED: booleanFromEnv(true),
    SWAGGER_PATH: z.string().trim().startsWith("/").default("/docs"),
    TRUST_PROXY: booleanFromEnv(false),
    CORS_ORIGIN: z.string().trim().min(1).default("http://localhost:5173"),
    CORS_CREDENTIALS: booleanFromEnv(false),
    DATABASE_URL: z.string().trim().min(1),
    JWT_SECRET: z.string().trim().min(32),
    JWT_EXPIRES_IN: z.string().trim().min(1).default("1h"),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
    RATE_LIMIT_TIME_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    AUTH_RATE_LIMIT_TIME_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60_000),
    INTEGRATION_TOKEN_ENCRYPTION_SECRET: z.string().trim().min(32).default("replace-this-with-a-long-random-integration-secret"),
    GITHUB_BASE_URL: z.string().url().default("https://github.com"),
    GITHUB_API_BASE_URL: z.string().url().default("https://api.github.com"),
    GITHUB_OAUTH_SCOPES: z.string().trim().min(1).default("repo read:user"),
    GITHUB_OAUTH_STATE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
    GITHUB_CLIENT_ID: z.string().default(""),
    GITHUB_CLIENT_SECRET: z.string().default(""),
    GITHUB_REDIRECT_URI: z
      .string()
      .url()
      .default(
        "http://localhost:4000/api/v1/workspaces/default/integrations/github/callback",
      ),
    GITHUB_USE_MOCK: booleanFromEnv(false),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.CORS_ORIGIN === "*") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGIN"],
        message: "Production deployments require explicit CORS origins.",
      });
    }

    if (
      env.NODE_ENV === "production" &&
      env.JWT_SECRET.toLowerCase().includes("replace-this")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET"],
        message: "JWT_SECRET must be replaced before production startup.",
      });
    }

    if (
      env.NODE_ENV === "production" &&
      env.INTEGRATION_TOKEN_ENCRYPTION_SECRET.toLowerCase().includes("replace-this")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["INTEGRATION_TOKEN_ENCRYPTION_SECRET"],
        message:
          "INTEGRATION_TOKEN_ENCRYPTION_SECRET must be replaced before production startup.",
      });
    }

    if (!env.GITHUB_USE_MOCK && env.GITHUB_CLIENT_ID.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GITHUB_CLIENT_ID"],
        message: "GITHUB_CLIENT_ID is required when GITHUB_USE_MOCK=false.",
      });
    }

    if (!env.GITHUB_USE_MOCK && env.GITHUB_CLIENT_SECRET.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GITHUB_CLIENT_SECRET"],
        message: "GITHUB_CLIENT_SECRET is required when GITHUB_USE_MOCK=false.",
      });
    }

    if (env.CORS_ORIGIN === "*" && env.CORS_CREDENTIALS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_CREDENTIALS"],
        message: "CORS credentials cannot be enabled when CORS_ORIGIN='*'.",
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export class EnvironmentValidationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super("Invalid environment configuration.");
  }
}

export function formatEnvIssues(issues: z.ZodIssue[]): string[] {
  return issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "env";
    return `${path}: ${issue.message}`;
  });
}

export function createEnv(source: Record<string, unknown> = process.env): AppEnv {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new EnvironmentValidationError(result.error.issues);
  }

  return result.data;
}
