import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app";
import type { PrismaClientLike } from "../../plugins/prisma";
import { createTestEnv } from "../../test/test-env";

const testEnv = createTestEnv();

const appsToClose: Array<Awaited<ReturnType<typeof buildApp>>> = [];

afterEach(async () => {
  while (appsToClose.length > 0) {
    const app = appsToClose.pop();

    if (app) {
      await app.close();
    }
  }
});

describe("healthRoutes", () => {
  it("returns service metadata when the database is reachable", async () => {
    const prisma = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([{ result: 1 }]),
    } as unknown as PrismaClientLike;
    const app = await buildApp({ env: testEnv, prisma });
    appsToClose.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: testEnv.SERVICE_NAME,
      environment: "test",
      database: "up",
    });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith("SELECT 1");
  });

  it("returns a degraded response when the database check fails", async () => {
    const prisma = {
      $queryRawUnsafe: vi.fn().mockRejectedValue(new Error("db unavailable")),
    } as unknown as PrismaClientLike;
    const app = await buildApp({ env: testEnv, prisma });
    appsToClose.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: "degraded",
      service: testEnv.SERVICE_NAME,
      environment: "test",
      database: "down",
    });
  });
});
