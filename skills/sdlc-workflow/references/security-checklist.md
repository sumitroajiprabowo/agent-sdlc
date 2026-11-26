# Security & Multi-Tenant Checklist (On-Demand)

Consult this checklist when touching authentication, authorization, payments, or external inputs (`/sdlc-spec`, `/sdlc-review`).

## 1. AuthN / AuthZ & Multi-Tenant Isolation
- Enforce **server-side default-deny** RBAC/ABAC on every endpoint and mutation — never trust client-supplied role or tenant IDs.
- Scope every DB query (`WHERE tenant_id = ?`) and ownership check to prevent **IDOR** and cross-tenant data leaks.

## 2. Session & Token Hygiene
- Use short-lived access tokens with **refresh token rotation**; revoke sessions on logout, password reset, or role downgrade.
- Store browser session tokens in `HttpOnly`, `Secure`, `SameSite` cookies.

## 3. OWASP & Boundary Protection
- Use **parameterized queries only** (never string-concatenated SQL/shell commands).
- Validate/sanitize all external inputs at system boundaries and enforce **SSRF allowlists** on any server-side outbound URLs.
- Configure strict CORS, CSRF protection for cookie-auth routes, and **rate limiting** on auth/public endpoints.

## 4. PII Masking & Immutable Audit Trail
- Never log passwords, tokens, API keys, or raw PII (mask or omit sensitive fields).
- Emit an **immutable audit log** (*actor, action, target, timestamp, before → after*) for sensitive admin, billing, or permission changes.
