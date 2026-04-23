import type {
  IntegrationConnection,
  IntegrationProviderType,
} from "@prisma/client";

export interface ProviderAuthorizationRequest {
  workspaceId: string;
  userId: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: "S256";
}

export interface ProviderAuthorizationResult {
  authorizationUrl: string;
  state: string;
}

export interface ProviderConnectionResult {
  accessToken: string;
  externalAccountId: string;
  externalAccountLogin: string;
  displayName?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string[];
  installationId?: string | null;
  providerMetadata?: Record<string, unknown> | null;
}

export interface ProviderTokenRefreshResult {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string[];
  providerMetadata?: Record<string, unknown> | null;
}

export interface ProviderRepositoryRecord {
  externalId?: string | null;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch?: string | null;
  isPrivate?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface RepositoryProviderAdapter {
  readonly provider: IntegrationProviderType;
  getAuthorizationUrl(
    input: ProviderAuthorizationRequest,
  ): Promise<ProviderAuthorizationResult>;
  exchangeCodeForConnection(input: {
    code: string;
    state: string;
    workspaceId: string;
    codeVerifier?: string;
  }): Promise<ProviderConnectionResult>;
  refreshAccessToken?(input: {
    refreshToken: string;
  }): Promise<ProviderTokenRefreshResult>;
  listRepositories(input: {
    connection: IntegrationConnection;
    workspaceId: string;
    accessToken: string;
  }): Promise<ProviderRepositoryRecord[]>;
}
