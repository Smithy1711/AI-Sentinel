import type { IntegrationProviderType } from "@prisma/client";
import type { AppEnv } from "../../../config/env";
import { AppError } from "../../../lib/errors";
import { GitHubProviderAdapter } from "./github.adapter";
import type { RepositoryProviderAdapter } from "./provider-adapter";

export class RepositoryProviderRegistry {
  private readonly adapters: Map<IntegrationProviderType, RepositoryProviderAdapter>;

  constructor(env: AppEnv, adapters?: RepositoryProviderAdapter[]) {
    const resolvedAdapters =
      adapters ?? [new GitHubProviderAdapter(env)];

    this.adapters = new Map(
      resolvedAdapters.map((adapter) => [adapter.provider, adapter]),
    );
  }

  getAdapter(provider: IntegrationProviderType): RepositoryProviderAdapter {
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new AppError(
        501,
        "INTEGRATION_PROVIDER_NOT_IMPLEMENTED",
        `Provider ${provider} is not implemented.`,
      );
    }

    return adapter;
  }
}
