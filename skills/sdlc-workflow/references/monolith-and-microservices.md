# Modular Monolith & Microservices Guide (On-Demand)

Consult this guide when designing system boundaries (`/sdlc-spec`, `/sdlc-adr`) or evolving multi-service architectures.

## Part 1 — Modular Monolith (Recommended Default)
Start here unless you have a proven reason to distribute. You get ACID transactions, zero network hops, and simple deploys while keeping code cleanly decoupled:
- **Organize by Domain Module**, not giant technical folders (e.g. `modules/billing/`, `modules/auth/`, `modules/notifications/`).
- **Enforce Strict Module Boundaries**: Module A calls Module B **only** through Module B's public facade/interface (enforce via Go `internal/`, TypeScript package exports, or lint boundary rules). Never import another module's internal models or helpers directly.
- **Logical Data Ownership**: Even in one database, each module owns its tables. Avoid cross-module direct writes or tangled foreign-key joins across domain boundaries.
- **Simple Async First**: Use in-process workers or a DB-backed job queue before introducing dedicated message brokers.
- **When to Extract a Microservice**: Extract only for proven bottlenecks — independent scaling needs, independent team/release cadence, strict fault/security isolation, or a different runtime/language requirement.

## Part 2 — Microservices & Distributed Systems
Once a service is split across network boundaries, enforce these non-negotiable rules:
- **Database-per-Service**: Service B must NEVER query Service A's database tables directly; communicate only via versioned APIs or events.
- **Contract-First & Additive-Only Evolution**: Evolve OpenAPI, Protobuf, and event schemas additively (optional fields first, dual-support, deprecate, remove only after consumers migrate).
- **Transactional Outbox Pattern**: Avoid dual-write bugs (DB commit succeeds, broker publish fails). Write domain state + outbox event in the **same DB transaction**, then relay asynchronously.
- **Distributed Tracing**: Propagate `X-Request-ID` / W3C `traceparent` from edge/gateway through every downstream call and structured log.
- **Saga / Compensating Actions**: Replace distributed 2PC transactions with idempotent step-by-step workflows and explicit compensating actions on partial failure.
- **Resilience Defaults**: Enforce explicit timeouts, bounded retries with exponential backoff + jitter, and circuit breakers on every inter-service call.
