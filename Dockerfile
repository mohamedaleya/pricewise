FROM oven/bun:1-debian AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y libc6 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN bun run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

# Install Puppeteer's Chromium dependencies
# These are all the libraries required by Chromium to run headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and group
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Copy the public directory
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy node_modules for puppeteer (includes bundled Chromium)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Set Puppeteer cache directory to a location accessible by nextjs user
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# Copy Puppeteer's cached browser from deps stage
RUN mkdir -p /app/.cache && chown -R nextjs:nodejs /app/.cache
COPY --from=deps --chown=nextjs:nodejs /root/.cache/puppeteer /app/.cache/puppeteer

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["bun", "server.js"]