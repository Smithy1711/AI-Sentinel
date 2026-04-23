import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import {
  clearAccessToken,
  getAccessToken,
  persistAccessToken,
} from "@/lib/auth";
import type { User, WorkspaceMembership, WorkspaceSummary } from "@/types";

type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionContextValue {
  status: SessionStatus;
  isAuthenticated: boolean;
  accessToken: string | null;
  user: User | null;
  activeWorkspace: WorkspaceSummary | null;
  workspaces: WorkspaceMembership[];
  signIn(input: { email: string; password: string }): Promise<void>;
  signUp(input: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<void>;
  signOut(): void;
  refreshSession(): Promise<void>;
  createWorkspace(input: {
    name: string;
    slug?: string;
    description?: string;
  }): Promise<void>;
  selectWorkspace(workspaceId: string): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function loadSessionData(token: string) {
  const [currentUser, workspaces] = await Promise.all([
    api.auth.me(token),
    api.workspaces.list(token),
  ]);

  return {
    user: currentUser.user,
    activeWorkspace: currentUser.activeWorkspace,
    workspaces,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessToken());
  const [user, setUser] = useState<User | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);

  const resetSession = () => {
    clearAccessToken();
    setAccessToken(null);
    setUser(null);
    setActiveWorkspace(null);
    setWorkspaces([]);
    setStatus("anonymous");
    queryClient.clear();
  };

  const hydrateSession = async (token: string) => {
    setStatus("loading");

    try {
      const session = await loadSessionData(token);
      setAccessToken(token);
      setUser(session.user);
      setActiveWorkspace(session.activeWorkspace);
      setWorkspaces(session.workspaces);
      setStatus("authenticated");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        resetSession();
        return;
      }

      throw error;
    }
  };

  useEffect(() => {
    if (!accessToken) {
      setStatus("anonymous");
      return;
    }

    void hydrateSession(accessToken);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      isAuthenticated: status === "authenticated",
      accessToken,
      user,
      activeWorkspace,
      workspaces,
      async signIn(input) {
        const result = await api.auth.login(input);
        persistAccessToken(result.accessToken);
        await hydrateSession(result.accessToken);
      },
      async signUp(input) {
        const result = await api.auth.signup(input);
        persistAccessToken(result.accessToken);
        await hydrateSession(result.accessToken);
      },
      signOut() {
        resetSession();
      },
      async refreshSession() {
        if (!accessToken) {
          resetSession();
          return;
        }

        await hydrateSession(accessToken);
      },
      async createWorkspace(input) {
        if (!accessToken) {
          throw new ApiError("Authentication required.", 401);
        }

        await api.workspaces.create(accessToken, input);
        await hydrateSession(accessToken);
        await queryClient.invalidateQueries();
      },
      async selectWorkspace(workspaceId) {
        if (!accessToken) {
          throw new ApiError("Authentication required.", 401);
        }

        await api.workspaces.select(accessToken, workspaceId);
        await hydrateSession(accessToken);
        await queryClient.invalidateQueries();
      },
    }),
    [accessToken, activeWorkspace, queryClient, status, user, workspaces],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider.");
  }

  return context;
}
