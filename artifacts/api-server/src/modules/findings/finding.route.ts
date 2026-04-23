import type { ConfidenceLevel, FindingSeverity, FindingStatus } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import {
  jsonSchemaFromZod,
  withStandardErrorResponses,
  zodValidationPreHandler,
} from "../../lib/http";
import {
  type AssessmentFindingParams,
  type FindingDetailParams,
  type FindingFilterQuery,
  type RunFindingParams,
  type UpdateFindingStatusBody,
  assessmentFindingParamsSchema,
  findingAggregateResponseSchema,
  findingDetailParamsSchema,
  findingFilterQuerySchema,
  findingListResponseSchema,
  findingResponseSchema,
  runFindingParamsSchema,
  updateFindingStatusBodySchema,
} from "./finding.schema";
import { FindingService } from "./finding.service";

export const findingRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/workspaces/:workspaceId/assessments/:assessmentId/findings",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({
          params: assessmentFindingParamsSchema,
          querystring: findingFilterQuerySchema,
        }),
      ],
      schema: {
        tags: ["Findings"],
        summary: "List findings for an assessment",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: findingListResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentFindingParamsSchema),
        querystring: jsonSchemaFromZod(findingFilterQuerySchema),
      },
    },
    async (request) => {
      const params = request.params as AssessmentFindingParams;
      const query = request.query as FindingFilterQuery;
      const currentUser = request.currentUser!;
      const findingService = new FindingService(app);
      const findings = await findingService.listForAssessment({
        workspaceId: params.workspaceId,
        assessmentId: params.assessmentId,
        userId: currentUser.id,
        filters: {
          severity: query.severity as FindingSeverity[] | undefined,
          category: query.category,
          status: query.status as FindingStatus[] | undefined,
          confidence: query.confidence as ConfidenceLevel[] | undefined,
        },
      });

      return {
        data: findings.map((finding) => findingService.serializeFinding(finding)),
      };
    },
  );

  app.get(
    "/workspaces/:workspaceId/assessment-runs/:assessmentRunId/findings",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({
          params: runFindingParamsSchema,
          querystring: findingFilterQuerySchema,
        }),
      ],
      schema: {
        tags: ["Findings"],
        summary: "List findings for an assessment run",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: findingListResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(runFindingParamsSchema),
        querystring: jsonSchemaFromZod(findingFilterQuerySchema),
      },
    },
    async (request) => {
      const params = request.params as RunFindingParams;
      const query = request.query as FindingFilterQuery;
      const currentUser = request.currentUser!;
      const findingService = new FindingService(app);
      const findings = await findingService.listForRun({
        workspaceId: params.workspaceId,
        assessmentRunId: params.assessmentRunId,
        userId: currentUser.id,
        filters: {
          severity: query.severity as FindingSeverity[] | undefined,
          category: query.category,
          status: query.status as FindingStatus[] | undefined,
          confidence: query.confidence as ConfidenceLevel[] | undefined,
        },
      });

      return {
        data: findings.map((finding) => findingService.serializeFinding(finding)),
      };
    },
  );

  app.get(
    "/workspaces/:workspaceId/findings/:findingId",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({ params: findingDetailParamsSchema }),
      ],
      schema: {
        tags: ["Findings"],
        summary: "Get finding detail",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: findingResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(findingDetailParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as FindingDetailParams;
      const currentUser = request.currentUser!;
      const findingService = new FindingService(app);
      const finding = await findingService.getFinding({
        workspaceId: params.workspaceId,
        findingId: params.findingId,
        userId: currentUser.id,
      });

      return {
        data: findingService.serializeFinding(finding),
      };
    },
  );

  app.patch(
    "/workspaces/:workspaceId/findings/:findingId/status",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({
          params: findingDetailParamsSchema,
          body: updateFindingStatusBodySchema,
        }),
      ],
      schema: {
        tags: ["Findings"],
        summary: "Update finding status for triage",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: findingResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(findingDetailParamsSchema),
        body: jsonSchemaFromZod(updateFindingStatusBodySchema),
      },
    },
    async (request) => {
      const params = request.params as FindingDetailParams;
      const body = request.body as UpdateFindingStatusBody;
      const currentUser = request.currentUser!;
      const findingService = new FindingService(app);
      const finding = await findingService.updateStatus({
        workspaceId: params.workspaceId,
        findingId: params.findingId,
        userId: currentUser.id,
        status: body.status,
      });

      return {
        data: findingService.serializeFinding(finding),
      };
    },
  );

  app.get(
    "/workspaces/:workspaceId/assessments/:assessmentId/findings/aggregates",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({
          params: assessmentFindingParamsSchema,
          querystring: findingFilterQuerySchema,
        }),
      ],
      schema: {
        tags: ["Findings"],
        summary: "Get finding aggregates for an assessment",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: findingAggregateResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentFindingParamsSchema),
        querystring: jsonSchemaFromZod(findingFilterQuerySchema),
      },
    },
    async (request) => {
      const params = request.params as AssessmentFindingParams;
      const query = request.query as FindingFilterQuery;
      const currentUser = request.currentUser!;
      const findingService = new FindingService(app);
      const aggregate = await findingService.aggregateForAssessment({
        workspaceId: params.workspaceId,
        assessmentId: params.assessmentId,
        userId: currentUser.id,
        filters: {
          severity: query.severity as FindingSeverity[] | undefined,
          category: query.category,
          status: query.status as FindingStatus[] | undefined,
          confidence: query.confidence as ConfidenceLevel[] | undefined,
        },
      });

      return {
        data: aggregate,
      };
    },
  );

  app.get(
    "/workspaces/:workspaceId/assessment-runs/:assessmentRunId/findings/aggregates",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({
          params: runFindingParamsSchema,
          querystring: findingFilterQuerySchema,
        }),
      ],
      schema: {
        tags: ["Findings"],
        summary: "Get finding aggregates for an assessment run",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: findingAggregateResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(runFindingParamsSchema),
        querystring: jsonSchemaFromZod(findingFilterQuerySchema),
      },
    },
    async (request) => {
      const params = request.params as RunFindingParams;
      const query = request.query as FindingFilterQuery;
      const currentUser = request.currentUser!;
      const findingService = new FindingService(app);
      const aggregate = await findingService.aggregateForRun({
        workspaceId: params.workspaceId,
        assessmentRunId: params.assessmentRunId,
        userId: currentUser.id,
        filters: {
          severity: query.severity as FindingSeverity[] | undefined,
          category: query.category,
          status: query.status as FindingStatus[] | undefined,
          confidence: query.confidence as ConfidenceLevel[] | undefined,
        },
      });

      return {
        data: aggregate,
      };
    },
  );
};
