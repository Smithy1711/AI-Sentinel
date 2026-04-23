import type { FastifyServerOptions } from "fastify";
import type { AppEnv } from "./env";

export function buildLoggerOptions(
  env: AppEnv,
): FastifyServerOptions["logger"] {
  const baseLogger = {
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-api-key']",
        "res.headers['set-cookie']",
      ],
      censor: "[Redacted]",
    },
  } satisfies NonNullable<FastifyServerOptions["logger"]>;

  if (env.NODE_ENV === "development") {
    return {
      ...baseLogger,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "SYS:standard",
        },
      },
    };
  }

  return baseLogger;
}
