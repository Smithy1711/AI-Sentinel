import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fp from "fastify-plugin";

export const swaggerPlugin = fp(async (app) => {
  if (!app.config.SWAGGER_ENABLED) {
    return;
  }

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "AI Exposure Review API",
        version: "0.1.0",
        description:
          "Backend API for AI Exposure Review, an AI application security assessment platform focused on common AI-specific weaknesses rather than penetration testing.",
      },
      servers: [
        {
          url: app.config.API_PREFIX,
          description: "Versioned API base path",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: app.config.SWAGGER_PATH,
  });
});
