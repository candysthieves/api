# Payments Service Deployment Implementation Plan

> **For agentic workers:** Use this plan task-by-task with implementation checkpoints.

**Goal:** Deploy the existing NestJS payments application as its own VPS container through the existing manual GitHub Actions deployment workflow.

**Architecture:** Build `chites/lumos-payments` from a dedicated Dockerfile. Extend CI and the manual deploy workflow to build and publish its immutable image alongside main and files, then extend the VPS Compose release override and deploy script to start and check all three services.

**Tech Stack:** NestJS, pnpm, Docker, Docker Compose, GitHub Actions, Bash.

**Spec:** `docs/superpowers/specs/2026-10-12-payments-deployment-design.md`

## Global Constraints

- Keep the existing pinned dependency versions; do not update dependencies.
- Use the repository's existing image tag format: full commit SHA, workflow run ID, and run attempt.
- The VPS services use `network_mode: host` and production mode.
- Payments listens on `PORT=3003`, configured directly in Compose; it does not require a server env file.
- Keep Prisma migrations associated with `main` only.
- Do not commit, push, or perform a live deployment without explicit user authorization.

---

### Task 1: Package and deploy payments through the existing pipeline

**Files:**
- Create: `apps/payments/Dockerfile`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `docker-compose.vps.yml`
- Modify: `scripts/deploy-vps.sh`
- Modify: `docs/ci-cd.md`

**Interfaces:**
- Build command: `pnpm run build:payments`.
- Production start command: `pnpm run payments:start:prod`.
- Image name: `chites/lumos-payments:<sha>-<run_id>-<run_attempt>`.
- Compose service name: `payments`; injected port: `PORT=3003`; no payments env file is needed.

- [ ] **Step 1: Add a dedicated payments image definition**

Create `apps/payments/Dockerfile` using the same repository-root build context and Node 24 Alpine base as the existing application images. Enable Corepack, use the `node` user, copy the workspace manifests and `apps/payments/src/env/load-env.ts`, install with `pnpm install --frozen-lockfile`, copy the repository, run `pnpm run build:payments`, expose port `3003`, and start with `pnpm run payments:start:prod`.

- [ ] **Step 2: Include payments in CI and image publication**

In `.github/workflows/ci.yml`, add `pnpm run build:payments` after the existing application builds. In `.github/workflows/deploy.yml`, add `payments` to the image matrix so the existing Docker Hub login, immutable run tag, and build cache publish `chites/lumos-payments`.

- [ ] **Step 3: Add the payments runtime service to VPS Compose**

In `docker-compose.vps.yml`, add a `payments` service using `chites/lumos-payments:latest`, `network_mode: host`, `restart: unless-stopped`, `init: true`, production `NODE_ENV`, and the existing bounded `json-file` logging options. Set `PORT: '3003'` in Compose so the selected service port is explicit.

- [ ] **Step 4: Extend the server deployment script**

In `scripts/deploy-vps.sh`, add a `payments` image to the generated release Compose override using the same immutable tag. Validate the merged Compose config, pull `main files payments`, and update/check `main files payments` together. Keep the existing Prisma migration command on `main` only and preserve the current pre-activation pull and startup failure behavior.

- [ ] **Step 5: Update deployment documentation**

Update `docs/ci-cd.md` to name the third image, describe that the manual deployment updates payments with main and files, and include the chosen port `3003` as the payments listener/reverse-proxy target.

- [ ] **Step 6: Build and inspect the deployment configuration**

Run `pnpm run build:payments`. If Docker Compose is available, validate the VPS Compose file with a temporary release override containing `chites/lumos-payments:check` and required env-file paths; do not pull images or start services. Review the final diff for consistent service names, image tags, and startup checks.

Expected result: payments compiles, Compose accepts the three-service configuration, and the manual deployment script handles payments through image pull, activation, and immediate startup-state validation.
