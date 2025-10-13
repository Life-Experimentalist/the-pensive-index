# The Pensieve Index — Documentation Hub

This wiki holds the authoritative documentation for The Pensieve Index. It is organized for three primary audiences:

- Product users (readers, writers)
- Site administrators and moderators
- Developers and operators

If you're new to the repository, start at the top-level project README (../README.md) for a short quickstart; this wiki contains more detailed operational, architectural, and contributor-facing documentation.

Repository docs map
-------------------

- Core
	- `../README.md` — Project overview and quickstart
	- `CONTRIBUTING.md` — Contribution workflow, release process, and code review guidelines

- Architecture & APIs
	- `architecture/` — System design, data flow diagrams, and component responsibilities
	- `api/` — API reference, endpoints, and usage examples (OpenAPI when available)
	- `database/` — D1/Drizzle schema notes, migrations, and seed strategies

- Development & Testing
	- `development/` — Local setup, development workflows, spec-kit usage, and debugging tips
	- `spec-kit/` — Feature specification templates and the spec-driven workflow used by the project
	- `tests/` (repository root) — Unit, integration and E2E test patterns and how to run them

- Deployment & Operations
	- `deployment/` — Production deployment guide, Cloudflare worker config, and rollback steps
	- `monitoring/` — Observability, alerts, and performance tuning guidance

- User & Admin Guides
	- `user-guide/` — How-to guides for end users and power users
	- `admin/` (in wiki) — Admin dashboard workflows and moderation processes

How to use this wiki
--------------------

1. Pick the audience that matches your task (Developer / Admin / User).
2. Use the 'Search' feature in the repo or the table of contents links below to find a page.
3. When changing code that requires documentation updates, add a short changelog entry under the relevant wiki page (date + summary + author).

Documentation maintenance checklist
----------------------------------

- [ ] Each feature or API PR should include a documentation checklist in its description.
- [ ] For any public API changes, update `wiki/api/API-DOCUMENTATION.md` and the OpenAPI spec if present.
- [ ] On each release, update `wiki/deployment/production-deployment-guide.md` with any net-new infra changes.
- [ ] Keep architecture diagrams in `wiki/architecture/ARCHITECTURE.md` in sync with the codebase.

Priority pages to review now
---------------------------

1. `deployment/production-deployment-guide.md` — ensure Cloudflare steps are current.
2. `development/setup.md` — verify local setup steps (Node version, env vars, DB setup) are accurate.
3. `api/API-DOCUMENTATION.md` — confirm any new endpoints are documented.

New quick references
- `deployment/production-deployment-quickstart.md` — short step-by-step production deploy quickstart
- `deployment/observability.md` — logs, metrics, Sentry and Cloudflare observability notes
- `development/setup.md` — detailed local setup (added)
- `api/openapi-guidelines.md` — guidance for OpenAPI updates and client generation

Contributing to the wiki
------------------------

This repo uses the same PR workflow as code. To update the wiki:

1. Create a branch named `docs/<short-topic>` (e.g., `docs/deployment-observability`).
2. Edit or add markdown files under `wiki/` with the exact change.
3. Open a PR and reference any related code change PRs.
4. Add reviewers: at least one developer and one product owner for user-facing docs.

If you want, I can iterate and rewrite specific pages next (Deployment, Development, API, Architecture, User Guide). Tell me which pages to prioritize, or I'll start with the ones flagged above.

---

Generated on: 2025-10-13

