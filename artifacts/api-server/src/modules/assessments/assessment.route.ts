import type { FastifyPluginAsync } from "fastify";
import {
  jsonSchemaFromZod,
  withStandardErrorResponses,
  zodValidationPreHandler,
} from "../../lib/http";
import { activityFeedResponseSchema } from "../audit/audit.schema";
import { AuditLogService } from "../audit/audit.service";
import {
  type AssessmentParams,
  type CreateAssessmentBody,
  type UpdateAssessmentDraftBody,
  type WorkspaceParams,
  assessmentListResponseSchema,
  assessmentParamsSchema,
  assessmentResponseSchema,
  createAssessmentBodySchema,
  updateAssessmentDraftBodySchema,
  workspaceParamsSchema,
} from "./assessment.schema";
import { AssessmentService } from "./assessment.service";

export const assessmentRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/workspaces/:workspaceId/assessments",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: workspaceParamsSchema })],
      schema: {
        tags: ["Assessments"],
        summary: "List assessments in a workspace",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: assessmentListResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(workspaceParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as WorkspaceParams;
      const currentUser = request.currentUser!;
      const assessmentService = new AssessmentService(app);
      const assessments = await assessmentService.listAssessments({
        workspaceId: params.workspaceId,
        userId: currentUser.id,
      });

      return {
        data: assessments.map((assessment) =>
          assessmentService.serializeAssessment(assessment),
        ),
      };
    },
  );

  app.post(
    "/workspaces/:workspaceId/assessments",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({
          params: workspaceParamsSchema,
          body: createAssessmentBodySchema,
        }),
      ],
      schema: {
        tags: ["Assessments"],
        summary: "Create an assessment draft",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              201: assessmentResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(workspaceParamsSchema),
        body: jsonSchemaFromZod(createAssessmentBodySchema),
      },
    },
    async (request, reply) => {
      const params = request.params as WorkspaceParams;
      const body = request.body as CreateAssessmentBody;
      const currentUser = request.currentUser!;
      const assessmentService = new AssessmentService(app);
      const assessment = await assessmentService.createAssessment({
        workspaceId: params.workspaceId,
        userId: currentUser.id,
        ...body,
      });

      return reply.status(201).send({
        data: assessmentService.serializeAssessment(assessment),
      });
    },
  );

  app.get(
    "/workspaces/:workspaceId/assessments/:assessmentId",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: assessmentParamsSchema })],
      schema: {
        tags: ["Assessments"],
        summary: "Get assessment detail",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: assessmentResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as AssessmentParams;
      const currentUser = request.currentUser!;
      const assessmentService = new AssessmentService(app);
      const assessment = await assessmentService.getAssessment({
        workspaceId: params.workspaceId,
        assessmentId: params.assessmentId,
        userId: currentUser.id,
      });

      return {
        data: assessmentService.serializeAssessment(assessment),
      };
    },
  );

  app.get(
    "/workspaces/:workspaceId/assessments/:assessmentId/activity",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: assessmentParamsSchema })],
      schema: {
        tags: ["Assessments"],
        summary: "Get recent activity for an assessment",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: activityFeedResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as AssessmentParams;
      const currentUser = request.currentUser!;
      const auditLogService = new AuditLogService(app);

      return {
        data: await auditLogService.listAssessmentActivity({
          workspaceId: params.workspaceId,
          assessmentId: params.assessmentId,
          userId: currentUser.id,
          limit: 20,
        }),
      };
    },
  );

  app.patch(
    "/workspaces/:workspaceId/assessments/:assessmentId",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({
          params: assessmentParamsSchema,
          body: updateAssessmentDraftBodySchema,
        }),
      ],
      schema: {
        tags: ["Assessments"],
        summary: "Update an assessment draft",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: assessmentResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentParamsSchema),
        body: jsonSchemaFromZod(updateAssessmentDraftBodySchema),
      },
    },
    async (request) => {
      const params = request.params as AssessmentParams;
      const body = request.body as UpdateAssessmentDraftBody;
      const currentUser = request.currentUser!;
      const assessmentService = new AssessmentService(app);
      const assessment = await assessmentService.updateAssessmentDraft({
        workspaceId: params.workspaceId,
        assessmentId: params.assessmentId,
        userId: currentUser.id,
        ...body,
      });

      return {
        data: assessmentService.serializeAssessment(assessment),
      };
    },
  );

  app.post(
    "/workspaces/:workspaceId/assessments/:assessmentId/archive",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: assessmentParamsSchema })],
      schema: {
        tags: ["Assessments"],
        summary: "Archive an assessment",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: assessmentResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as AssessmentParams;
      const currentUser = request.currentUser!;
      const assessmentService = new AssessmentService(app);
      const assessment = await assessmentService.archiveAssessment({
        workspaceId: params.workspaceId,
        assessmentId: params.assessmentId,
        userId: currentUser.id,
      });

      return {
        data: assessmentService.serializeAssessment(assessment),
      };
    },
  );

  app.post(
    "/workspaces/:workspaceId/assessments/:assessmentId/cancel",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: assessmentParamsSchema })],
      schema: {
        tags: ["Assessments"],
        summary: "Cancel a queued or running assessment",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: assessmentResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as AssessmentParams;
      const currentUser = request.currentUser!;
      const assessmentService = new AssessmentService(app);
      const assessment = await assessmentService.cancelAssessment({
        workspaceId: params.workspaceId,
        assessmentId: params.assessmentId,
        userId: currentUser.id,
      });

      return {
        data: assessmentService.serializeAssessment(assessment),
      };
    },
  );
};
