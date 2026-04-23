/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PrismaClientLike } from "../../plugins/prisma";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { createTestEnv } from "../../test/test-env";

const testEnv = createTestEnv();

type UserRecord = {
  id: string;
  email: string;
  displayName: string | null;
  passwordHash: string | null;
  activeWorkspaceId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdByUserId: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type WorkspaceMemberRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  invitedByUserId: string | null;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type WorkspaceInvitationRecord = {
  id: string;
  workspaceId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  token: string;
  invitedByUserId: string | null;
  expiresAt: Date | null;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type AuditLogRecord = {
  id: string;
  workspaceId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

function createFakePrisma(): PrismaClientLike {
  let idCounter = 1;
  const now = () => new Date();
  const nextId = () => `test_${idCounter++}`;
  const users: UserRecord[] = [];
  const workspaces: WorkspaceRecord[] = [];
  const members: WorkspaceMemberRecord[] = [];
  const invitations: WorkspaceInvitationRecord[] = [];
  const auditLogs: AuditLogRecord[] = [];

  const findUserById = (id: string) => users.find((user) => user.id === id) ?? null;
  const findWorkspaceById = (id: string) =>
    workspaces.find((workspace) => workspace.id === id) ?? null;

  const mapCurrentUser = (user: UserRecord) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    activeWorkspaceId: user.activeWorkspaceId,
    isActive: user.isActive,
    deletedAt: user.deletedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    activeWorkspace: user.activeWorkspaceId
      ? (() => {
          const workspace = findWorkspaceById(user.activeWorkspaceId);

          return workspace
            ? {
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug,
              }
            : null;
        })()
      : null,
  });

  const prisma = {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    $queryRawUnsafe: async () => [{ result: 1 }],
    $transaction: async <T>(
      arg:
        | Promise<T>[]
        | ((tx: PrismaClientLike) => Promise<T>),
    ): Promise<T | unknown[]> => {
      if (typeof arg === "function") {
        return arg(prisma as unknown as PrismaClientLike);
      }

      return Promise.all(arg);
    },
    user: {
      findUnique: async ({ where, select }: any) => {
        const user =
          (where.email ? users.find((item) => item.email === where.email) : null) ??
          (where.id ? users.find((item) => item.id === where.id) : null);

        if (!user) {
          return null;
        }

        if (select?.passwordHash) {
          return {
            ...mapCurrentUser(user),
            passwordHash: user.passwordHash,
          };
        }

        if (select?.id && Object.keys(select).length === 1) {
          return { id: user.id };
        }

        return mapCurrentUser(user);
      },
      create: async ({ data }: any) => {
        const record: UserRecord = {
          id: nextId(),
          email: data.email,
          displayName: data.displayName ?? null,
          passwordHash: data.passwordHash ?? null,
          activeWorkspaceId: data.activeWorkspaceId ?? null,
          isActive: data.isActive ?? true,
          lastLoginAt: null,
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        users.push(record);
        return mapCurrentUser(record);
      },
      update: async ({ where, data, select }: any) => {
        const user = findUserById(where.id);

        if (!user) {
          throw new Error("User not found");
        }

        Object.assign(user, data, { updatedAt: now() });
        return select ? mapCurrentUser(user) : user;
      },
      upsert: async ({ where, update, create }: any) => {
        let user = users.find((item) => item.email === where.email) ?? null;

        if (user) {
          Object.assign(user, update, { updatedAt: now() });
          return user;
        }

        user = {
          id: nextId(),
          email: create.email,
          displayName: create.displayName ?? null,
          passwordHash: create.passwordHash ?? null,
          activeWorkspaceId: create.activeWorkspaceId ?? null,
          isActive: create.isActive ?? true,
          lastLoginAt: null,
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        users.push(user);
        return user;
      },
    },
    workspace: {
      findUnique: async ({ where, select }: any) => {
        const workspace = workspaces.find((item) => item.slug === where.slug) ?? null;

        if (!workspace) {
          return null;
        }

        return select?.id ? { id: workspace.id } : workspace;
      },
      create: async ({ data }: any) => {
        const workspace: WorkspaceRecord = {
          id: nextId(),
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          createdByUserId: data.createdByUserId ?? null,
          isArchived: false,
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        workspaces.push(workspace);
        return workspace;
      },
      upsert: async ({ where, update, create }: any) => {
        let workspace =
          workspaces.find((item) => item.slug === where.slug) ?? null;

        if (workspace) {
          Object.assign(workspace, update, { updatedAt: now() });
          return workspace;
        }

        workspace = {
          id: nextId(),
          name: create.name,
          slug: create.slug,
          description: create.description ?? null,
          createdByUserId: create.createdByUserId ?? null,
          isArchived: false,
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        workspaces.push(workspace);
        return workspace;
      },
    },
    workspaceMember: {
      findMany: async ({ where }: any) => {
        return members
          .filter((member) => {
            const workspace = findWorkspaceById(member.workspaceId);

            return (
              member.userId === where.userId &&
              member.deletedAt === where.deletedAt &&
              workspace?.deletedAt === where.workspace.deletedAt &&
              workspace?.isArchived === where.workspace.isArchived
            );
          })
          .map((member) => {
            const workspace = findWorkspaceById(member.workspaceId)!;

            return {
              role: member.role,
              joinedAt: member.joinedAt,
              workspace: {
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug,
                description: workspace.description,
                createdAt: workspace.createdAt,
                updatedAt: workspace.updatedAt,
              },
            };
          });
      },
      create: async ({ data }: any) => {
        const record: WorkspaceMemberRecord = {
          id: nextId(),
          workspaceId: data.workspaceId,
          userId: data.userId,
          role: data.role,
          invitedByUserId: data.invitedByUserId ?? null,
          joinedAt: now(),
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        members.push(record);
        return record;
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const member =
          members.find(
            (item) =>
              item.workspaceId === where.workspaceId_userId.workspaceId &&
              item.userId === where.workspaceId_userId.userId,
          ) ?? null;

        if (!member) {
          throw new Error("Membership not found");
        }

        const workspace = findWorkspaceById(member.workspaceId)!;

        return {
          role: member.role,
          joinedAt: member.joinedAt,
          workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            description: workspace.description,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
          },
        };
      },
      findFirst: async ({ where }: any) => {
        const member =
          members.find((item) => {
            const workspace = findWorkspaceById(item.workspaceId);

            return (
              item.userId === where.userId &&
              item.workspaceId === where.workspaceId &&
              item.deletedAt === where.deletedAt &&
              workspace?.deletedAt === where.workspace.deletedAt &&
              workspace?.isArchived === where.workspace.isArchived
            );
          }) ?? null;

        if (!member) {
          return null;
        }

        const workspace = findWorkspaceById(member.workspaceId)!;

        return {
          role: member.role,
          joinedAt: member.joinedAt,
          workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            description: workspace.description,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
          },
        };
      },
      upsert: async ({ where, update, create }: any) => {
        let member =
          members.find(
            (item) =>
              item.workspaceId === where.workspaceId_userId.workspaceId &&
              item.userId === where.workspaceId_userId.userId,
          ) ?? null;

        if (member) {
          Object.assign(member, update, { updatedAt: now() });
          return member;
        }

        member = {
          id: nextId(),
          workspaceId: create.workspaceId,
          userId: create.userId,
          role: create.role,
          invitedByUserId: create.invitedByUserId ?? null,
          joinedAt: now(),
          createdAt: now(),
          updatedAt: now(),
          deletedAt: null,
        };
        members.push(member);
        return member;
      },
    },
    workspaceInvitation: {
      findMany: async ({ where }: any) => {
        return invitations.filter(
          (item) =>
            item.workspaceId === where.workspaceId &&
            item.status === where.status &&
            item.deletedAt === where.deletedAt,
        );
      },
      deleteMany: async ({ where }: any) => {
        const remaining = invitations.filter(
          (item) =>
            !(
              item.workspaceId === where.workspaceId &&
              item.status === where.status &&
              item.email === where.email
            ),
        );
        invitations.splice(0, invitations.length, ...remaining);
        return { count: 0 };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const log: AuditLogRecord = {
          id: nextId(),
          workspaceId: data.workspaceId ?? null,
          actorUserId: data.actorUserId ?? null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId ?? null,
          metadata: data.metadata ?? null,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
          createdAt: now(),
        };
        auditLogs.push(log);
        return log;
      },
    },
  };

  return prisma as unknown as PrismaClientLike;
}

const appsToClose: Array<Awaited<ReturnType<typeof buildApp>>> = [];

afterEach(async () => {
  while (appsToClose.length > 0) {
    const app = appsToClose.pop();

    if (app) {
      await app.close();
    }
  }
});

describe("auth and workspace routes", () => {
  it("supports signup, login, me, workspace creation, listing, and selection", async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createFakePrisma(),
    });
    appsToClose.push(app);

    const signupResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        email: "owner@example.com",
        password: "Password123!",
        displayName: "Owner",
      },
    });

    expect(signupResponse.statusCode).toBe(201);
    const signupBody = signupResponse.json();
    expect(signupBody.data.user.email).toBe("owner@example.com");
    expect(signupBody.data.accessToken).toEqual(expect.any(String));

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "owner@example.com",
        password: "Password123!",
      },
    });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.json().data.accessToken as string;

    const createWorkspaceResponse = await app.inject({
      method: "POST",
      url: "/api/v1/workspaces",
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: "Acme Platform",
      },
    });

    expect(createWorkspaceResponse.statusCode).toBe(201);
    expect(createWorkspaceResponse.json().data.role).toBe("OWNER");

    const listWorkspacesResponse = await app.inject({
      method: "GET",
      url: "/api/v1/workspaces",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(listWorkspacesResponse.statusCode).toBe(200);
    expect(listWorkspacesResponse.json().data).toHaveLength(1);
    expect(listWorkspacesResponse.json().data[0].isActive).toBe(true);

    const workspaceId = listWorkspacesResponse.json().data[0].workspace.id as string;

    const meResponse = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json().data.user.activeWorkspaceId).toBe(workspaceId);

    const selectResponse = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspaceId}/select`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(selectResponse.statusCode).toBe(200);
    expect(selectResponse.json().data.activeWorkspaceId).toBe(workspaceId);
  });

  it("returns generic invalid credentials on failed login", async () => {
    const app = await buildApp({
      env: testEnv,
      prisma: createFakePrisma(),
    });
    appsToClose.push(app);

    await app.inject({
      method: "POST",
      url: "/api/v1/auth/signup",
      payload: {
        email: "owner@example.com",
        password: "Password123!",
      },
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "owner@example.com",
        password: "wrong-password",
      },
    });

    expect(loginResponse.statusCode).toBe(401);
    expect(loginResponse.json().error.code).toBe("INVALID_CREDENTIALS");
    expect(loginResponse.json().error.message).toBe(
      "Invalid email or password.",
    );
  });
});
