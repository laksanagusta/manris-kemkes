
## Docker Backend Build - Learnings

### Created Artifacts
- `backend/Dockerfile` - Multi-stage build (builder + runtime)
- `backend/.dockerignore` - Excludes secrets, binaries, test files
- `backend/entrypoint.sh` - Migration runner + server starter (executable mode)

### Key Implementation Details
1. **Builder Stage (golang:1.26-alpine)**:
   - Downloads golang-migrate v4.18.2 binary (linux-amd64)
   - Builds binary with `CGO_ENABLED=0 GOOS=linux` for Alpine compatibility
   - Compiles from `cmd/server/main.go` → `server` binary

2. **Runtime Stage (alpine:3.21)**:
   - Installs only `ca-certificates` (essential for OpenAI API HTTPS calls)
   - Creates non-root user `appuser` (uid/gid 1000)
   - Copies binary, migrate CLI, and migrations directory from builder
   - Sets ownership to non-root user for security

3. **Entrypoint Script**:
   - Runs migrations first: `migrate -path /app/migrations -database "$DATABASE_URL" up`
   - Then starts server: `exec /app/server`
   - Uses `set -e` for fail-fast error handling
   - Uses `exec` to replace shell process (proper signal handling)

### Image Size Expectations
- Alpine base: ~7MB
- Go binary: ~20-30MB (typical for Fiber apps)
- Migrate CLI: ~8MB
- Total: ~40-50MB (well under 100MB target)

### Security Best Practices Applied
- Non-root user execution
- Minimal Alpine base image
- No secrets or .env files in image
- Health check endpoint configured

### Database URL Requirement
Applications using this Dockerfile must provide `DATABASE_URL` environment variable at runtime.
Example: `DATABASE_URL=postgres://user:pass@host:5432/manris?sslmode=disable`


## Frontend Dockerfile Setup (2026-04-19)

### What was done
- Updated `frontend/next.config.ts` to add `output: "standalone"` to the Next.js config
- Created `frontend/Dockerfile` with 3-stage build process:
  - **deps stage**: Installs dependencies only (layer caching optimization)
  - **builder stage**: Copies dependencies, builds with `npm run build`, accepts `NEXT_PUBLIC_API_URL` as build ARG
  - **runner stage**: Copies `.next/standalone`, `.next/static`, `public`; runs as non-root `nextjs` user
- Created `frontend/.dockerignore` to exclude build artifacts and dev files

### Key decisions
1. **Standalone output**: Allows Node.js to directly run `server.js` without Next.js CLI
2. **Build-time NEXT_PUBLIC_API_URL**: As build ARG/ENV (baked into bundle) because Next.js inlines public env vars
3. **Multi-stage optimization**: Keeps final image minimal (~200MB instead of ~500MB+ with dependencies)
4. **Non-root user**: Security best practice; created `nextjs:nodejs` for runtime
5. **Node 22 Alpine**: Latest stable Node with minimal footprint (~40MB base)
6. **Health check**: HTTP GET to port 3000 for container orchestration

### Technical notes
- Standalone mode outputs to `.next/standalone/` with embedded server.js
- ENV vars at build time are baked into Next.js bundle; runtime vars won't work for NEXT_PUBLIC_*
- `NODE_OPTIONS=--max-old-space-size=1024` set during build to handle larger projects
- Final image runs with `CMD ["node", "server.js"]` (from standalone output)

## Wave 1 Task 1: Environment Variables & .gitignore

### Completed
- Created `.env.example` at project root with all production environment variable placeholders
- Removed `.dockerignore` from `.gitignore` (line 49) so Docker config files are committed
- Added production environment patterns to `.gitignore`: `.env.production`, `.env.staging`, `*.pem`

### Environment Variables Template
All vars use placeholder values:
- Database: PostgreSQL connection with service-based hostname `postgres:5432`
- Backend: PORT, JWT_SECRET, JWT_EXPIRY_HOURS, CORS_ORIGINS, OPENAI_API_KEY
- Frontend: NEXT_PUBLIC_API_URL (https://api-manris.marvcore.com/api/v1)

### Key Insight
- Docker production should use `postgres` as hostname (Docker Compose service name)
- `.dockerignore` must be committed; it should NOT be in `.gitignore`
- Real `.env.production` files never committed; only `.env.example` template committed

### Ready for Next Step
Wave 1 Task 2: Create root-level Dockerfile

## Task 3: GitHub Actions Workflow (2026-04-19)

### Created
- `.github/workflows/deploy.yml` - CI/CD pipeline

### Structure
- 2 jobs: `build-and-push` → `deploy` (sequential via `needs`)
- Trigger: push to `main` only
- Docker Buildx with GHA cache (`type=gha`) for faster builds
- Images tagged: `latest` + commit SHA

### Deploy Strategy
- SSH into server via `appleboy/ssh-action@v1`
- Only restarts backend + frontend (`--no-deps`)
- Does NOT touch postgres or nginx
- Cleans old images with `docker image prune -f`

### Required GitHub Secrets
DOCKER_USERNAME, DOCKER_PASSWORD, SSH_HOST, SSH_USER, SSH_KEY

## Docker Compose & Nginx Setup (2026-04-19)

### Created Artifacts
- `docker-compose.yml` - 5 services: postgres, backend, frontend, nginx, certbot
- `nginx/nginx.conf` - Main nginx config with gzip, logging, mime types
- `nginx/conf.d/default.conf` - SSL config with HTTPS redirect + certbot challenge
- `nginx/conf.d/default.conf.initial` - HTTP-only config for first-time cert setup

### Key Decisions
1. **PostgreSQL no host ports**: Only accessible within `manris-network` (security)
2. **Named volume `postgres_data`**: Persists across container restarts
3. **Pinned versions**: postgres:16-alpine, nginx:1.27-alpine, certbot:v3.3.0
4. **Certbot auto-renewal**: Entrypoint loops `certbot renew` every 12h
5. **Separate server blocks in initial config**: Avoids nginx `if` directive issues
6. **client_max_body_size 50M**: On API domain only for file uploads

### SSL Setup Flow
1. Copy `default.conf.initial` → `default.conf`
2. Start all services
3. Run certbot: `docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d api-manris.marvcore.com -d manris.marvcore.com`
4. Restore SSL config: `git checkout nginx/conf.d/default.conf`
5. Reload: `docker compose exec nginx nginx -s reload`

## F3: Manual QA Results (2026-04-19)

### A. Docker Compose Config — PASS (with note)
- `docker compose config` exits 0
- 5 services confirmed: postgres, backend, frontend, nginx, certbot
- postgres has NO ports mapping ✓
- **Note**: postgres `${POSTGRES_USER}` etc use compose interpolation (needs `.env` file or shell env), NOT the `env_file` directive. Warnings appear but config is valid. On server, setup-server.sh should create `.env` with these vars OR they need to be in `.env.production` AND a `.env` symlink.

### B. Nginx Config — PASS (manual review)
- Docker pull failed locally (credential issue), so `nginx -t` couldn't run in container
- Manual review of nginx.conf and conf.d/default.conf: syntax is correct
- Proper server blocks, valid directives, correct proxy_pass to service names

### C. Shell Scripts — PASS
- `bash -n scripts/setup-server.sh` → exit 0
- `bash -n backend/entrypoint.sh` → exit 0

### D. GitHub Actions YAML — PASS
- Ruby YAML parser: valid
- No tabs, proper structure

### E. Referenced Files — PASS
- nginx/conf.d ✓, nginx/nginx.conf ✓, backend ✓, frontend ✓
