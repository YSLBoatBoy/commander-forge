FROM node:24-alpine

ARG APP_VERSION=dev

ENV NODE_ENV=production \
    PORT=8790 \
    DATA_DIR=/data \
    APP_VERSION=${APP_VERSION}

WORKDIR /app
COPY package.json ./
COPY server ./server
COPY public ./public

# Your collection, saved builds, settings and the card-data cache live here.
# On Unraid this is mapped to /mnt/user/appdata/commander-forge.
RUN mkdir -p /data
VOLUME /data

EXPOSE 8790
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8790/api/health > /dev/null || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "server/server.js"]
