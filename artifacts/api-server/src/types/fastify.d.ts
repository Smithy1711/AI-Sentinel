import type { FastifyReply } from "fastify";
import type { AppEnv } from "../config/env";
import type { CurrentUser } from "../modules/auth/auth.service";
import type { BackgroundJobQueue } from "../plugins/job-queue";
import type { PrismaClientLike } from "../plugins/prisma";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      activeWorkspaceId?: string | null;
    };
    user: {
      sub: string;
      activeWorkspaceId?: string | null;
    };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    config: AppEnv;
    jobQueue: BackgroundJobQueue;
    prisma: PrismaClientLike;
  }

  interface FastifyRequest {
    currentUser: CurrentUser | null;
  }
}
