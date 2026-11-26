# Universal Quality Gates, API QA & Stress Testing (On-Demand)

Consult this reference during `/sdlc-qa`, `/sdlc-review`, and `/sdlc-ship`.

## 1. Auto-Detect Execution Order
1. **Repo Scripts First**: Run existing `Makefile`, `Taskfile.yml`, `package.json`, or `.pre-commit-config.yaml` targets so local checks match CI.
2. **Stack Auto-Detection**: Otherwise detect manifests below and run all 4 gates: **Formatter**, **Lint & Typecheck**, **Vulnerability Audit**, and **Secret Scan**.
3. **Honest Reporting & Token Discipline**: If a tool is not installed locally, mark it `SKIPPED (not installed)` — never fake `PASS`. Pipe noisy logs through `| tail -n 50`.

## 2. Multi-Language Quality Gates

| Stack (Manifest) | Formatter | Lint & Typecheck | Vulncheck & Security |
|---|---|---|---|
| **Go** (`go.mod`) | `gofmt -l .` | `golangci-lint run`, `go vet ./...` | `govulncheck ./...` |
| **TS / JS** (`package.json`) | `prettier --check` / `biome check` | `eslint` / `biome`, `tsc --noEmit` | `npm audit --audit-level=high` (`pnpm`/`bun`) |
| **Python** (`pyproject.toml`) | `ruff format --check` | `ruff check`, `mypy` / `pyright` | `pip-audit`, `bandit` |
| **Rust** (`Cargo.toml`) | `cargo fmt --check` | `cargo clippy -- -D warnings` | `cargo audit` |
| **Java / Kotlin** (`pom.xml` / `build.gradle*`) | `spotlessCheck` | `checkstyle` / `ktlint` / `spotbugs` | `trivy fs .` / OWASP dep-check |
| **PHP** (`composer.json`) | `pint --test` / `php-cs-fixer` | `phpstan` / `psalm` | `composer audit` |
| **Infra / Universal** (`Dockerfile`, `*.sh`, `*.tf`) | `terraform fmt -check` | `hadolint`, `shellcheck` | `gitleaks detect`, `trivy fs .` |

## 3. API QA Checklist (Every API Change)
- **Validation & Negative Cases**: invalid payloads, boundary values, missing required fields return clean `400`/`422`.
- **AuthN & AuthZ / Tenant Isolation**: unauthenticated requests return `401`; cross-tenant or unauthorized role access returns `403`.
- **Idempotency**: duplicate `POST`/mutation requests with the same idempotency key produce a single safe side effect.
- **Pagination & Bounds**: list endpoints enforce `limit`/`page` caps (no unbounded `SELECT *` dumps).
- **Contract Alignment**: verify request/response shapes match OpenAPI / Protobuf / Pact specs.

## 4. Performance & Stress Testing (Staging Only — `k6`, `Locust`, `Vegeta`)
Run for high-traffic endpoints, batch jobs, or heavy DB changes — **never directly against Production** without explicit approval:
- **Smoke**: 1–5 VUs to verify test script and basic latency.
- **Load**: expected peak traffic vs SLO thresholds (e.g. `p95 < 200ms`, `error rate < 0.1%`).
- **Stress**: ramp beyond peak capacity to find breaking points and verify rate limits / autoscaling.
- **Spike**: sudden traffic bursts (cron jobs, webhooks, flash events).
- **Soak**: sustained load over hours to catch memory or connection-pool leaks.
