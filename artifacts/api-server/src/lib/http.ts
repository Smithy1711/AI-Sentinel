import type { FastifyRequest, preHandlerHookHandler } from "fastify";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z, ZodTypeAny } from "zod";

export const errorResponseSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message", "requestId"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        requestId: { type: "string" },
        details: {
          nullable: true,
        },
      },
    },
  },
} as const;

export const validationErrorResponseSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message", "requestId", "details"],
      properties: {
        code: { type: "string", enum: ["VALIDATION_ERROR"] },
        message: { type: "string" },
        requestId: { type: "string" },
        details: {
          type: "object",
          required: ["issues"],
          properties: {
            issues: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
  },
} as const;

const errorSchemasByStatus = {
  400: validationErrorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  429: errorResponseSchema,
  500: errorResponseSchema,
} as const;

export interface ZodRequestSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  querystring?: ZodTypeAny;
}

export function jsonSchemaFromZod(schema: ZodTypeAny): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: "none",
    target: "openApi3",
  }) as Record<string, unknown>;

  delete jsonSchema.$schema;

  return jsonSchema;
}

export function withStandardErrorResponses<TResponse extends Record<number, unknown>>(
  response: TResponse,
  errorStatusCodes: Array<keyof typeof errorSchemasByStatus> = [
    400,
    401,
    403,
    404,
    409,
    429,
    500,
  ],
): TResponse & Record<number, unknown> {
  const errors = Object.fromEntries(
    errorStatusCodes.map((statusCode) => [statusCode, errorSchemasByStatus[statusCode]]),
  );

  return {
    ...errors,
    ...response,
  };
}

export function zodValidationPreHandler(
  schemas: ZodRequestSchemas,
): preHandlerHookHandler {
  return async (request: FastifyRequest) => {
    if (schemas.params) {
      request.params = schemas.params.parse(request.params) as typeof request.params;
    }

    if (schemas.querystring) {
      request.query = schemas.querystring.parse(request.query) as typeof request.query;
    }

    if (schemas.body) {
      request.body = schemas.body.parse(request.body) as typeof request.body;
    }
  };
}

export type InferBody<TSchema extends ZodTypeAny> = z.infer<TSchema>;
export type InferParams<TSchema extends ZodTypeAny> = z.infer<TSchema>;
export type InferQuerystring<TSchema extends ZodTypeAny> = z.infer<TSchema>;
