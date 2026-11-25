# Big Tech Architecture Checklist (On-Demand)

Consult this checklist when designing critical services (`/spec`, `/adr`) or reviewing mutations (`/review`).

## 1. Idempotency & Safe Retries
- Require an **idempotency key** on all critical mutations (payments, billing, provisioning, webhooks, async jobs) so retries or double-clicks never duplicate state.
- Set **explicit timeouts** on every outbound HTTP/RPC/DB call — never rely on infinite defaults.
- Use **bounded retries with exponential backoff + jitter** only for transient errors; add **circuit breakers** around flaky dependencies.

## 2. Design for Failure
Before coding any external integration or distributed workflow, answer:
1. What happens if the downstream service or DB hangs for 30s or returns 503?
2. What happens if the worker crashes mid-flight (partial failure)? Use transactions, outbox pattern, or compensating actions.
3. How can operators **replay or recover** safely without manual production DB edits?

## 3. Backward Compatibility & Contract Evolution
- Evolve APIs and event schemas **additively first**: add optional fields → deploy dual-support → deprecate old fields → remove only after all consumers migrate.
- Use **Expand & Contract** for zero-downtime DB migrations (add nullable → backfill & dual-write → switch reads → drop old column in a later release).

## 4. Boring Technology & Simplicity Bias
- Prefer proven, well-understood infrastructure (PostgreSQL, Redis, standard HTTP/gRPC, simple queues/cron) for core paths.
- Avoid premature abstractions or frameworks for single-use code.

## 5. Data Integrity & Security by Default
- Enforce invariants at the **database/schema level** (unique constraints, foreign keys, transactions, tenant isolation) — not only in application memory.
- Validate all external inputs at system boundaries and use least-privilege credentials/tokens.
