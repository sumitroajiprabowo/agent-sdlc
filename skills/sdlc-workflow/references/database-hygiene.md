# Database Performance & Lock-Safe Migrations (On-Demand)

Consult this guide when writing queries, changing schemas, or reviewing DB changes (`/spec`, `/review`).

## 1. Query Performance
- Run **`EXPLAIN ANALYZE`** on new or non-trivial queries before shipping to catch full-table scans early.
- Eliminate **N+1 queries** using batched `IN` queries, joins, or data loaders.
- Enforce bounded `LIMIT` / cursor pagination on every list or export endpoint (never unbounded `SELECT *`).

## 2. Lock-Safe Production Migrations
- Create indexes non-blocking (e.g., PostgreSQL `CREATE INDEX CONCURRENTLY`) so live writes are not blocked.
- Set explicit `lock_timeout` and `statement_timeout` on DDL migrations; fail fast instead of queuing production traffic.
- Never run heavy full-table backfills inside a single migration transaction; batch backfills separately and follow **Expand & Contract**.

## 3. Connection Pooling & Transactions
- Configure explicit pool limits (`max_open`, `max_idle`, `conn_max_lifetime`) and query timeouts.
- Keep DB transactions short: **NEVER** make external HTTP/RPC calls while holding a DB transaction open.

## 4. Backups & Restore Drills
- Maintain automated daily backups to isolated storage and run periodic **restore drills in Staging** to verify RPO/RTO.
