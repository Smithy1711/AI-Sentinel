import {
  AssessmentStatus,
  FindingSeverity,
  RepositoryStatus,
} from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors";
import { AuditLogService } from "../audit/audit.service";
import { WorkspaceAccessService } from "../workspaces/workspace-access.service";

const activeAssessmentStatuses = [
  AssessmentStatus.DRAFT,
  AssessmentStatus.QUEUED,
  AssessmentStatus.RUNNING,
];

export class DashboardService {
  private readonly workspaceAccessService: WorkspaceAccessService;
  private readonly auditLogService: AuditLogService;

  constructor(private readonly app: FastifyInstance) {
    this.workspaceAccessService = new WorkspaceAccessService(app);
    this.auditLogService = new AuditLogService(app);
  }

  async getOverview(userId: string) {
    const workspaceId = await this.resolveActiveWorkspaceId(userId);

    const [
      activeAssessmentsCount,
      connectedReposCount,
      highSeverityFindingsCount,
      findingsBySeverityRaw,
      assessmentsByStatusRaw,
    ] = await Promise.all([
      this.app.prisma.assessment.count({
        where: {
          workspaceId,
          deletedAt: null,
          status: {
            in: activeAssessmentStatuses,
          },
        },
      }),
      this.app.prisma.repository.count({
        where: {
          workspaceId,
          deletedAt: null,
          status: RepositoryStatus.CONNECTED,
        },
      }),
      this.app.prisma.finding.count({
        where: {
          workspaceId,
          deletedAt: null,
          severity: {
            in: [FindingSeverity.CRITICAL, FindingSeverity.HIGH],
          },
          status: {
            notIn: ["FIXED", "FALSE_POSITIVE"],
          },
        },
      }),
      this.app.prisma.finding.groupBy({
        by: ["severity"],
        where: {
          workspaceId,
          deletedAt: null,
        },
        _count: {
          _all: true,
        },
      }),
      this.app.prisma.assessment.groupBy({
        by: ["status"],
        where: {
          workspaceId,
          deletedAt: null,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    return {
      workspaceId,
      cards: {
        activeAssessmentsCount,
        connectedReposCount,
        highSeverityFindingsCount,
      },
      charts: {
        findingsBySeverity: findingsBySeverityRaw.map((item) => ({
          severity: item.severity,
          count: item._count._all,
        })),
        assessmentsByStatus: assessmentsByStatusRaw.map((item) => ({
          status: item.status,
          count: item._count._all,
        })),
      },
    };
  }

  async getRecentReports(userId: string) {
    const workspaceId = await this.resolveActiveWorkspaceId(userId);
    const reports = await this.app.prisma.report.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        assessmentId: true,
        assessmentRunId: true,
        title: true,
        version: true,
        status: true,
        riskLevel: true,
        createdAt: true,
      },
    });

    return {
      workspaceId,
      items: reports.map((report) => ({
        id: report.id,
        assessmentId: report.assessmentId,
        assessmentRunId: report.assessmentRunId,
        title: report.title,
        version: report.version,
        status: report.status,
        overallRiskRating: report.riskLevel,
        createdAt: report.createdAt.toISOString(),
      })),
    };
  }

  async getRecentActivity(userId: string) {
    const workspaceId = await this.resolveActiveWorkspaceId(userId);
    return this.auditLogService.listRecentWorkspaceActivity({
      workspaceId,
      userId,
      limit: 10,
    });
  }

  async getLatestRuns(userId: string) {
    const workspaceId = await this.resolveActiveWorkspaceId(userId);
    const runs = await this.app.prisma.assessmentRun.findMany({
      where: {
        workspaceId,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        assessmentId: true,
        status: true,
        progressPercent: true,
        findingsCount: true,
        overallRiskLevel: true,
        updatedAt: true,
        assessment: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      workspaceId,
      items: runs.map((run) => ({
        id: run.id,
        assessmentId: run.assessmentId,
        assessmentName: run.assessment.name,
        status: run.status,
        progressPercent: run.progressPercent,
        findingsCount: run.findingsCount,
        overallRiskLevel: run.overallRiskLevel,
        updatedAt: run.updatedAt.toISOString(),
      })),
    };
  }

  private async resolveActiveWorkspaceId(userId: string) {
    const user = await this.app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeWorkspaceId: true,
      },
    });

    if (!user?.activeWorkspaceId) {
      throw new AppError(
        409,
        "ACTIVE_WORKSPACE_REQUIRED",
        "An active workspace must be selected before loading the dashboard.",
      );
    }

    await this.workspaceAccessService.requireMembership(
      userId,
      user.activeWorkspaceId,
    );

    return user.activeWorkspaceId;
  }
}
