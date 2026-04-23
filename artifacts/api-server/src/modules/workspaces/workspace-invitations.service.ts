import type { FastifyInstance } from "fastify";
import { WorkspaceInvitationStatus } from "@prisma/client";
import { AppError } from "../../lib/errors";

export class WorkspaceInvitationService {
  constructor(private readonly app: FastifyInstance) {}

  async listPendingInvitations(workspaceId: string) {
    return this.app.prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
        status: WorkspaceInvitationStatus.PENDING,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async createInvitationStub(): Promise<never> {
    throw new AppError(
      501,
      "WORKSPACE_INVITATIONS_NOT_IMPLEMENTED",
      "Workspace invitations are not implemented yet.",
    );
  }
}
