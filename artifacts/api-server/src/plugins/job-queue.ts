import { randomUUID } from "node:crypto";
import fp from "fastify-plugin";

export interface BackgroundJob<TPayload = unknown> {
  id: string;
  name: string;
  payload: TPayload;
  queuedAt: Date;
}

export type BackgroundJobProcessor<TPayload = unknown> = (
  job: BackgroundJob<TPayload>,
) => Promise<void>;

export interface BackgroundJobQueue {
  enqueue<TPayload>(
    name: string,
    payload: TPayload,
  ): Promise<Pick<BackgroundJob<TPayload>, "id">>;
  registerProcessor<TPayload>(
    name: string,
    processor: BackgroundJobProcessor<TPayload>,
  ): void;
  close?(): Promise<void> | void;
}

export class InMemoryBackgroundJobQueue implements BackgroundJobQueue {
  private readonly processors = new Map<
    string,
    BackgroundJobProcessor<unknown>
  >();

  async enqueue<TPayload>(
    name: string,
    payload: TPayload,
  ): Promise<Pick<BackgroundJob<TPayload>, "id">> {
    const job: BackgroundJob<TPayload> = {
      id: randomUUID(),
      name,
      payload,
      queuedAt: new Date(),
    };

    queueMicrotask(() => {
      void this.dispatch(job);
    });

    return { id: job.id };
  }

  registerProcessor<TPayload>(
    name: string,
    processor: BackgroundJobProcessor<TPayload>,
  ): void {
    this.processors.set(
      name,
      processor as BackgroundJobProcessor<unknown>,
    );
  }

  async close(): Promise<void> {
    this.processors.clear();
  }

  private async dispatch(job: BackgroundJob<unknown>) {
    const processor = this.processors.get(job.name);

    if (!processor) {
      return;
    }

    await processor(job);
  }
}

interface JobQueuePluginOptions {
  queue?: BackgroundJobQueue;
}

export const jobQueuePlugin = fp<JobQueuePluginOptions>(async (app, options) => {
  const queue = options.queue ?? new InMemoryBackgroundJobQueue();

  app.decorate("jobQueue", queue);

  app.addHook("onClose", async () => {
    if (typeof queue.close === "function") {
      await queue.close();
    }
  });
});
