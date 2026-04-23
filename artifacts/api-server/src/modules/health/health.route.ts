import type { FastifyPluginAsync } from "fastify";

const liveHealthResponseSchema = {
  type: "object",
  required: ["status", "service", "environment", "timestamp"],
  properties: {
    status: {
      type: "string",
      enum: ["ok"],
    },
    service: {
      type: "string",
    },
    environment: {
      type: "string",
      enum: ["development", "test", "production"],
    },
    timestamp: {
      type: "string",
      format: "date-time",
    },
  },
} as const;

const healthResponseSchema = {
  type: "object",
  required: ["status", "service", "environment", "database", "timestamp"],
  properties: {
    status: {
      type: "string",
      enum: ["ok", "degraded"],
    },
    service: {
      type: "string",
    },
    environment: {
      type: "string",
      enum: ["development", "test", "production"],
    },
    database: {
      type: "string",
      enum: ["up", "down"],
    },
    timestamp: {
      type: "string",
      format: "date-time",
    },
  },
} as const;

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/health/live",
    {
      schema: {
        tags: ["Health"],
        summary: "Service liveness check",
        description:
          "Returns API process liveness without depending on PostgreSQL readiness.",
        response: {
          200: liveHealthResponseSchema,
        },
      },
    },
    async () => ({
      status: "ok",
      service: app.config.SERVICE_NAME,
      environment: app.config.NODE_ENV,
      timestamp: new Date().toISOString(),
    }),
  );

  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Service health check",
        description:
          "Returns API readiness plus a basic PostgreSQL connectivity check.",
        response: {
          200: healthResponseSchema,
          503: healthResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const baseResponse = {
        service: app.config.SERVICE_NAME,
        environment: app.config.NODE_ENV,
        timestamp: new Date().toISOString(),
      };

      try {
        await app.prisma.$queryRawUnsafe("SELECT 1");

        return {
          ...baseResponse,
          status: "ok",
          database: "up",
        };
      } catch (error) {
        app.log.error({ err: error }, "Health check database probe failed");

        return reply.code(503).send({
          ...baseResponse,
          status: "degraded",
          database: "down",
        });
      }
    },
  );
};
