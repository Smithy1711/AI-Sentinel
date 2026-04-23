import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationConnectionStatus, IntegrationProviderType } from "@prisma/client";
import { createTestEnv } from "../../../test/test-env";
import { GitHubProviderAdapter } from "./github.adapter";

describe("GitHubProviderAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a real OAuth authorization URL with PKCE", async () => {
    const adapter = new GitHubProviderAdapter(
      createTestEnv({
        GITHUB_USE_MOCK: false,
        GITHUB_CLIENT_ID: "client_123",
      }),
    );

    const result = await adapter.getAuthorizationUrl({
      workspaceId: "workspace_1",
      userId: "user_1",
      state: "state_123",
      codeChallenge: "challenge_123",
      codeChallengeMethod: "S256",
    });

    const url = new URL(result.authorizationUrl);
    expect(result.state).toBe("state_123");
    expect(url.origin).toBe("https://github.com");
    expect(url.pathname).toBe("/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client_123");
    expect(url.searchParams.get("scope")).toBe("repo read:user");
    expect(url.searchParams.get("state")).toBe("state_123");
    expect(url.searchParams.get("code_challenge")).toBe("challenge_123");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("exchanges a code and hydrates the connected GitHub account", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "gho_secret",
            token_type: "bearer",
            scope: "repo,read:user",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 42,
            login: "octocat",
            name: "The Octocat",
            avatar_url: "https://avatars.githubusercontent.com/u/42",
            html_url: "https://github.com/octocat",
            type: "User",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const adapter = new GitHubProviderAdapter(
      createTestEnv({
        GITHUB_USE_MOCK: false,
        GITHUB_CLIENT_ID: "client_123",
        GITHUB_CLIENT_SECRET: "secret_123secret_123secret_123secret_123",
      }),
    );

    const result = await adapter.exchangeCodeForConnection({
      workspaceId: "workspace_1",
      state: "state_123",
      code: "code_123",
      codeVerifier: "verifier_123",
    });

    expect(result.accessToken).toBe("gho_secret");
    expect(result.externalAccountId).toBe("42");
    expect(result.externalAccountLogin).toBe("octocat");
    expect(result.scopes).toEqual(["repo", "read:user"]);
    expect(result.providerMetadata).toMatchObject({
      accountType: "User",
      tokenType: "bearer",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL("https://github.com/login/oauth/access_token"),
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("lists and normalizes authenticated repositories", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 1,
              node_id: "node_1",
              name: "platform-api",
              full_name: "acme/platform-api",
              html_url: "https://github.com/acme/platform-api",
              private: true,
              default_branch: "main",
              owner: { login: "acme", type: "Organization" },
              language: "TypeScript",
              visibility: "private",
              permissions: { admin: false, push: true, pull: true },
              updated_at: "2026-04-20T00:00:00Z",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const adapter = new GitHubProviderAdapter(
      createTestEnv({
        GITHUB_USE_MOCK: false,
      }),
    );

    const repositories = await adapter.listRepositories({
      workspaceId: "workspace_1",
      accessToken: "gho_secret",
      connection: {
        id: "connection_1",
        workspaceId: "workspace_1",
        connectedByUserId: "user_1",
        provider: IntegrationProviderType.GITHUB,
        status: IntegrationConnectionStatus.ACTIVE,
        displayName: "Acme",
        externalAccountId: "42",
        externalAccountLogin: "acme",
        installationId: null,
        encryptedAccessToken: "encrypted",
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
        scopes: ["repo"],
        providerMetadata: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    });

    expect(repositories).toHaveLength(1);
    expect(repositories[0]).toMatchObject({
      externalId: "1",
      owner: "acme",
      fullName: "acme/platform-api",
      defaultBranch: "main",
    });
  });

  it("maps revoked-token responses to a reconnect error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Bad credentials" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const adapter = new GitHubProviderAdapter(
      createTestEnv({
        GITHUB_USE_MOCK: false,
      }),
    );

    await expect(
      adapter.listRepositories({
        workspaceId: "workspace_1",
        accessToken: "gho_secret",
        connection: {
          id: "connection_1",
          workspaceId: "workspace_1",
          connectedByUserId: "user_1",
          provider: IntegrationProviderType.GITHUB,
          status: IntegrationConnectionStatus.ACTIVE,
          displayName: "Acme",
          externalAccountId: "42",
          externalAccountLogin: "acme",
          installationId: null,
          encryptedAccessToken: "encrypted",
          encryptedRefreshToken: null,
          tokenExpiresAt: null,
          scopes: ["repo"],
          providerMetadata: null,
          lastSyncedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      }),
    ).rejects.toMatchObject({
      code: "GITHUB_CONNECTION_REVOKED",
    });
  });
});
