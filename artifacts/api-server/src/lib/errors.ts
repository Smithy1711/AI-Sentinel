import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function buildErrorPayload(
  requestId: string,
  code: string,
  message: string,
  details?: unknown,
) {
  return {
    error: {
      code,
      message,
      requestId,
      ...(details === undefined ? {} : { details }),
    },
  };
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send(
      buildErrorPayload(
        request.id,
        "NOT_FOUND",
        "The requested resource was not found.",
      ),
    ),
  );

  app.setErrorHandler((error, request, reply) => {
    const errorMessage = error instanceof Error ? error.message : "";
    const errorCode =
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined;
    const validationIssues =
      typeof error === "object" &&
      error !== null &&
      "validation" in error &&
      Array.isArray((error as { validation?: unknown }).validation)
        ? (error as { validation: unknown[] }).validation
        : null;

    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send(
          buildErrorPayload(request.id, "VALIDATION_ERROR", "Request validation failed.", {
            issues: error.issues,
          }),
        );
    }

    if (validationIssues) {
      return reply.status(400).send(
        buildErrorPayload(request.id, "VALIDATION_ERROR", "Request validation failed.", {
          issues: validationIssues,
        }),
      );
    }

    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send(
          buildErrorPayload(request.id, error.code, error.message, error.details),
        );
    }

    if (
      errorCode?.startsWith("FST_JWT_") ||
      errorCode?.startsWith("FAST_JWT_")
    ) {
      return reply.status(401).send(
        buildErrorPayload(
          request.id,
          "AUTHENTICATION_REQUIRED",
          "Authentication is required.",
        ),
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return reply.status(409).send(
          buildErrorPayload(
            request.id,
            "RESOURCE_CONFLICT",
            "A resource with the same unique value already exists.",
            { target: error.meta?.target ?? null },
          ),
        );
      }

      if (error.code === "P2025") {
        return reply.status(404).send(
          buildErrorPayload(
            request.id,
            "RESOURCE_NOT_FOUND",
            "The requested resource could not be found.",
          ),
        );
      }
    }

    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 500;

    const code =
      statusCode === 429
        ? "RATE_LIMIT_EXCEEDED"
        : errorCode ??
          (statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR");

    const message =
      statusCode >= 500
        ? "An unexpected error occurred."
        : errorMessage || "Request failed.";

    if (statusCode >= 500) {
      request.log.error({ err: error }, "Unhandled request error");
    } else if (statusCode >= 400) {
      request.log.warn({ err: error, statusCode }, "Request failed");
    }

    return reply
      .status(statusCode)
      .send(buildErrorPayload(request.id, code, message));
  });
}
