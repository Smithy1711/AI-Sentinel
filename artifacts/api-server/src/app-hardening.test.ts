import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";
import type { PrismaClientLike } from "./plugins/prisma";
import { createTestEnv } from "./test/test-env";

const appsToClose: Array<Awaited<ReturnType<typeof buildApp>>> = [];

function createMinimalPrisma(): PrismaClientLike {
  return {
    $disconnect: async () => undefined,
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaClientLike;
}

afterEach(async () => {
  vi.restoreAllMocks();

  while (appsToClose.length > 0) {
    const app = appsToClose.pop();

    if (app) {
      await app.close();
    }
  }
});

describe("app hardening", () => {
  it("returns a consistent auth error for protected routes", async () => {
    const app = await buildApp({
      env: createTestEnv(),
      prisma: createMinimalPrisma(),
    });
    appsToClose.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required.",
      },
    });
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
  });

  it("returns a validation error payload for invalid auth input", async () => {
    const app = await buildApp({
      env: createTestEnv(),
      prisma: createMinimalPrisma(),
    });
    appsToClose.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        email: "not-an-email",
        password: "short",
        unexpected: true,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: {
          issues: expect.any(Array),
        },
      },
    });
  });

  it("returns a structured not found response", async () => {
    const app = await buildApp({
      env: createTestEnv(),
      prisma: createMinimalPrisma(),
    });
    appsToClose.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/does-not-exist",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
      },
    });
  });

  it("applies route-level rate limiting to auth endpoints", async () => {
    const app = await buildApp({
      env: createTestEnv({
        AUTH_RATE_LIMIT_MAX: 1,
        AUTH_RATE_LIMIT_TIME_WINDOW_MS: 60_000,
      }),
      prisma: createMinimalPrisma(),
    });
    appsToClose.push(app);

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "owner@example.com",
        password: "Password123!",
      },
    });

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "owner@example.com",
        password: "Password123!",
      },
    });

    expect(first.statusCode).toBe(401);
    expect(second.statusCode).toBe(429);
    expect(second.json()).toMatchObject({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
      },
    });
  });

  it("applies configured CORS headers for allowed origins", async () => {
    const app = await buildApp({
      env: createTestEnv(),
      prisma: createMinimalPrisma(),
    });
    appsToClose.push(app);

    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/auth/login",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
  });
});
