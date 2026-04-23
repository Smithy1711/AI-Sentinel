import type { WorkspaceMemberRole } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors";

export interface WorkspaceAccessMembership {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
}

export class WorkspaceAccessService {
  constructor(private readonly app: FastifyInstance) {}

  async requireMembership(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceAccessMembership> {
    const membership = await this.app.prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId,
        deletedAt: null,
        workspace: {
          deletedAt: null,
          isArchived: false,
        },
      },
      select: {
        userId: true,
        workspaceId: true,
        role: true,
      },
    });

    if (!membership) {
      throw new AppError(
        404,
        "WORKSPACE_NOT_FOUND",
        "Workspace not found for the current user.",
      );
    }

    return membership;
  }

  async requireRole(
    userId: string,
    workspaceId: string,
    roles: WorkspaceMemberRole[],
  ): Promise<WorkspaceAccessMembership> {
    const membership = await this.requireMembership(userId, workspaceId);

    if (!roles.includes(membership.role)) {
      throw new AppError(
        403,
        "WORKSPACE_FORBIDDEN",
        "You do not have permission to perform this action in the workspace.",
      );
    }

    return membership;
  }
}
