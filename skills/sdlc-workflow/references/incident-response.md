# Incident Response & Severity Guide (On-Demand)

Consult this guide during production outages, hotfixes, and post-mortems.

## 1. Severity Classification
- **SEV1 (Critical)**: full outage, data loss, or active security breach → immediate all-hands response, mitigate/rollback first.
- **SEV2 (Major)**: core feature degraded or elevated 5xx error rate → urgent response, mitigate or patch same day.
- **SEV3 (Minor)**: partial/non-critical impact with workaround → schedule normal `fix/` PR.
- **SEV4 (Low)**: cosmetic or minor annoyance → backlog.

## 2. First 5 Minutes Rule: Mitigate First, Investigate Second
1. Confirm blast radius via metrics/logs (5xx rate, latency, recent deploy/config change).
2. Restore service immediately: **rollback** immutable image tag, disable the **Feature Flag**, or shed/shift traffic before deep debugging.
3. Never run ad-hoc destructive commands or unreviewed schema drops in Production.

## 3. Team Status Communication Template
```markdown
- **Incident**: [SEV-X] <short summary>
- **Impact**: <who/what is affected>
- **Current Action**: <e.g., rolling back v1.4.2 -> v1.4.1>
- **Next Update**: <ETA, e.g., in 15 minutes>
```

## 4. Post-Incident (Within 48 Hours)
Write a short **blameless post-mortem** (*Timeline, Root Cause, Detection Gap*) and create **at least 1 automated guardrail** (regression test, alert, or DB constraint) so the failure cannot repeat.
