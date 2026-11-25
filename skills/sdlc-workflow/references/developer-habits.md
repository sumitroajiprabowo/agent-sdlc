# Big Tech Developer Habits (On-Demand)

Engineering habits that keep velocity high, incidents rare, and codebases lean for both humans and AI agents.

## 1. Observability as Part of "Done"
- A feature is not done without **structured JSON logs** (`request_id`/`trace_id`), **1 success metric**, and **1 failure alert** (e.g. error rate >1% over 5m).
- Instrument critical paths before launch so issues are caught by alerts, not user reports.

## 2. Blameless Post-Mortems → Automated Guardrails
- After any production incident, ask *"why did the system allow this failure?"* rather than blaming individuals.
- Every post-mortem must produce at least **1 permanent automated guardrail**: a regression test, linter rule, DB constraint, or alert.

## 3. Delete Code & Feature Flag Hygiene
- Actively delete dead code, unused dependencies, and expired feature flags after rollout.
- Smaller, cleaner codebases have fewer bugs and consume far fewer AI agent tokens.

## 4. 15–20% Tech Debt Budget
- Reserve ~15–20% of sprint capacity for slow queries, flaky tests, dependency upgrades, and targeted refactors.
- Continuous small paydowns prevent risky, multi-month full rewrites.

## 5. Small PRs & High-Signal Reviews
- Keep PRs focused (`1 Issue = 1 PR`, ideally under ~300–400 changed lines).
- Explain **why** in the PR description, verify locally first, and never mix refactors with urgent fixes.

## 6. Definition of Done (DoD)
- [ ] Static checks, unit/integration tests, and critical E2E checks pass
- [ ] Peer reviewed (`/review`) with no unresolved P0/P1 findings
- [ ] Verified in Staging/Preview with logs & metrics clean
- [ ] Docs / ADR updated if contracts, schemas, or architecture changed
