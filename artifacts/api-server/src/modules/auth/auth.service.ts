import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/password";
import { AuditLogService } from "../audit/audit.service";

const currentUserSelect = {
  id: true,
  email: true,
  displayName: true,
  activeWorkspaceId: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  deletedAt: true,
  activeWorkspace: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.UserSelect;

export type CurrentUser = Prisma.UserGetPayload<{
  select: typeof currentUserSelect;
}>;

export class AuthService {
  private readonly auditLogService: AuditLogService;

  constructor(private readonly app: FastifyInstance) {
    this.auditLogService = new AuditLogService(app);
  }

  async signup(input: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<CurrentUser> {
    const email = input.email.trim().toLowerCase();
    const existingUser = await this.app.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new AppError(
        409,
        "ACCOUNT_CREATION_FAILED",
        "Unable to create account with the provided credentials.",
      );
    }

    const passwordHash = await hashPassword(input.password);

    const user = await this.app.prisma.user.create({
      data: {
        email,
        displayName: input.displayName?.trim() || null,
        passwordHash,
      },
      select: currentUserSelect,
    });

    await this.auditLogService.record({
      actorUserId: user.id,
      action: "auth.signup",
      entityType: "user",
      entityId: user.id,
      metadata: {
        email: user.email,
      },
    });

    return user;
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<CurrentUser> {
    const email = input.email.trim().toLowerCase();
    const user = await this.app.prisma.user.findUnique({
      where: { email },
      select: {
        ...currentUserSelect,
        passwordHash: true,
      },
    });

    const invalidCredentials = new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
    );

    if (
      !user ||
      user.deletedAt !== null ||
      user.isActive === false ||
      !user.passwordHash
    ) {
      throw invalidCredentials;
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw invalidCredentials;
    }

    const updatedUser = await this.app.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
      select: currentUserSelect,
    });

    await this.auditLogService.record({
      actorUserId: updatedUser.id,
      action: "auth.login",
      entityType: "user",
      entityId: updatedUser.id,
    });

    return updatedUser;
  }

  async getCurrentUserOrThrow(userId: string): Promise<CurrentUser> {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: currentUserSelect,
    });

    if (!user || user.deletedAt !== null || user.isActive === false) {
      throw this.app.httpErrors.unauthorized("Authentication is required.");
    }

    return user;
  }

  async issueAccessToken(user: Pick<CurrentUser, "id" | "activeWorkspaceId">) {
    return this.app.jwt.sign({
      sub: user.id,
      activeWorkspaceId: user.activeWorkspaceId ?? null,
    });
  }

  serializeUser(user: CurrentUser) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      activeWorkspaceId: user.activeWorkspaceId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
