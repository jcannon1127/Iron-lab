FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy package files AND patches directory (patches must exist before pnpm install)
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install all dependencies (patches/ must be present for frozen-lockfile)
RUN pnpm install --frozen-lockfile

# Copy rest of source
COPY . .

# Build frontend + bundle server
RUN pnpm run build

# Expose port
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
