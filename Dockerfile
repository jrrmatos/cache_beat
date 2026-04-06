# -- build --
FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# -- runtime --
FROM node:24-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      ffmpeg \
      curl \
      ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
       -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/.output .output

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
