import type { FastifyInstance } from "fastify";
import { WorkspaceMemberRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { slugify } from "../../lib/slug";
import { AuditLogService } from "../audit/audit.service";

const workspaceMembershipSelect = {
  role: true,
  joinedAt: true,
  workspace: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.WorkspaceMemberSelect;

export type WorkspaceMembershipView = Prisma.WorkspaceMemberGetPayload<{
  select: typeof workspaceMembershipSelect;
}>;

export class WorkspaceService {
  private readonly auditLogService: AuditLogService;

  constructor(private readonly app: FastifyInstance) {
    this.auditLogService = new AuditLogService(app);
  }

  async listUserWorkspaces(userId: string): Promise<WorkspaceMembershipView[]> {
    return this.app.prisma.workspaceMember.findMany({
      where: {
        userId,
        deletedAt: null,
        workspace: {
          deletedAt: null,
          isArchived: false,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: workspaceMembershipSelect,
    });
  }

  async createWorkspace(input: {
    name: string;
    slug?: string;
    description?: string;
    userId: string;
  }): Promise<WorkspaceMembershipView> {
    const slug = input.slug ?? slugify(input.name);

    if (!slug) {
      throw new AppError(
        400,
        "INVALID_WORKSPACE_SLUG",
        "Workspace slug could not be derived from the provided name.",
      );
    }

    const existing = await this.app.prisma.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(
        409,
        "WORKSPACE_SLUG_TAKEN",
        "That workspace slug is already in use.",
      );
    }

    const membership = await this.app.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: input.name.trim(),
          slug,
          description: input.description?.trim() || null,
          createdByUserId: input.userId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: input.userId,
          role: WorkspaceMemberRole.OWNER,
        },
      });

      await tx.user.update({
        where: { id: input.userId },
        data: {
          activeWorkspaceId: workspace.id,
        },
      });

      await this.auditLogService.record(
        {
          workspaceId: workspace.id,
          actorUserId: input.userId,
          action: "workspace.created",
          entityType: "workspace",
          entityId: workspace.id,
          metadata: {
            slug: workspace.slug,
          },
        },
        tx,
      );

      return tx.workspaceMember.findUniqueOrThrow({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: input.userId,
          },
        },
        select: workspaceMembershipSelect,
      });
    });

    return membership;
  }

  async selectActiveWorkspace(input: {
    userId: string;
    workspaceId: string;
  }) {
    const membership = await this.app.prisma.workspaceMember.findFirst({
      where: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        deletedAt: null,
        workspace: {
          deletedAt: null,
          isArchived: false,
        },
      },
      select: workspaceMembershipSelect,
    });

    if (!membership) {
      throw new AppError(
        404,
        "WORKSPACE_NOT_FOUND",
        "Workspace not found for the current user.",
      );
    }

    await this.app.prisma.user.update({
      where: { id: input.userId },
      data: {
        activeWorkspaceId: input.workspaceId,
      },
    });

    await this.auditLogService.record({
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: "workspace.selected",
      entityType: "workspace",
      entityId: input.workspaceId,
    });

    return membership.workspace;
  }

  serializeMembership(
    membership: WorkspaceMembershipView,
    activeWorkspaceId: string | null,
  ) {
    return {
      role: membership.role,
      joinedAt: membership.joinedAt.toISOString(),
      isActive: membership.workspace.id === activeWorkspaceId,
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        description: membership.workspace.description,
        createdAt: membership.workspace.createdAt.toISOString(),
        updatedAt: membership.workspace.updatedAt.toISOString(),
      },
    };
  }

  serializeWorkspaceSummary(workspace: WorkspaceMembershipView["workspace"]) {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }
}
