import type { FastifyPluginAsync } from "fastify";
import { withStandardErrorResponses } from "../../lib/http";
import {
  dashboardLatestRunsResponseSchema,
  dashboardOverviewResponseSchema,
  dashboardRecentActivityResponseSchema,
  dashboardRecentReportsResponseSchema,
} from "./dashboard.schema";
import { DashboardService } from "./dashboard.service";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/dashboard/overview",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["Dashboard"],
        summary: "Get active workspace dashboard overview",
        description:
          "Returns frontend-ready card and chart data for the current active workspace dashboard.",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: dashboardOverviewResponseSchema,
            },
            [401, 404, 409, 500],
          ),
        },
      },
    },
    async (request) => {
      const currentUser = request.currentUser!;
      const dashboardService = new DashboardService(app);

      return {
        data: await dashboardService.getOverview(currentUser.id),
      };
    },
  );

  app.get(
    "/dashboard/recent-reports",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["Dashboard"],
        summary: "Get recent reports for the active workspace",
        description:
          "Returns a compact list of recent reports optimized for the dashboard reports table.",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: dashboardRecentReportsResponseSchema,
            },
            [401, 404, 409, 500],
          ),
        },
      },
    },
    async (request) => {
      const currentUser = request.currentUser!;
      const dashboardService = new DashboardService(app);

      return {
        data: await dashboardService.getRecentReports(currentUser.id),
      };
    },
  );

  app.get(
    "/dashboard/recent-activity",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["Dashboard"],
        summary: "Get recent activity for the active workspace",
        description:
          "Returns a recent audit/activity feed optimized for the dashboard activity list.",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: dashboardRecentActivityResponseSchema,
            },
            [401, 404, 409, 500],
          ),
        },
      },
    },
    async (request) => {
      const currentUser = request.currentUser!;
      const dashboardService = new DashboardService(app);

      return {
        data: await dashboardService.getRecentActivity(currentUser.id),
      };
    },
  );

  app.get(
    "/dashboard/latest-runs",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["Dashboard"],
        summary: "Get latest assessment runs for the active workspace",
        description:
          "Returns the latest assessment runs optimized for the dashboard run-status table.",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: dashboardLatestRunsResponseSchema,
            },
            [401, 404, 409, 500],
          ),
        },
      },
    },
    async (request) => {
      const currentUser = request.currentUser!;
      const dashboardService = new DashboardService(app);

      return {
        data: await dashboardService.getLatestRuns(currentUser.id),
      };
    },
  );
};
