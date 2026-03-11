FROM oven/bun:1-debian AS base
WORKDIR /app

# Install Playwright Chromium + system deps
COPY package.json bun.lock* ./
RUN bun install && bunx playwright install --with-deps chromium

COPY src ./src
COPY tsconfig.json ./

CMD ["bun", "run", "src/index.ts"]
