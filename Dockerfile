# syntax=docker/dockerfile:1.6

FROM node:20-bullseye-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM node:20-bullseye-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ENV NODE_ENV=production
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js ./
COPY components.json ./components.json
COPY drizzle.config.ts ./drizzle.config.ts
COPY shared ./shared
COPY client ./client
COPY server ./server
COPY attached_assets ./attached_assets
RUN --mount=type=bind,source=.,target=/src,ro \
    if [ -d /src/migrations ]; then cp -R /src/migrations ./migrations; else mkdir -p ./migrations; fi
RUN npm run build

FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json ./
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/shared ./shared
# Copy migrations if they exist in the build context
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/tsconfig.json ./tsconfig.json

CMD ["node", "dist/index.js"]
