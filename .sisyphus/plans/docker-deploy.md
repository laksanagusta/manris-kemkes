# Docker Deploy: Manris v2 to Digital Ocean

## TL;DR

> **Quick Summary**: Containerize the entire Manris v2 stack (Go backend, Next.js frontend, PostgreSQL) with Docker, set up Nginx reverse proxy with SSL (Let's Encrypt), and automate deployments via GitHub Actions pushing to Docker Hub and pulling on a DO Droplet.
> 
> **Deliverables**:
> - Backend Dockerfile (multi-stage Go build with migrations)
> - Frontend Dockerfile (multi-stage Next.js standalone build)
> - docker-compose.yml for production orchestration
> - Nginx config for SSL + reverse proxy (2 subdomains)
> - GitHub Actions CI/CD workflow (build → push → SSH deploy)
> - Server setup script + deployment docs
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Dockerfiles → docker-compose + Nginx → CI/CD workflow → Server setup

---

## Context

### Original Request
Deploy Manris v2 to Digital Ocean Droplet using Docker Compose, with CI/CD via GitHub Actions (build image → push Docker Hub → SSH pull & restart), and SSL via Let's Encrypt for `api-manris.marvcore.com` (backend) and `manris.marvcore.com` (frontend).

### Interview Summary
**Key Discussions**:
- **Infrastructure**: DO Droplet (VPS) with direct SSH access
- **Reverse Proxy + SSL**: Nginx + Certbot (Let's Encrypt), free auto-renewing certs
- **Database**: PostgreSQL in Docker container on same Droplet
- **CI/CD**: Trigger on push to `main` branch, no test step
- **Docker Hub**: Namespace `laksanadika` (images: `laksanadika/manris-backend`, `laksanadika/manris-frontend`)
- **Environments**: Production only
- **Domains**: `api-manris.marvcore.com` → backend:8080, `manris.marvcore.com` → frontend:3000

**Research Findings**:
- Go 1.26.1, Fiber framework, entry point `cmd/server/main.go`
- Next.js 16, React 19, no `output: "standalone"` in next.config.ts (needs adding)
- `NEXT_PUBLIC_API_URL` is build-time env (baked into JS bundle)
- DB migrations via golang-migrate Makefile commands
- No existing Docker/CI/CD files in the project

### Metis Review
**Identified Gaps** (addressed):
- Migration strategy: Bundle `golang-migrate` binary in backend image, run before server start
- `NEXT_PUBLIC_API_URL` must be build-arg (not runtime env) for Next.js
- `next.config.ts` needs `output: "standalone"` for Docker deployment
- PostgreSQL must NOT expose ports to internet
- Need `.dockerignore` files to prevent leaking secrets/node_modules
- Certbot auto-renewal cron needed (certs expire every 90 days)
- First-deploy vs subsequent-deploy handling needed

---

## Work Objectives

### Core Objective
Create a fully automated deployment pipeline: push to main → build Docker images → push to Docker Hub → SSH to Droplet → pull new images → restart containers, with SSL-terminated Nginx reverse proxy.

### Concrete Deliverables
- `backend/Dockerfile` - Multi-stage Go build with migration binary
- `backend/.dockerignore`
- `backend/entrypoint.sh` - Runs migrations then starts server
- `frontend/Dockerfile` - Multi-stage Next.js standalone build
- `frontend/.dockerignore`
- `frontend/next.config.ts` update - Add `output: "standalone"`
- `docker-compose.yml` - Production orchestration (root level)
- `nginx/nginx.conf` - Reverse proxy config for both subdomains
- `nginx/conf.d/default.conf` - SSL + virtual host config
- `.github/workflows/deploy.yml` - CI/CD pipeline
- `scripts/setup-server.sh` - Initial Droplet provisioning
- `DEPLOY.md` - Deployment documentation

### Definition of Done
- [ ] `docker compose build` succeeds locally
- [ ] `docker compose config` validates without errors
- [ ] GitHub Actions workflow triggers on push to main and completes green
- [ ] `curl https://api-manris.marvcore.com/api/health` returns 200
- [ ] `curl https://manris.marvcore.com` returns HTML
- [ ] SSL valid on both domains

### Must Have
- Multi-stage Docker builds (small images)
- Named Docker volume for PostgreSQL data persistence
- Automatic database migration on backend start
- SSL with auto-renewal
- GitHub Secrets for all credentials (no committed secrets)
- `.dockerignore` files in both projects
- Internal-only PostgreSQL (no external port exposure)
- `NODE_OPTIONS=--max-old-space-size=1024` in frontend build

### Must NOT Have (Guardrails)
- NO secrets in Dockerfiles, docker-compose.yml, or committed .env files
- NO `latest` tags for base images - pin versions
- NO PostgreSQL port exposed to internet
- NO monitoring/logging stack (Grafana, Prometheus, ELK)
- NO staging environment
- NO blue-green/canary deploys - simple pull-and-restart
- NO auto-scaling or load balancing
- NO rate limiting at Nginx level (v1)
- NO running containers as root

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Go tests + Next.js build)
- **Automated tests**: None in CI pipeline (user preference)
- **Framework**: N/A for this task
- **Verification approach**: Docker build success + compose validation + curl endpoint checks

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-*.{ext}`.

- **Docker builds**: `docker build` exit code + image size check
- **Compose**: `docker compose config` validation
- **Nginx**: `nginx -t` inside container
- **CI/CD**: Manual YAML syntax review + workflow structure verification
- **End-to-end**: `curl` against deployed endpoints (post-deploy)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - no dependencies):
├── Task 1: Backend Dockerfile + .dockerignore + entrypoint.sh [quick]
├── Task 2: Frontend Dockerfile + .dockerignore + next.config.ts update [quick]
└── Task 3: .env.example + environment documentation [quick]

Wave 2 (After Wave 1 - compose + CI/CD):
├── Task 4: docker-compose.yml + Nginx config (depends: 1, 2) [unspecified-high]
└── Task 5: GitHub Actions deploy workflow (depends: 1, 2) [unspecified-high]

Wave 3 (After Wave 2 - server setup + docs):
└── Task 6: Server setup script + DEPLOY.md (depends: 4, 5) [writing]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA - docker compose build + config validation (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 4, 5 | 1 |
| 2 | - | 4, 5 | 1 |
| 3 | - | 6 | 1 |
| 4 | 1, 2 | 6 | 2 |
| 5 | 1, 2 | 6 | 2 |
| 6 | 3, 4, 5 | - | 3 |

### Agent Dispatch Summary

- **Wave 1**: **3 parallel** - T1 → `quick` + `backend-go`, T2 → `quick` + `react-expert`, T3 → `quick`
- **Wave 2**: **2 parallel** - T4 → `unspecified-high`, T5 → `unspecified-high`
- **Wave 3**: **1** - T6 → `writing`
- **FINAL**: **4 parallel** - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Backend Dockerfile + .dockerignore + entrypoint.sh

  **What to do**:
  - Create `backend/Dockerfile` with multi-stage build:
    - Stage 1 (`builder`): `golang:1.26-alpine` - build the Go binary and download `golang-migrate` CLI binary
    - Stage 2 (`runtime`): `alpine:3.21` - copy binary, migrations, and entrypoint. Run as non-root user.
  - Create `backend/entrypoint.sh`:
    ```sh
    #!/bin/sh
    set -e
    echo "Running database migrations..."
    /app/migrate -path /app/migrations -database "$DATABASE_URL" up
    echo "Starting server..."
    exec /app/server
    ```
  - Create `backend/.dockerignore`:
    ```
    .env
    .env.*
    server
    tmp/
    bin/
    *.test
    .git
    .gitignore
    README.md
    Makefile
    ```
  - Ensure the binary is compiled with `CGO_ENABLED=0 GOOS=linux` for Alpine compatibility
  - Copy `db/migrations/` into the image

  **Must NOT do**:
  - Do NOT include `.env` file or any secrets in the image
  - Do NOT use `latest` tag for base images
  - Do NOT run as root

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single concern - creating Dockerfile and supporting files, well-known patterns
  - **Skills**: [`backend-go`]
    - `backend-go`: Go backend best practices, understands Go build patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `backend/cmd/server/main.go` - Entry point, this is what the Dockerfile builds and runs
  - `backend/go.mod:1-3` - Module name `github.com/manris/backend`, Go version 1.26.1
  - `backend/Makefile` - Contains migration commands showing how `golang-migrate` is used

  **API/Type References**:
  - `backend/db/migrations/` - Migration files directory that must be copied into the image

  **External References**:
  - golang-migrate releases: `https://github.com/golang-migrate/migrate/releases` - Download binary for Alpine Linux (linux amd64)

  **Acceptance Criteria**:

  ```
  Scenario: Backend Docker image builds successfully
    Tool: Bash
    Preconditions: Docker installed, in project root
    Steps:
      1. Run `cd backend && docker build -t test-manris-backend .`
      2. Check exit code is 0
      3. Run `docker images test-manris-backend --format '{{.Size}}'`
      4. Verify image size < 100MB
    Expected Result: Build succeeds, image is small (< 100MB)
    Failure Indicators: Build fails, image > 200MB, missing binary
    Evidence: .sisyphus/evidence/task-1-backend-build.txt

  Scenario: .dockerignore prevents secret leakage
    Tool: Bash
    Preconditions: Backend image built
    Steps:
      1. Run `docker run --rm test-manris-backend ls /app/`
      2. Verify .env is NOT present in output
      3. Verify `server` binary and `migrations/` dir ARE present
    Expected Result: Only expected files in image, no secrets
    Failure Indicators: .env visible, node_modules visible
    Evidence: .sisyphus/evidence/task-1-dockerignore-check.txt

  Scenario: Entrypoint script is executable
    Tool: Bash
    Preconditions: Backend image built
    Steps:
      1. Run `docker run --rm --entrypoint sh test-manris-backend -c "ls -la /app/entrypoint.sh"`
      2. Verify file has execute permissions
    Expected Result: entrypoint.sh has +x permission
    Evidence: .sisyphus/evidence/task-1-entrypoint-check.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(docker): add backend Dockerfile with multi-stage build and migrations`
  - Files: `backend/Dockerfile`, `backend/.dockerignore`, `backend/entrypoint.sh`

- [x] 2. Frontend Dockerfile + .dockerignore + next.config.ts update

  **What to do**:
  - Update `frontend/next.config.ts` to add `output: "standalone"`:
    ```ts
    const nextConfig: NextConfig = {
      output: "standalone",
      async redirects() { ... }
    };
    ```
  - Create `frontend/Dockerfile` with multi-stage build:
    - Stage 1 (`deps`): `node:22-alpine` - install dependencies only (for caching)
    - Stage 2 (`builder`): `node:22-alpine` - copy source + `NEXT_PUBLIC_API_URL` as `ARG` + `ENV NODE_OPTIONS=--max-old-space-size=1024` + `npm run build`
    - Stage 3 (`runner`): `node:22-alpine` - copy `.next/standalone` + `.next/static` + `public`. Run as non-root user `nextjs`.
  - Create `frontend/.dockerignore`:
    ```
    .next
    node_modules
    .env
    .env.*
    .git
    .gitignore
    README.md
    ```
  - The `NEXT_PUBLIC_API_URL` MUST be an `ARG` (not just ENV) because Next.js bakes it at build time
  - Default value for ARG: `https://api-manris.marvcore.com/api/v1`

  **Must NOT do**:
  - Do NOT use runtime env for `NEXT_PUBLIC_API_URL` (it won't work - Next.js bakes at build)
  - Do NOT include `node_modules` in the image
  - Do NOT use `latest` tag
  - Do NOT run as root

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard Next.js Dockerfile pattern, well-documented
  - **Skills**: [`react-expert`]
    - `react-expert`: Understands Next.js standalone output and build requirements

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/next.config.ts` - Current config, needs `output: "standalone"` added
  - `frontend/package.json:5-10` - Build scripts: `npm run build` → `next build`
  - `frontend/src/lib/api.ts:1` - `NEXT_PUBLIC_API_URL` usage, must be baked at build

  **External References**:
  - Next.js standalone output: `https://nextjs.org/docs/app/api-reference/config/next-config-js/output`
  - Vercel's official Dockerfile example: `https://github.com/vercel/next.js/tree/canary/examples/with-docker`

  **Acceptance Criteria**:

  ```
  Scenario: Frontend Docker image builds with correct API URL
    Tool: Bash
    Preconditions: Docker installed, in project root
    Steps:
      1. Run `cd frontend && docker build --build-arg NEXT_PUBLIC_API_URL=https://api-manris.marvcore.com/api/v1 -t test-manris-frontend .`
      2. Check exit code is 0
      3. Run `docker images test-manris-frontend --format '{{.Size}}'`
    Expected Result: Build succeeds, image < 500MB
    Failure Indicators: Build fails, OOM error, missing standalone output
    Evidence: .sisyphus/evidence/task-2-frontend-build.txt

  Scenario: API URL is baked into the bundle
    Tool: Bash
    Preconditions: Frontend image built
    Steps:
      1. Run `docker run --rm test-manris-frontend sh -c "grep -r 'api-manris.marvcore.com' /app/.next/standalone/ || echo NOT_FOUND"`
      2. Verify the API URL appears in the bundled JavaScript
    Expected Result: `api-manris.marvcore.com` found in bundle
    Failure Indicators: NOT_FOUND output - means build-arg wasn't applied
    Evidence: .sisyphus/evidence/task-2-api-url-baked.txt

  Scenario: next.config.ts has standalone output
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run `grep -c "standalone" frontend/next.config.ts`
      2. Verify count > 0
    Expected Result: "standalone" found in next.config.ts
    Evidence: .sisyphus/evidence/task-2-standalone-check.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(docker): add frontend Dockerfile with standalone build`
  - Files: `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/next.config.ts`

- [x] 3. Environment configuration template

  **What to do**:
  - Create `.env.example` at project root with all required production env vars (placeholder values):
    ```env
    # Database
    POSTGRES_USER=manris
    POSTGRES_PASSWORD=CHANGE_ME
    POSTGRES_DB=manris
    DATABASE_URL=postgres://manris:CHANGE_ME@postgres:5432/manris?sslmode=disable

    # Backend
    PORT=8080
    JWT_SECRET=CHANGE_ME_GENERATE_STRONG_SECRET
    JWT_EXPIRY_HOURS=24
    CORS_ORIGINS=https://manris.marvcore.com
    OPENAI_API_KEY=sk-your-key-here

    # Frontend (build-time - also set as Docker build arg)
    NEXT_PUBLIC_API_URL=https://api-manris.marvcore.com/api/v1

    # Docker Hub
    DOCKER_USERNAME=laksanadika
    ```
  - Create `.env.production` in `.gitignore` if not already there
  - Verify `.gitignore` excludes all `.env*` files (except `.env.example`)

  **Must NOT do**:
  - Do NOT include real secrets in `.env.example`
  - Do NOT commit `.env.production`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Creating a template file, trivial task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `backend/.env` - Current env file (DO NOT COMMIT, just reference for variable names)
  - `.gitignore` - Verify .env exclusion patterns

  **Acceptance Criteria**:

  ```
  Scenario: .env.example exists with all required vars
    Tool: Bash
    Steps:
      1. Run `cat .env.example`
      2. Verify contains: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DATABASE_URL, PORT, JWT_SECRET, CORS_ORIGINS, OPENAI_API_KEY, NEXT_PUBLIC_API_URL
      3. Verify NO real secrets (no actual passwords/keys)
    Expected Result: All vars present with placeholder values
    Evidence: .sisyphus/evidence/task-3-env-example.txt

  Scenario: .env.production is gitignored
    Tool: Bash
    Steps:
      1. Run `grep -c ".env.production" .gitignore`
      2. Or verify `.env*` pattern covers it
    Expected Result: .env.production excluded from git
    Evidence: .sisyphus/evidence/task-3-gitignore-check.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(config): add .env.example template for production deployment`
  - Files: `.env.example`, `.gitignore` (if modified)

- [x] 4. docker-compose.yml + Nginx configuration

  **What to do**:
  - Create `docker-compose.yml` at project root:
    ```yaml
    services:
      postgres:
        image: postgres:16-alpine
        restart: unless-stopped
        environment:
          POSTGRES_USER: ${POSTGRES_USER}
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
          POSTGRES_DB: ${POSTGRES_DB}
        volumes:
          - postgres_data:/var/lib/postgresql/data
        networks:
          - manris-network
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
          interval: 10s
          timeout: 5s
          retries: 5
        # NO ports: section - internal only!

      backend:
        image: laksanadika/manris-backend:latest
        restart: unless-stopped
        env_file: .env.production
        depends_on:
          postgres:
            condition: service_healthy
        networks:
          - manris-network

      frontend:
        image: laksanadika/manris-frontend:latest
        restart: unless-stopped
        networks:
          - manris-network

      nginx:
        image: nginx:1.27-alpine
        restart: unless-stopped
        ports:
          - "80:80"
          - "443:443"
        volumes:
          - ./nginx/conf.d:/etc/nginx/conf.d:ro
          - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
          - ./certbot/www:/var/www/certbot:ro
          - ./certbot/conf:/etc/letsencrypt:ro
        depends_on:
          - backend
          - frontend
        networks:
          - manris-network

      certbot:
        image: certbot/certbot:latest
        volumes:
          - ./certbot/www:/var/www/certbot
          - ./certbot/conf:/etc/letsencrypt
        entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
        networks:
          - manris-network

    volumes:
      postgres_data:

    networks:
      manris-network:
        driver: bridge
    ```
  - Create `nginx/nginx.conf` - main nginx config with worker settings
  - Create `nginx/conf.d/default.conf` with:
    - HTTP server block (port 80): redirect to HTTPS + certbot challenge path (`/.well-known/acme-challenge/`)
    - HTTPS server block for `api-manris.marvcore.com`: proxy to `backend:8080`
    - HTTPS server block for `manris.marvcore.com`: proxy to `frontend:3000`
    - SSL cert paths: `/etc/letsencrypt/live/api-manris.marvcore.com/` and `/etc/letsencrypt/live/manris.marvcore.com/`
    - Proper proxy headers: `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Host`
    - WebSocket support for Next.js HMR (though not needed in prod, good practice)
  - Include an `nginx/conf.d/default.conf.initial` for first-time setup (HTTP only, before SSL certs exist) - needed for certbot to get initial certs

  **Must NOT do**:
  - Do NOT expose PostgreSQL ports (no `ports:` on postgres service)
  - Do NOT hardcode secrets in docker-compose.yml
  - Do NOT use `latest` for postgres/nginx base images

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multi-file, needs correct Nginx SSL config, Docker networking, and certbot integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `backend/cmd/server/main.go:1-14` - Backend uses Fiber on PORT env var (default 8080)
  - `frontend/package.json:8` - Frontend runs on port 3000 via `next start`
  - `frontend/src/lib/api.ts:1` - API base URL pattern

  **External References**:
  - Nginx reverse proxy with Docker: standard pattern
  - Certbot with Nginx: `https://certbot.eff.org/instructions?ws=nginx&os=debianbuster`
  - Docker Compose healthcheck: `https://docs.docker.com/reference/compose-file/services/#healthcheck`

  **Acceptance Criteria**:

  ```
  Scenario: docker-compose.yml is valid
    Tool: Bash
    Preconditions: Docker Compose installed
    Steps:
      1. Run `docker compose config` in project root
      2. Check exit code is 0
      3. Verify output shows 5 services: postgres, backend, frontend, nginx, certbot
      4. Verify postgres has NO ports mapping
    Expected Result: Valid compose config, 5 services, postgres internal only
    Failure Indicators: YAML error, missing services, postgres ports exposed
    Evidence: .sisyphus/evidence/task-4-compose-config.txt

  Scenario: Nginx config syntax is valid
    Tool: Bash
    Steps:
      1. Run `docker run --rm -v $(pwd)/nginx:/etc/nginx:ro nginx:1.27-alpine nginx -t`
      2. Check exit code is 0
    Expected Result: "nginx: the configuration file /etc/nginx/nginx.conf syntax is ok"
    Failure Indicators: Syntax error in config
    Evidence: .sisyphus/evidence/task-4-nginx-syntax.txt

  Scenario: PostgreSQL uses named volume
    Tool: Bash
    Steps:
      1. Run `docker compose config | grep -A5 "volumes:"`
      2. Verify `postgres_data` named volume is defined
    Expected Result: Named volume `postgres_data` exists in compose config
    Evidence: .sisyphus/evidence/task-4-volume-check.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(docker): add docker-compose with Nginx reverse proxy and SSL`
  - Files: `docker-compose.yml`, `nginx/nginx.conf`, `nginx/conf.d/default.conf`, `nginx/conf.d/default.conf.initial`

- [x] 5. GitHub Actions deploy workflow

  **What to do**:
  - Create `.github/workflows/deploy.yml`:
    ```yaml
    name: Deploy to Production
    on:
      push:
        branches: [main]

    jobs:
      build-and-push:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4

          - name: Login to Docker Hub
            uses: docker/login-action@v3
            with:
              username: ${{ secrets.DOCKER_USERNAME }}
              password: ${{ secrets.DOCKER_PASSWORD }}

          - name: Build and push backend
            uses: docker/build-push-action@v6
            with:
              context: ./backend
              push: true
              tags: laksanadika/manris-backend:latest,laksanadika/manris-backend:${{ github.sha }}

          - name: Build and push frontend
            uses: docker/build-push-action@v6
            with:
              context: ./frontend
              push: true
              tags: laksanadika/manris-frontend:latest,laksanadika/manris-frontend:${{ github.sha }}
              build-args: |
                NEXT_PUBLIC_API_URL=https://api-manris.marvcore.com/api/v1

      deploy:
        needs: build-and-push
        runs-on: ubuntu-latest
        steps:
          - name: Deploy via SSH
            uses: appleboy/ssh-action@v1
            with:
              host: ${{ secrets.SSH_HOST }}
              username: ${{ secrets.SSH_USER }}
              key: ${{ secrets.SSH_KEY }}
              script: |
                cd /opt/manris
                docker compose pull backend frontend
                docker compose up -d --no-deps backend frontend
                docker image prune -f
    ```
  - The workflow tags images with both `latest` and commit SHA for rollback capability
  - Deploy step only pulls and restarts backend + frontend (not postgres/nginx)
  - `docker image prune -f` cleans old images on server

  **Must NOT do**:
  - Do NOT include secrets in the workflow file
  - Do NOT restart postgres or nginx on deploy (they're stable services)
  - Do NOT add test steps (user preference)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: GitHub Actions workflow with Docker + SSH integration, needs correct secret references
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `backend/Dockerfile` (from Task 1) - Image to build
  - `frontend/Dockerfile` (from Task 2) - Image to build with build-arg

  **External References**:
  - docker/build-push-action: `https://github.com/docker/build-push-action`
  - appleboy/ssh-action: `https://github.com/appleboy/ssh-action`
  - GitHub Actions Docker Hub: `https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-docker-images`

  **WHY Each Reference Matters**:
  - build-push-action handles Docker buildx, multi-platform, and push in one step
  - ssh-action is the proven way to SSH into server from GitHub Actions
  - Commit SHA tagging enables easy rollback: `docker compose pull` specific SHA

  **Acceptance Criteria**:

  ```
  Scenario: Workflow YAML is syntactically valid
    Tool: Bash
    Steps:
      1. Run `cat .github/workflows/deploy.yml | python3 -c "import sys,yaml; yaml.safe_load(sys.stdin)"` or equivalent
      2. Check exit code is 0
    Expected Result: Valid YAML
    Failure Indicators: YAML parse error
    Evidence: .sisyphus/evidence/task-5-yaml-valid.txt

  Scenario: Workflow references correct secrets
    Tool: Bash
    Steps:
      1. Run `grep -o 'secrets\.[A-Z_]*' .github/workflows/deploy.yml | sort -u`
      2. Verify list contains: DOCKER_USERNAME, DOCKER_PASSWORD, SSH_HOST, SSH_USER, SSH_KEY
    Expected Result: All 5 required secrets referenced
    Failure Indicators: Missing secret reference, hardcoded value
    Evidence: .sisyphus/evidence/task-5-secrets-check.txt

  Scenario: Deploy only restarts app containers not infra
    Tool: Bash
    Steps:
      1. Run `grep "docker compose" .github/workflows/deploy.yml`
      2. Verify pull/up commands target `backend frontend` specifically, not all services
    Expected Result: Only backend and frontend are pulled/restarted
    Failure Indicators: `docker compose up -d` without service names (restarts everything)
    Evidence: .sisyphus/evidence/task-5-deploy-scope.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(ci): add GitHub Actions workflow for Docker Hub deploy`
  - Files: `.github/workflows/deploy.yml`

- [x] 6. Server setup script + Deployment documentation

  **What to do**:
  - Create `scripts/setup-server.sh` (run once on fresh Droplet):
    ```sh
    #!/bin/bash
    set -e
    # 1. Update system packages
    # 2. Install Docker + Docker Compose
    # 3. Create app directory /opt/manris
    # 4. Copy nginx config, docker-compose.yml
    # 5. Create .env.production from template
    # 6. Set up firewall (ufw): allow 22, 80, 443 only
    # 7. Initial SSL cert generation with certbot (standalone mode before nginx starts):
    #    certbot certonly --standalone -d api-manris.marvcore.com -d manris.marvcore.com
    # 8. Start all services: docker compose up -d
    # 9. Set up cron for cert renewal: 0 0 */60 * * docker compose run --rm certbot renew
    ```
  - Create `DEPLOY.md` with:
    - Prerequisites (Droplet specs: 2GB+ RAM, Ubuntu 22.04+)
    - DNS setup instructions (A records for both subdomains → Droplet IP)
    - GitHub Secrets to configure (DOCKER_USERNAME, DOCKER_PASSWORD, SSH_HOST, SSH_USER, SSH_KEY)
    - Docker Hub access token generation
    - First-time deployment steps (run setup script)
    - Subsequent deployments (automatic via GitHub Actions)
    - Rollback procedure: `docker compose pull laksanadika/manris-backend:SHA && docker compose up -d`
    - Troubleshooting (logs, restart, migration issues)
    - Database backup: `docker compose exec postgres pg_dump -U manris manris > backup.sql`

  **Must NOT do**:
  - Do NOT include real credentials in the script or docs
  - Do NOT automate DNS setup (manual step)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation + shell script, mostly prose and well-known commands
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Wave 2)
  - **Blocks**: None
  - **Blocked By**: Tasks 3, 4, 5

  **References**:

  **Pattern References**:
  - `docker-compose.yml` (from Task 4) - Services being deployed
  - `.env.example` (from Task 3) - Template for .env.production
  - `.github/workflows/deploy.yml` (from Task 5) - Secrets needed

  **External References**:
  - Docker install on Ubuntu: `https://docs.docker.com/engine/install/ubuntu/`
  - Certbot standalone mode: `https://certbot.eff.org/docs/using.html#standalone`
  - UFW firewall: `https://www.digitalocean.com/community/tutorials/how-to-set-up-a-firewall-with-ufw-on-ubuntu`

  **Acceptance Criteria**:

  ```
  Scenario: Setup script is executable and has correct structure
    Tool: Bash
    Steps:
      1. Run `head -1 scripts/setup-server.sh`
      2. Verify shebang `#!/bin/bash`
      3. Run `grep -c "ufw" scripts/setup-server.sh`
      4. Verify firewall setup is included
      5. Run `grep -c "certbot" scripts/setup-server.sh`
      6. Verify SSL setup is included
    Expected Result: Script has shebang, firewall, and SSL setup
    Evidence: .sisyphus/evidence/task-6-script-check.txt

  Scenario: DEPLOY.md covers all critical sections
    Tool: Bash
    Steps:
      1. Run `grep -c "Prerequisites\|DNS\|GitHub Secrets\|First-time\|Rollback\|Troubleshooting\|Backup" DEPLOY.md`
      2. Verify count >= 6 (all major sections present)
    Expected Result: All critical sections documented
    Evidence: .sisyphus/evidence/task-6-docs-check.txt

  Scenario: No real secrets in documentation
    Tool: Bash
    Steps:
      1. Run `grep -i "sk-\|password123\|secret123" scripts/setup-server.sh DEPLOY.md`
      2. Verify no real secrets present
    Expected Result: No real secrets found
    Evidence: .sisyphus/evidence/task-6-no-secrets.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `docs(deploy): add server setup script and deployment guide`
  - Files: `scripts/setup-server.sh`, `DEPLOY.md`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Review all Docker/Nginx/workflow files for: security issues (secrets exposure, root containers, exposed ports), best practices (multi-stage builds, layer caching, .dockerignore), syntax correctness. Run `docker compose config` to validate.
  Output: `Security [PASS/FAIL] | Best Practices [PASS/FAIL] | Syntax [PASS/FAIL] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Run `docker compose build` locally. Run `docker compose config`. Verify Nginx config with `docker run --rm -v ./nginx:/etc/nginx nginx:alpine nginx -t`. Check all file references exist. Verify GitHub Actions YAML syntax.
  Output: `Build [PASS/FAIL] | Config [PASS/FAIL] | Nginx [PASS/FAIL] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual files created. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Creep [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Option A (Recommended)**: Single atomic commit
  - `feat(deploy): add Docker, Nginx, CI/CD for Digital Ocean deployment`
  - All files in one commit for clean history

- **Option B**: Per-wave commits
  - Wave 1: `feat(docker): add backend and frontend Dockerfiles`
  - Wave 2: `feat(docker): add docker-compose and nginx config`
  - Wave 2: `feat(ci): add GitHub Actions deploy workflow`
  - Wave 3: `docs(deploy): add server setup script and deployment guide`

---

## Success Criteria

### Verification Commands
```bash
# Local validation
docker compose config                    # Expected: valid YAML output, no errors
docker compose build                     # Expected: both images build successfully
docker run --rm -v ./nginx:/etc/nginx nginx:1.27-alpine nginx -t  # Expected: syntax ok

# Post-deploy verification (on server)
curl -s https://api-manris.marvcore.com/api/health    # Expected: 200 OK
curl -s https://manris.marvcore.com | head -1          # Expected: <!DOCTYPE html>
curl -vI https://manris.marvcore.com 2>&1 | grep "SSL" # Expected: SSL certificate verify ok
docker volume ls | grep postgres                        # Expected: manris_postgres_data exists
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Docker images build successfully
- [ ] docker-compose.yml validates
- [ ] Nginx config valid
- [ ] GitHub Actions workflow syntactically correct
- [ ] No secrets committed to repository
- [ ] PostgreSQL data persists across restarts
