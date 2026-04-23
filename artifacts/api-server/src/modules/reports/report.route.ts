import type { FastifyPluginAsync } from "fastify";
import {
  jsonSchemaFromZod,
  withStandardErrorResponses,
  zodValidationPreHandler,
} from "../../lib/http";
import {
  type AssessmentReportParams,
  type ReportParams,
  assessmentReportParamsSchema,
  reportParamsSchema,
  reportResponseSchema,
} from "./report.schema";
import { ReportService } from "./report.service";

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/workspaces/:workspaceId/assessments/:assessmentId/reports/generate",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({ params: assessmentReportParamsSchema }),
      ],
      schema: {
        tags: ["Reports"],
        summary: "Generate a report from the latest completed assessment run",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              201: reportResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentReportParamsSchema),
      },
    },
    async (request, reply) => {
      const params = request.params as AssessmentReportParams;
      const currentUser = request.currentUser!;
      const reportService = new ReportService(app);
      const result = await reportService.generateLatestReport({
        workspaceId: params.workspaceId,
        assessmentId: params.assessmentId,
        userId: currentUser.id,
      });

      return reply.status(201).send({
        data: reportService.serializeReport(result.report),
      });
    },
  );

  app.get(
    "/workspaces/:workspaceId/assessments/:assessmentId/reports/latest",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({ params: assessmentReportParamsSchema }),
      ],
      schema: {
        tags: ["Reports"],
        summary: "Get the latest report for an assessment",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: reportResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentReportParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as AssessmentReportParams;
      const currentUser = request.currentUser!;
      const reportService = new ReportService(app);
      const report = await reportService.getLatestReport({
        workspaceId: params.workspaceId,
        assessmentId: params.assessmentId,
        userId: currentUser.id,
      });

      return {
        data: reportService.serializeReport(report),
      };
    },
  );

  app.get(
    "/workspaces/:workspaceId/reports/:reportId",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: reportParamsSchema })],
      schema: {
        tags: ["Reports"],
        summary: "Get a report by id",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: reportResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(reportParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as ReportParams;
      const currentUser = request.currentUser!;
      const reportService = new ReportService(app);
      const report = await reportService.getReportById({
        workspaceId: params.workspaceId,
        reportId: params.reportId,
        userId: currentUser.id,
      });

      return {
        data: reportService.serializeReport(report),
      };
    },
  );
};
