# Сборка monorepo (API + кабинет + виджет)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/cabinet/package.json ./packages/cabinet/
COPY packages/embed/package.json ./packages/embed/

# postinstall собирает shared — исходники ещё не скопированы
RUN npm ci --ignore-scripts

COPY packages ./packages
COPY turbo.json ./

RUN npm run build:prod
RUN cd packages/api && npx prisma generate

# Продакшен
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV SERVE_CABINET=true

RUN apk add --no-cache openssl wget

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma
COPY --from=builder /app/packages/api/package.json ./packages/api/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/embed/dist ./packages/embed/dist
COPY --from=builder /app/packages/cabinet/dist ./packages/cabinet/dist

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

WORKDIR /app/packages/api

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
