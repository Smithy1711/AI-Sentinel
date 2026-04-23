import type { FastifyPluginAsync } from "fastify";
import {
  jsonSchemaFromZod,
  withStandardErrorResponses,
  zodValidationPreHandler,
} from "../../lib/http";
import {
  type CreateWorkspaceBody,
  type WorkspaceParams,
  createWorkspaceBodySchema,
  workspaceListResponseSchema,
  workspaceParamsSchema,
  workspaceResponseSchema,
  workspaceSelectionResponseSchema,
} from "./workspace.schema";
import { WorkspaceService } from "./workspace.service";

export const workspaceRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/workspaces",
    {
      preHandler: app.authenticate,
      schema: {
        tags: ["Workspaces"],
        summary: "List my workspaces",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: workspaceListResponseSchema,
            },
            [401, 500],
          ),
        },
      },
    },
    async (request) => {
      const currentUser = request.currentUser!;
      const workspaceService = new WorkspaceService(app);
      const memberships = await workspaceService.listUserWorkspaces(currentUser.id);

      return {
        data: memberships.map((membership) =>
          workspaceService.serializeMembership(
            membership,
            currentUser.activeWorkspaceId,
          ),
        ),
      };
    },
  );

  app.post(
    "/workspaces",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ body: createWorkspaceBodySchema })],
      schema: {
        tags: ["Workspaces"],
        summary: "Create a workspace",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              201: workspaceResponseSchema,
            },
            [400, 401, 409, 500],
          ),
        },
        body: jsonSchemaFromZod(createWorkspaceBodySchema),
      },
    },
    async (request, reply) => {
      const body = request.body as CreateWorkspaceBody;
      const currentUser = request.currentUser!;
      const workspaceService = new WorkspaceService(app);
      const membership = await workspaceService.createWorkspace({
        ...body,
        userId: currentUser.id,
      });

      return reply.status(201).send({
        data: workspaceService.serializeMembership(membership, membership.workspace.id),
      });
    },
  );

  app.post(
    "/workspaces/:workspaceId/select",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: workspaceParamsSchema })],
      schema: {
        tags: ["Workspaces"],
        summary: "Select the active workspace",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: workspaceSelectionResponseSchema,
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
      const workspaceService = new WorkspaceService(app);
      const workspace = await workspaceService.selectActiveWorkspace({
        userId: currentUser.id,
        workspaceId: params.workspaceId,
      });

      return {
        data: {
          activeWorkspaceId: workspace.id,
          workspace: workspaceService.serializeWorkspaceSummary(workspace),
        },
      };
    },
  );
};
