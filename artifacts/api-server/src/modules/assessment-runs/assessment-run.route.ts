import { AssessmentRunTrigger } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import {
  jsonSchemaFromZod,
  withStandardErrorResponses,
  zodValidationPreHandler,
} from "../../lib/http";
import {
  type AssessmentLaunchParams,
  type AssessmentRunParams,
  assessmentLaunchParamsSchema,
  assessmentRunParamsSchema,
  assessmentRunResponseSchema,
} from "./assessment-run.schema";
import { AssessmentRunService } from "./assessment-run.service";

export const assessmentRunRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/workspaces/:workspaceId/assessments/:assessmentId/launch",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({ params: assessmentLaunchParamsSchema }),
      ],
      schema: {
        tags: ["Assessment Runs"],
        summary: "Launch an assessment run",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              201: assessmentRunResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentLaunchParamsSchema),
      },
    },
    async (request, reply) => {
      const params = request.params as AssessmentLaunchParams;
      const currentUser = request.currentUser!;
      const assessmentRunService = new AssessmentRunService(app);
      const run = await assessmentRunService.launchAssessment({
        workspaceId: params.workspaceId,
        assessmentId: params.assessmentId,
        userId: currentUser.id,
        triggerSource: AssessmentRunTrigger.MANUAL,
      });

      return reply.status(201).send({
        data: assessmentRunService.serializeRun(run),
      });
    },
  );

  app.get(
    "/workspaces/:workspaceId/assessment-runs/:assessmentRunId",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({ params: assessmentRunParamsSchema }),
      ],
      schema: {
        tags: ["Assessment Runs"],
        summary: "Fetch assessment run status and timeline",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: assessmentRunResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(assessmentRunParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as AssessmentRunParams;
      const currentUser = request.currentUser!;
      const assessmentRunService = new AssessmentRunService(app);
      const run = await assessmentRunService.getAssessmentRun({
        workspaceId: params.workspaceId,
        assessmentRunId: params.assessmentRunId,
        userId: currentUser.id,
      });

      return {
        data: assessmentRunService.serializeRun(run),
      };
    },
  );
};
