import type { FastifyPluginAsync } from "fastify";
import {
  jsonSchemaFromZod,
  withStandardErrorResponses,
  zodValidationPreHandler,
} from "../../lib/http";
import {
  type LoginBody,
  type SignupBody,
  authResponseSchema,
  currentUserResponseSchema,
  loginBodySchema,
  signupBodySchema,
} from "./auth.schema";
import { AuthService } from "./auth.service";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/auth/signup",
    {
      preHandler: zodValidationPreHandler({
        body: signupBodySchema,
      }),
      config: {
        rateLimit: {
          max: app.config.AUTH_RATE_LIMIT_MAX,
          timeWindow: app.config.AUTH_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
      schema: {
        tags: ["Auth"],
        summary: "Create an account",
        response: {
          ...withStandardErrorResponses(
            {
              201: authResponseSchema,
            },
            [400, 409, 429, 500],
          ),
        },
        body: jsonSchemaFromZod(signupBodySchema),
      },
    },
    async (request, reply) => {
      const body = request.body as SignupBody;
      const authService = new AuthService(app);
      const user = await authService.signup(body);
      const accessToken = await authService.issueAccessToken(user);

      return reply.status(201).send({
        data: {
          accessToken,
          user: authService.serializeUser(user),
        },
      });
    },
  );

  app.post(
    "/auth/login",
    {
      preHandler: zodValidationPreHandler({
        body: loginBodySchema,
      }),
      config: {
        rateLimit: {
          max: app.config.AUTH_RATE_LIMIT_MAX,
          timeWindow: app.config.AUTH_RATE_LIMIT_TIME_WINDOW_MS,
        },
      },
      schema: {
        tags: ["Auth"],
        summary: "Login with email and password",
        response: {
          ...withStandardErrorResponses(
            {
              200: authResponseSchema,
            },
            [400, 401, 429, 500],
          ),
        },
        body: jsonSchemaFromZod(loginBodySchema),
      },
    },
    async (request) => {
      const body = request.body as LoginBody;
      const authService = new AuthService(app);
      const user = await authService.login(body);
      const accessToken = await authService.issueAccessToken(user);

      return {
        data: {
          accessToken,
          user: authService.serializeUser(user),
        },
      };
    },
  );

  app.get(
    "/auth/me",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["Auth"],
        summary: "Get the current authenticated user",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: currentUserResponseSchema,
            },
            [401, 500],
          ),
        },
      },
    },
    async (request) => {
      const authService = new AuthService(app);
      const user = request.currentUser ?? (await authService.getCurrentUserOrThrow(request.user.sub));

      return {
        data: {
          user: authService.serializeUser(user),
          activeWorkspace: user.activeWorkspace,
        },
      };
    },
  );
};
