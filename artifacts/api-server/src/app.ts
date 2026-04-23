import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyInstance } from "fastify";
import { buildLoggerOptions } from "./config/logger";
import { createEnv, type AppEnv } from "./config/env";
import { registerErrorHandler } from "./lib/errors";
import { assessmentRunRoutes } from "./modules/assessment-runs/assessment-run.route";
import { AssessmentRunWorker } from "./modules/assessment-runs/assessment-run.worker";
import { assessmentRoutes } from "./modules/assessments/assessment.route";
import { authRoutes } from "./modules/auth/auth.route";
import { dashboardRoutes } from "./modules/dashboard/dashboard.route";
import { findingRoutes } from "./modules/findings/finding.route";
import { healthRoutes } from "./modules/health/health.route";
import { repositoryRoutes } from "./modules/repositories/repository.route";
import { reportRoutes } from "./modules/reports/report.route";
import { workspaceRoutes } from "./modules/workspaces/workspace.route";
import { jobQueuePlugin, type BackgroundJobQueue } from "./plugins/job-queue";
import { jwtPlugin } from "./plugins/jwt";
import { prismaPlugin, type PrismaClientLike } from "./plugins/prisma";
import { swaggerPlugin } from "./plugins/swagger";

export interface BuildAppOptions {
  env?: AppEnv;
  jobQueue?: BackgroundJobQueue;
  prisma?: PrismaClientLike;
}

function resolveCorsOrigin(env: AppEnv): true | string[] {
  if (env.CORS_ORIGIN === "*") {
    return true;
  }

  return env.CORS_ORIGIN.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const env = options.env ?? createEnv();
  const app = Fastify({
    trustProxy: env.TRUST_PROXY,
    requestIdHeader: "x-request-id",
    genReqId: (request) => {
      const requestIdHeader = request.headers["x-request-id"];

      if (typeof requestIdHeader === "string" && requestIdHeader.trim().length > 0) {
        return requestIdHeader;
      }

      return randomUUID();
    },
    logger: buildLoggerOptions(env),
  });

  app.decorate("config", env);
  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = resolveCorsOrigin(env);

      if (!origin || allowedOrigins === true) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.includes(origin));
    },
    credentials: env.CORS_CREDENTIALS,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    strictPreflight: true,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: env.NODE_ENV === "production" ? undefined : false,
  });
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW_MS,
    errorResponseBuilder: (request) => ({
      statusCode: 429,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please retry shortly.",
      requestId: request.id,
    }),
  });
  await app.register(swaggerPlugin);
  await app.register(prismaPlugin, { client: options.prisma });
  await app.register(jobQueuePlugin, { queue: options.jobQueue });
  await app.register(jwtPlugin);
  registerErrorHandler(app);

  new AssessmentRunWorker(app).register();

  await app.register(authRoutes, { prefix: env.API_PREFIX });
  await app.register(dashboardRoutes, { prefix: env.API_PREFIX });
  await app.register(workspaceRoutes, { prefix: env.API_PREFIX });
  await app.register(repositoryRoutes, { prefix: env.API_PREFIX });
  await app.register(assessmentRoutes, { prefix: env.API_PREFIX });
  await app.register(assessmentRunRoutes, { prefix: env.API_PREFIX });
  await app.register(findingRoutes, { prefix: env.API_PREFIX });
  await app.register(reportRoutes, { prefix: env.API_PREFIX });
  await app.register(healthRoutes, { prefix: env.API_PREFIX });

  return app;
}
