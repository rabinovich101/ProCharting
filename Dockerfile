FROM node:22-bookworm-slim AS deps

WORKDIR /app/TEST/binance-chart-test

COPY TEST/binance-chart-test/package.json TEST/binance-chart-test/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build

WORKDIR /app/TEST/binance-chart-test
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/TEST/binance-chart-test/node_modules ./node_modules
COPY TEST/binance-chart-test ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/TEST/binance-chart-test/.next ./.next
COPY --from=build /app/TEST/binance-chart-test/node_modules ./node_modules
COPY --from=build /app/TEST/binance-chart-test/next.config.ts ./next.config.ts
COPY --from=build /app/TEST/binance-chart-test/package.json ./package.json
COPY --from=build /app/TEST/binance-chart-test/public ./public

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
