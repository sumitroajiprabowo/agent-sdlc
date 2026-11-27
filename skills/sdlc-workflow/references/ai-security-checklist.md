# AI / LLM Security Checklist (On-Demand)

Consult only when the task touches LLM/agent features (prompts, tool calling, RAG, fine-tuning, model weights) during `/sdlc-spec`, `/sdlc-review`, `/sdlc-qa`.

## 1. Threat Model & Frameworks
- Map risks to **OWASP Top 10 for LLM Applications** and **OWASP Top 10 for Agentic Applications**; use **MITRE ATLAS** and **NIST AI RMF** (AI 600-1 GenAI profile) for high-risk systems.

## 2. Prompt Injection
- Treat retrieved docs, web pages, tool output, and user files as **untrusted data**, never instructions; keep system and user content separated.
- Run an **injection detector** (Meta Prompt Guard 2, LlamaFirewall) on untrusted input for high-risk flows.

## 3. Guardrails & Output Handling
- **Validate structured output** against a schema; never pass model output into shell, SQL, `eval`, or HTML without escaping.
- **Redact PII** before prompts/logs (Presidio) and enforce **policy rails** via NeMo Guardrails / Guardrails AI.

## 4. Agent Tool Access & Policy
- Grant **least-privilege tools** and scoped credentials; require **human approval** for destructive or money-moving actions.
- Enforce **authorization in code** (OPA, Cedar, OpenFGA) — never let the prompt decide authz; **bound loops, tokens, and cost**.

## 5. Red Teaming & Evals
- Run `promptfoo eval` / `promptfoo redteam` in CI on prompt or model changes; run **garak**, **PyRIT**, or **DeepTeam** before go-live.

## 6. Model & Supply Chain
- Prefer **`safetensors`**; scan pickled weights with **ModelScan** / **picklescan**; pin model versions/hashes and verify signatures (**OpenSSF model signing**).
- Generate an **SBOM / ML-BOM** (Syft, CycloneDX).

## 7. Monitoring
- Trace LLM calls with **OpenTelemetry GenAI semantic conventions** (Langfuse, Arize Phoenix); alert on **cost spikes**, refusal/error rates, and injection detections.
- Never log raw **secrets or PII** in prompts or traces.

If a tool is not installed, report `SKIPPED (not installed)` — never a fake `PASS`.
