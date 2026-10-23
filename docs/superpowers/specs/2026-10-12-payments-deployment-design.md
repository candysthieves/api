# Payments service deployment design

## Goal

Run the existing NestJS `payments` application as its own container on the VPS and deploy it through the existing manually triggered `Deploy developer` GitHub Actions workflow.

## Runtime

- Add a Dockerfile for `apps/payments` following the existing application image conventions.
- Add `payments` to `docker-compose.vps.yml` as a separate service using `chites/lumos-payments`, host networking, production mode, and restart-on-failure behavior. YooKassa recurring payments also require `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY` supplied as deployment secrets; never commit them.
- Set `PORT=3003` for the container. This is the selected application and reverse-proxy target port. The repository does not expose the VPS socket table, so actual port availability must be confirmed on the server during rollout.
- Keep the existing `.main.env` and `.files.env` prerequisites for the services that use them.
- Configure the YooKassa notification URL as `https://api.lumosapp.net/payments/yookassa/webhook` in the shop settings.

## Image and deployment flow

- Include `payments` in CI builds.
- Include `payments` in the Deploy workflow's image build and publish matrix, using the existing immutable run tag convention.
- Extend the generated release Compose override, image pull, `up --wait`, and startup state check to include `payments`.
- Keep Prisma migration execution associated with `main`; payments does not own that database migration step.
- Update `docs/ci-cd.md` to document the third image, required environment file, and deployment behavior.

## Failure handling

Preserve the current deploy behavior: image pull and Compose validation happen before activation; a failed startup check exits with an error. No automatic rollback or health endpoint is added as part of this change.

## Verification

- Build the payments Nest application and Docker image configuration using the repository's existing scripts/tooling.
- Validate the combined VPS and generated release Compose configuration.
- Review the changed CI and deploy script paths for consistent image tags and service names.
- Do not run a live server deployment as part of local verification.

## Scope

This change packages and deploys the existing payments application. It does not add payment-provider behavior or alter its HTTP API.
