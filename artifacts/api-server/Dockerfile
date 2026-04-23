FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable
WORKDIR /app

FROM base AS dependencies

COPY package.json ./
RUN pnpm install

FROM dependencies AS development

COPY . .
EXPOSE 4000
CMD ["pnpm", "dev"]

FROM dependencies AS build

COPY . .
RUN pnpm build

FROM base AS production

ENV NODE_ENV=production

COPY package.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 4000
CMD ["pnpm", "start"]
