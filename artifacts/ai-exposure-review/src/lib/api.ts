import type {
  Assessment,
  AssessmentRun,
  DashboardLatestRuns,
  DashboardOverview,
  DashboardRecentActivity,
  DashboardRecentReports,
  Finding,
  FindingAggregate,
  FindingCategory,
  FindingStatus,
  IntegrationConnection,
  Report,
  Repository,
  Severity,
  User,
  WorkspaceMembership,
  WorkspaceSummary,
  Confidence,
} from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiEnvelope<T> = {
  data: T;
};

const API_PREFIX = "/api/v1";

function getApiRoot() {
  const configured = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

  if (!configured) {
    return API_PREFIX;
  }

  if (configured.endsWith(API_PREFIX)) {
    return configured;
  }

  return `${configured}${API_PREFIX}`;
}

function buildUrl(path: string, query?: Record<string, string | undefined>) {
  const url = new URL(`${getApiRoot()}${path}`, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  if (/^https?:/i.test(getApiRoot())) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as ApiEnvelope<T> | { message?: string; code?: string }) : null;

  if (!response.ok) {
    throw new ApiError(
      (payload && "message" in payload && payload.message) || "Request failed.",
      response.status,
      payload && "code" in payload ? payload.code : undefined,
    );
  }

  if (!payload || !("data" in payload)) {
    throw new ApiError("Malformed API response.", response.status);
  }

  return payload.data;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    token?: string | null;
    body?: unknown;
    query?: Record<string, string | undefined>;
  } = {},
) {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  return parseResponse<T>(response);
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface CurrentUserResponse {
  user: User;
  activeWorkspace: WorkspaceSummary | null;
}

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  description?: string;
}

export interface CreateRepositoryInput {
  provider: Repository["provider"];
  owner: string;
  name: string;
  url?: string;
  defaultBranch?: string;
}

export interface CreateAssessmentInput {
  name: string;
  description?: string;
  repositoryId?: string | null;
  branch?: string | null;
  stagingUrl?: string | null;
  credentialsPlaceholder?: string | null;
  aiProvider?: string | null;
  aiArchitectureType?: Assessment["configuration"]["aiArchitectureType"];
  selectedScopeChecks?: string[];
  scopeSettings?: Record<string, unknown> | null;
}

export interface FindingFilters {
  severity?: Severity[];
  category?: FindingCategory[];
  status?: FindingStatus[];
  confidence?: Confidence[];
}

export const api = {
  auth: {
    signup(input: { email: string; password: string; displayName?: string }) {
      return apiRequest<AuthResponse>("/auth/signup", {
        method: "POST",
        body: input,
      });
    },
    login(input: { email: string; password: string }) {
      return apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: input,
      });
    },
    me(token: string) {
      return apiRequest<CurrentUserResponse>("/auth/me", { token });
    },
  },
  workspaces: {
    list(token: string) {
      return apiRequest<WorkspaceMembership[]>("/workspaces", { token });
    },
    create(token: string, input: CreateWorkspaceInput) {
      return apiRequest<WorkspaceMembership>("/workspaces", {
        method: "POST",
        token,
        body: input,
      });
    },
    select(token: string, workspaceId: string) {
      return apiRequest<{ activeWorkspaceId: string; workspace: WorkspaceSummary }>(
        `/workspaces/${workspaceId}/select`,
        {
          method: "POST",
          token,
        },
      );
    },
  },
  dashboard: {
    overview(token: string) {
      return apiRequest<DashboardOverview>("/dashboard/overview", { token });
    },
    recentActivity(token: string) {
      return apiRequest<DashboardRecentActivity>("/dashboard/recent-activity", { token });
    },
    recentReports(token: string) {
      return apiRequest<DashboardRecentReports>("/dashboard/recent-reports", { token });
    },
    latestRuns(token: string) {
      return apiRequest<DashboardLatestRuns>("/dashboard/latest-runs", { token });
    },
  },
  repositories: {
    list(token: string, workspaceId: string) {
      return apiRequest<Repository[]>(`/workspaces/${workspaceId}/repositories`, { token });
    },
    create(token: string, workspaceId: string, input: CreateRepositoryInput) {
      return apiRequest<Repository>(`/workspaces/${workspaceId}/repositories`, {
        method: "POST",
        token,
        body: input,
      });
    },
    initiateGithub(token: string, workspaceId: string) {
      return apiRequest<{ provider: "GITHUB"; authorizationUrl: string; state: string }>(
        `/workspaces/${workspaceId}/integrations/github/initiate`,
        {
          method: "POST",
          token,
        },
      );
    },
    completeGithub(token: string, workspaceId: string, input: { code: string; state: string }) {
      return apiRequest<IntegrationConnection>(
        `/workspaces/${workspaceId}/integrations/github/callback`,
        {
          method: "POST",
          token,
          body: input,
        },
      );
    },
    syncGithub(token: string, workspaceId: string) {
      return apiRequest<{ connection: IntegrationConnection; repositories: Repository[] }>(
        `/workspaces/${workspaceId}/integrations/github/sync`,
        {
          method: "POST",
          token,
        },
      );
    },
  },
  assessments: {
    list(token: string, workspaceId: string) {
      return apiRequest<Assessment[]>(`/workspaces/${workspaceId}/assessments`, { token });
    },
    get(token: string, workspaceId: string, assessmentId: string) {
      return apiRequest<Assessment>(`/workspaces/${workspaceId}/assessments/${assessmentId}`, {
        token,
      });
    },
    create(token: string, workspaceId: string, input: CreateAssessmentInput) {
      return apiRequest<Assessment>(`/workspaces/${workspaceId}/assessments`, {
        method: "POST",
        token,
        body: input,
      });
    },
    launch(token: string, workspaceId: string, assessmentId: string) {
      return apiRequest<AssessmentRun>(
        `/workspaces/${workspaceId}/assessments/${assessmentId}/launch`,
        {
          method: "POST",
          token,
        },
      );
    },
    cancel(token: string, workspaceId: string, assessmentId: string) {
      return apiRequest<Assessment>(
        `/workspaces/${workspaceId}/assessments/${assessmentId}/cancel`,
        {
          method: "POST",
          token,
        },
      );
    },
    activity(token: string, workspaceId: string, assessmentId: string) {
      return apiRequest<{ workspaceId: string; items: DashboardRecentActivity["items"] }>(
        `/workspaces/${workspaceId}/assessments/${assessmentId}/activity`,
        { token },
      );
    },
  },
  runs: {
    get(token: string, workspaceId: string, assessmentRunId: string) {
      return apiRequest<AssessmentRun>(
        `/workspaces/${workspaceId}/assessment-runs/${assessmentRunId}`,
        { token },
      );
    },
  },
  findings: {
    listForAssessment(
      token: string,
      workspaceId: string,
      assessmentId: string,
      filters: FindingFilters = {},
    ) {
      return apiRequest<Finding[]>(
        `/workspaces/${workspaceId}/assessments/${assessmentId}/findings`,
        {
          token,
          query: {
            severity: filters.severity?.join(","),
            category: filters.category?.join(","),
            status: filters.status?.join(","),
            confidence: filters.confidence?.join(","),
          },
        },
      );
    },
    aggregateForAssessment(
      token: string,
      workspaceId: string,
      assessmentId: string,
      filters: FindingFilters = {},
    ) {
      return apiRequest<FindingAggregate>(
        `/workspaces/${workspaceId}/assessments/${assessmentId}/findings/aggregates`,
        {
          token,
          query: {
            severity: filters.severity?.join(","),
            category: filters.category?.join(","),
            status: filters.status?.join(","),
            confidence: filters.confidence?.join(","),
          },
        },
      );
    },
    updateStatus(
      token: string,
      workspaceId: string,
      findingId: string,
      status: FindingStatus,
    ) {
      return apiRequest<Finding>(`/workspaces/${workspaceId}/findings/${findingId}/status`, {
        method: "PATCH",
        token,
        body: { status },
      });
    },
  },
  reports: {
    async latest(token: string, workspaceId: string, assessmentId: string) {
      try {
        return await apiRequest<Report>(
          `/workspaces/${workspaceId}/assessments/${assessmentId}/reports/latest`,
          { token },
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    generate(token: string, workspaceId: string, assessmentId: string) {
      return apiRequest<Report>(
        `/workspaces/${workspaceId}/assessments/${assessmentId}/reports/generate`,
        {
          method: "POST",
          token,
        },
      );
    },
    getById(token: string, workspaceId: string, reportId: string) {
      return apiRequest<Report>(`/workspaces/${workspaceId}/reports/${reportId}`, {
        token,
      });
    },
  },
};
