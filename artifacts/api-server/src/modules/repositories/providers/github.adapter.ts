import { randomUUID } from "node:crypto";
import type { IntegrationConnection } from "@prisma/client";
import type { AppEnv } from "../../../config/env";
import { AppError } from "../../../lib/errors";
import type {
  ProviderAuthorizationRequest,
  ProviderAuthorizationResult,
  ProviderConnectionResult,
  ProviderRepositoryRecord,
  ProviderTokenRefreshResult,
  RepositoryProviderAdapter,
} from "./provider-adapter";

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string;
  html_url?: string;
  type?: string;
}

interface GitHubRepositoryResponse {
  id: number;
  node_id?: string;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch?: string;
  archived?: boolean;
  disabled?: boolean;
  owner?: {
    login?: string;
    type?: string;
  };
  language?: string | null;
  visibility?: string;
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
  updated_at?: string;
}

export class GitHubProviderAdapter implements RepositoryProviderAdapter {
  readonly provider = "GITHUB" as const;

  constructor(private readonly env: AppEnv) {}

  private get isMockMode(): boolean {
    return this.env.GITHUB_USE_MOCK;
  }

  async getAuthorizationUrl(
    input: ProviderAuthorizationRequest,
  ): Promise<ProviderAuthorizationResult> {
    const state = input.state ?? randomUUID();
    const authorizationUrl = new URL("/login/oauth/authorize", this.env.GITHUB_BASE_URL);
    authorizationUrl.searchParams.set("client_id", this.env.GITHUB_CLIENT_ID || "mock-client-id");
    authorizationUrl.searchParams.set("redirect_uri", this.env.GITHUB_REDIRECT_URI);
    authorizationUrl.searchParams.set("scope", this.env.GITHUB_OAUTH_SCOPES);
    authorizationUrl.searchParams.set("state", state);

    if (input.codeChallenge) {
      authorizationUrl.searchParams.set("code_challenge", input.codeChallenge);
      authorizationUrl.searchParams.set(
        "code_challenge_method",
        input.codeChallengeMethod ?? "S256",
      );
    }

    if (this.isMockMode) {
      authorizationUrl.searchParams.set("mock_workspace_id", input.workspaceId);
      authorizationUrl.searchParams.set("mock_user_id", input.userId);
    }

    return {
      authorizationUrl: authorizationUrl.toString(),
      state,
    };
  }

  async exchangeCodeForConnection(input: {
    code: string;
    state: string;
    workspaceId: string;
    codeVerifier?: string;
  }): Promise<ProviderConnectionResult> {
    if (this.isMockMode) {
      return {
        accessToken: `mock-token-${input.code}`,
        externalAccountId: `github-account-${input.workspaceId}`,
        externalAccountLogin: "mock-org",
        displayName: "Mock GitHub Org",
        refreshToken: null,
        tokenExpiresAt: null,
        scopes: this.env.GITHUB_OAUTH_SCOPES.split(/\s+/),
        installationId: null,
        providerMetadata: {
          state: input.state,
          mode: "mock",
          tokenType: "bearer",
        },
      };
    }

    const tokenResponse = await this.exchangeAuthorizationCode(input);
    const user = await this.fetchAuthenticatedUser(tokenResponse.accessToken);

    return {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      tokenExpiresAt: tokenResponse.tokenExpiresAt,
      scopes: tokenResponse.scopes,
      externalAccountId: String(user.id),
      externalAccountLogin: user.login,
      displayName: user.name ?? user.login,
      installationId: null,
      providerMetadata: {
        avatarUrl: user.avatar_url ?? null,
        htmlUrl: user.html_url ?? null,
        accountType: user.type ?? null,
        tokenType: tokenResponse.tokenType,
      },
    };
  }

  async refreshAccessToken(input: {
    refreshToken: string;
  }): Promise<ProviderTokenRefreshResult> {
    if (this.isMockMode) {
      return {
        accessToken: `mock-refreshed-${input.refreshToken}`,
        refreshToken: input.refreshToken,
        tokenExpiresAt: null,
        scopes: this.env.GITHUB_OAUTH_SCOPES.split(/\s+/),
        providerMetadata: {
          mode: "mock",
          refreshed: true,
        },
      };
    }

    const body = new URLSearchParams({
      client_id: this.env.GITHUB_CLIENT_ID,
      client_secret: this.env.GITHUB_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
    });

    const response = await fetch(new URL("/login/oauth/access_token", this.env.GITHUB_BASE_URL), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const tokenPayload = (await response.json()) as GitHubTokenResponse;

    if (!response.ok || tokenPayload.error || !tokenPayload.access_token) {
      throw this.mapTokenExchangeError(tokenPayload, response.status);
    }

    return {
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token ?? null,
      tokenExpiresAt: calculateExpiry(tokenPayload.expires_in),
      scopes: splitScopes(tokenPayload.scope),
      providerMetadata: {
        tokenType: tokenPayload.token_type ?? "bearer",
        refreshed: true,
      },
    };
  }

  async listRepositories(input: {
    connection: IntegrationConnection;
    workspaceId: string;
    accessToken: string;
  }): Promise<ProviderRepositoryRecord[]> {
    if (this.isMockMode) {
      const owner = input.connection.externalAccountLogin ?? "mock-org";

      return [
        {
          externalId: `${input.workspaceId}-repo-1`,
          owner,
          name: "ai-exposure-review-api",
          fullName: `${owner}/ai-exposure-review-api`,
          url: `https://github.com/${owner}/ai-exposure-review-api`,
          defaultBranch: "main",
          isPrivate: true,
          metadata: {
            language: "TypeScript",
            visibility: "private",
            mode: "mock",
          },
        },
      ];
    }

    const repositories: ProviderRepositoryRecord[] = [];
    let page = 1;

    while (true) {
      const endpoint = new URL("/user/repos", this.env.GITHUB_API_BASE_URL);
      endpoint.searchParams.set("per_page", "100");
      endpoint.searchParams.set("page", String(page));
      endpoint.searchParams.set("sort", "updated");
      endpoint.searchParams.set("visibility", "all");
      endpoint.searchParams.set("affiliation", "owner,collaborator,organization_member");

      const response = await fetch(endpoint, {
        headers: this.buildApiHeaders(input.accessToken),
      });

      if (response.status === 401) {
        throw new AppError(
          409,
          "GITHUB_CONNECTION_REVOKED",
          "The GitHub connection is no longer authorized. Reconnect GitHub and try again.",
        );
      }

      if (response.status === 403) {
        const payload = await safeJson(response);
        throw new AppError(
          403,
          "GITHUB_PERMISSION_DENIED",
          "GitHub denied repository access for this connection.",
          payload,
        );
      }

      if (!response.ok) {
        const payload = await safeJson(response);
        throw new AppError(
          502,
          "GITHUB_API_ERROR",
          "GitHub repository sync failed.",
          payload,
        );
      }

      const pageRepositories = (await response.json()) as GitHubRepositoryResponse[];

      repositories.push(
        ...pageRepositories
          .filter((repository) => !repository.archived && !repository.disabled)
          .map((repository) => ({
            externalId: String(repository.id),
            owner:
              repository.owner?.login ?? repository.full_name.split("/")[0] ?? "unknown",
            name: repository.name,
            fullName: repository.full_name,
            url: repository.html_url,
            defaultBranch: repository.default_branch ?? null,
            isPrivate: repository.private,
            metadata: {
              githubNodeId: repository.node_id ?? null,
              ownerType: repository.owner?.type ?? null,
              language: repository.language ?? null,
              visibility: repository.visibility ?? null,
              permissions: repository.permissions ?? null,
              updatedAt: repository.updated_at ?? null,
            },
          })),
      );

      if (pageRepositories.length < 100) {
        break;
      }

      page += 1;
    }

    return repositories;
  }

  private async exchangeAuthorizationCode(input: {
    code: string;
    codeVerifier?: string;
  }) {
    const body = new URLSearchParams({
      client_id: this.env.GITHUB_CLIENT_ID,
      client_secret: this.env.GITHUB_CLIENT_SECRET,
      code: input.code,
      redirect_uri: this.env.GITHUB_REDIRECT_URI,
    });

    if (input.codeVerifier) {
      body.set("code_verifier", input.codeVerifier);
    }

    const response = await fetch(new URL("/login/oauth/access_token", this.env.GITHUB_BASE_URL), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const tokenPayload = (await response.json()) as GitHubTokenResponse;

    if (!response.ok || tokenPayload.error || !tokenPayload.access_token) {
      throw this.mapTokenExchangeError(tokenPayload, response.status);
    }

    return {
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token ?? null,
      tokenType: tokenPayload.token_type ?? "bearer",
      scopes: splitScopes(tokenPayload.scope),
      tokenExpiresAt: calculateExpiry(tokenPayload.expires_in),
    };
  }

  private async fetchAuthenticatedUser(accessToken: string) {
    const response = await fetch(new URL("/user", this.env.GITHUB_API_BASE_URL), {
      headers: this.buildApiHeaders(accessToken),
    });

    if (response.status === 401) {
      throw new AppError(
        409,
        "GITHUB_CONNECTION_REVOKED",
        "The GitHub connection is no longer authorized. Reconnect GitHub and try again.",
      );
    }

    if (response.status === 403) {
      const payload = await safeJson(response);
      throw new AppError(
        403,
        "GITHUB_PERMISSION_DENIED",
        "GitHub denied access to the authenticated account.",
        payload,
      );
    }

    if (!response.ok) {
      const payload = await safeJson(response);
      throw new AppError(
        502,
        "GITHUB_API_ERROR",
        "GitHub user lookup failed.",
        payload,
      );
    }

    return (await response.json()) as GitHubUserResponse;
  }

  private buildApiHeaders(accessToken: string) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": this.env.SERVICE_NAME,
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  private mapTokenExchangeError(
    payload: GitHubTokenResponse,
    statusCode: number,
  ): AppError {
    const message = payload.error_description ?? "GitHub token exchange failed.";

    if (payload.error === "bad_verification_code") {
      return new AppError(
        400,
        "GITHUB_AUTHORIZATION_CODE_INVALID",
        "The GitHub authorization code is invalid or expired.",
      );
    }

    if (payload.error === "incorrect_client_credentials") {
      return new AppError(
        503,
        "GITHUB_NOT_CONFIGURED",
        "GitHub integration credentials are invalid.",
      );
    }

    if (statusCode === 401) {
      return new AppError(
        409,
        "GITHUB_CONNECTION_REVOKED",
        "The GitHub connection is no longer authorized. Reconnect GitHub and try again.",
      );
    }

    return new AppError(
      502,
      "GITHUB_OAUTH_EXCHANGE_FAILED",
      message,
      payload.error ? { error: payload.error } : undefined,
    );
  }
}

function calculateExpiry(expiresInSeconds?: number): Date | null {
  if (!expiresInSeconds || expiresInSeconds <= 0) {
    return null;
  }

  return new Date(Date.now() + expiresInSeconds * 1000);
}

function splitScopes(scope: string | undefined): string[] {
  if (!scope) {
    return [];
  }

  return scope
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
