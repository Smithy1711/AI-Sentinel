import fastifyJwt from "@fastify/jwt";
import fp from "fastify-plugin";
import { AppError } from "../lib/errors";
import { AuthService } from "../modules/auth/auth.service";

export const jwtPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: app.config.JWT_SECRET,
    sign: {
      expiresIn: app.config.JWT_EXPIRES_IN,
    },
  });

  app.decorateRequest("currentUser", null);
  app.decorate("authenticate", async (request, reply) => {
    void reply;

    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }

    const subject = request.user.sub;

    if (!subject) {
      throw new AppError(
        401,
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
      );
    }

    const authService = new AuthService(app);
    request.currentUser = await authService.getCurrentUserOrThrow(subject);
  });
});
