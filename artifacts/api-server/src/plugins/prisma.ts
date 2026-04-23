import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import fp from "fastify-plugin";

export type PrismaClientLike = PrismaClient;

interface PrismaPluginOptions {
  client?: PrismaClientLike;
}

export const prismaPlugin = fp<PrismaPluginOptions>(async (app, options) => {
  const client =
    options.client ??
    new PrismaClient({
      adapter: new PrismaPg({
        connectionString: app.config.DATABASE_URL,
      }),
    });

  if (options.client === undefined) {
    await client.$connect();
  }

  app.decorate("prisma", client);

  app.addHook("onClose", async () => {
    if (typeof client.$disconnect === "function") {
      await client.$disconnect();
    }
  });
});
