import dotenv from "dotenv";
import { buildApp } from "./app";
import {
  createEnv,
  EnvironmentValidationError,
  formatEnvIssues,
} from "./config/env";

dotenv.config();

async function start(): Promise<void> {
  let env;

  try {
    env = createEnv();
  } catch (error) {
    if (error instanceof EnvironmentValidationError) {
      console.error("Invalid environment configuration:");

      for (const issue of formatEnvIssues(error.issues)) {
        console.error(`- ${issue}`);
      }

      process.exit(1);
    }

    throw error;
  }

  const app = await buildApp({ env });
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    app.log.info({ signal }, "Shutting down server");

    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error, signal }, "Failed to shut down cleanly");
      process.exit(1);
    }
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });
    app.log.info(
      { host: env.HOST, port: env.PORT },
      "API server started successfully",
    );
  } catch (error) {
    app.log.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

void start();
