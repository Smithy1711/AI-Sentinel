import type { FastifyPluginAsync } from "fastify";
import {
  jsonSchemaFromZod,
  withStandardErrorResponses,
  zodValidationPreHandler,
} from "../../lib/http";
import {
  type CreateRepositoryBody,
  type GithubCallbackBody,
  type RepositoryParams,
  type UpdateRepositoryBody,
  type WorkspaceParams,
  createRepositoryBodySchema,
  githubCallbackBodySchema,
  githubInitiateResponseSchema,
  integrationConnectionResponseSchema,
  repositoryListResponseSchema,
  repositoryParamsSchema,
  repositoryResponseSchema,
  repositorySyncResponseSchema,
  updateRepositoryBodySchema,
  workspaceParamsSchema,
} from "./repository.schema";
import { RepositoryService } from "./repository.service";

export const repositoryRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/workspaces/:workspaceId/repositories",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: workspaceParamsSchema })],
      schema: {
        tags: ["Repositories"],
        summary: "List repositories in a workspace",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: repositoryListResponseSchema,
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
      const repositoryService = new RepositoryService(app);
      const repositories = await repositoryService.listRepositories({
        workspaceId: params.workspaceId,
        userId: currentUser.id,
      });

      return {
        data: repositories.map((repository) =>
          repositoryService.serializeRepository(repository),
        ),
      };
    },
  );

  app.post(
    "/workspaces/:workspaceId/repositories",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({
          params: workspaceParamsSchema,
          body: createRepositoryBodySchema,
        }),
      ],
      schema: {
        tags: ["Repositories"],
        summary: "Create a repository record in a workspace",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              201: repositoryResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(workspaceParamsSchema),
        body: jsonSchemaFromZod(createRepositoryBodySchema),
      },
    },
    async (request, reply) => {
      const params = request.params as WorkspaceParams;
      const body = request.body as CreateRepositoryBody;
      const currentUser = request.currentUser!;
      const repositoryService = new RepositoryService(app);
      const repository = await repositoryService.createRepository({
        workspaceId: params.workspaceId,
        userId: currentUser.id,
        provider: body.provider,
        owner: body.owner,
        name: body.name,
        url: body.url,
        defaultBranch: body.defaultBranch,
        connectionStatus: body.connectionStatus,
        metadata: body.metadata,
      });

      return reply.status(201).send({
        data: repositoryService.serializeRepository(repository),
      });
    },
  );

  app.get(
    "/workspaces/:workspaceId/repositories/:repositoryId",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: repositoryParamsSchema })],
      schema: {
        tags: ["Repositories"],
        summary: "Get a repository in a workspace",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: repositoryResponseSchema,
            },
            [400, 401, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(repositoryParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as RepositoryParams;
      const currentUser = request.currentUser!;
      const repositoryService = new RepositoryService(app);
      const repository = await repositoryService.getRepository({
        workspaceId: params.workspaceId,
        repositoryId: params.repositoryId,
        userId: currentUser.id,
      });

      return {
        data: repositoryService.serializeRepository(repository),
      };
    },
  );

  app.patch(
    "/workspaces/:workspaceId/repositories/:repositoryId",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({
          params: repositoryParamsSchema,
          body: updateRepositoryBodySchema,
        }),
      ],
      schema: {
        tags: ["Repositories"],
        summary: "Update a repository in a workspace",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: repositoryResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(repositoryParamsSchema),
        body: jsonSchemaFromZod(updateRepositoryBodySchema),
      },
    },
    async (request) => {
      const params = request.params as RepositoryParams;
      const body = request.body as UpdateRepositoryBody;
      const currentUser = request.currentUser!;
      const repositoryService = new RepositoryService(app);
      const repository = await repositoryService.updateRepository({
        workspaceId: params.workspaceId,
        repositoryId: params.repositoryId,
        userId: currentUser.id,
        owner: body.owner,
        name: body.name,
        url: body.url,
        defaultBranch: body.defaultBranch,
        branch: body.branch,
        connectionStatus: body.connectionStatus,
        lastScannedAt: body.lastScannedAt,
        metadata: body.metadata,
      });

      return {
        data: repositoryService.serializeRepository(repository),
      };
    },
  );

  app.delete(
    "/workspaces/:workspaceId/repositories/:repositoryId",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: repositoryParamsSchema })],
      schema: {
        tags: ["Repositories"],
        summary: "Soft delete a repository from a workspace",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              204: { type: "null" },
            },
            [400, 401, 403, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(repositoryParamsSchema),
      },
    },
    async (request, reply) => {
      const params = request.params as RepositoryParams;
      const currentUser = request.currentUser!;
      const repositoryService = new RepositoryService(app);

      await repositoryService.deleteRepository({
        workspaceId: params.workspaceId,
        repositoryId: params.repositoryId,
        userId: currentUser.id,
      });

      return reply.status(204).send();
    },
  );

  app.post(
    "/workspaces/:workspaceId/integrations/github/initiate",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: workspaceParamsSchema })],
      schema: {
        tags: ["Integrations"],
        summary: "Initiate a GitHub connection",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: githubInitiateResponseSchema,
            },
            [400, 401, 403, 404, 500],
          ),
        },
        params: jsonSchemaFromZod(workspaceParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as WorkspaceParams;
      const currentUser = request.currentUser!;
      const repositoryService = new RepositoryService(app);

      return {
        data: await repositoryService.initiateGithubConnection({
          workspaceId: params.workspaceId,
          userId: currentUser.id,
        }),
      };
    },
  );

  app.post(
    "/workspaces/:workspaceId/integrations/github/callback",
    {
      preHandler: [
        app.authenticate,
        zodValidationPreHandler({
          params: workspaceParamsSchema,
          body: githubCallbackBodySchema,
        }),
      ],
      schema: {
        tags: ["Integrations"],
        summary: "Handle a GitHub OAuth callback",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: integrationConnectionResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(workspaceParamsSchema),
        body: jsonSchemaFromZod(githubCallbackBodySchema),
      },
    },
    async (request) => {
      const params = request.params as WorkspaceParams;
      const body = request.body as GithubCallbackBody;
      const currentUser = request.currentUser!;
      const repositoryService = new RepositoryService(app);
      const connection = await repositoryService.handleGithubCallback({
        workspaceId: params.workspaceId,
        userId: currentUser.id,
        code: body.code,
        state: body.state,
      });

      return {
        data: repositoryService.serializeIntegrationConnection(connection),
      };
    },
  );

  app.post(
    "/workspaces/:workspaceId/integrations/github/sync",
    {
      preHandler: [app.authenticate, zodValidationPreHandler({ params: workspaceParamsSchema })],
      schema: {
        tags: ["Integrations"],
        summary: "Sync repositories from the active GitHub connection",
        security: [{ bearerAuth: [] }],
        response: {
          ...withStandardErrorResponses(
            {
              200: repositorySyncResponseSchema,
            },
            [400, 401, 403, 404, 409, 500],
          ),
        },
        params: jsonSchemaFromZod(workspaceParamsSchema),
      },
    },
    async (request) => {
      const params = request.params as WorkspaceParams;
      const currentUser = request.currentUser!;
      const repositoryService = new RepositoryService(app);
      const result = await repositoryService.syncGithubRepositories({
        workspaceId: params.workspaceId,
        userId: currentUser.id,
      });

      return {
        data: {
          connection: repositoryService.serializeIntegrationConnection(
            result.connection,
          ),
          repositories: result.repositories.map((repository) =>
            repositoryService.serializeRepository(repository),
          ),
        },
      };
    },
  );
};
