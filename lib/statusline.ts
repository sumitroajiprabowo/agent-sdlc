// Claude Code status line: context window usage, cost, and tokens, so you know when to /sdlc-handoff and /clear.
// Self-contained on purpose: the installer copies the compiled file to ~/.claude/ as-is.
import os from 'node:os';

interface StatusInput {
  context_window?: {
    used_percentage?: number | string;
    total_input_tokens?: number | string;
    total_output_tokens?: number | string;
  };
  cost?: { total_cost_usd?: number | string };
  model?: { display_name?: string };
  workspace?: { current_dir?: string };
  cwd?: string;
}

const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function parseNum(v: number | string | undefined): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function fmtTokens(n: number): string {
  if (n < 1000) return String(Math.trunc(n));
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function render(raw: string): string {
  let data: StatusInput = {};
  try {
    data = JSON.parse(raw || '{}') as StatusInput;
  } catch {
    // malformed input: fall through to an empty status line
  }
  const model = data.model?.display_name ?? '';
  let cwd = data.workspace?.current_dir ?? data.cwd ?? '';
  const home = os.homedir();
  if (home && cwd.startsWith(home)) cwd = `~${cwd.slice(home.length)}`;

  const cost = parseNum(data.cost?.total_cost_usd);
  const inTok = parseNum(data.context_window?.total_input_tokens);
  const outTok = parseNum(data.context_window?.total_output_tokens);
  const metrics: string[] = [];
  if (cost !== undefined) metrics.push(`$${cost.toFixed(2)}`);
  const tokParts: string[] = [];
  if (inTok !== undefined) tokParts.push(`in ${fmtTokens(inTok)}`);
  if (outTok !== undefined) tokParts.push(`out ${fmtTokens(outTok)}`);
  if (tokParts.length > 0) metrics.push(tokParts.join('/'));
  const metricsSeg = metrics.length > 0 ? `  ${DIM}${metrics.join('  ')}${RESET}` : '';

  const used = parseNum(data.context_window?.used_percentage);
  if (used === undefined) {
    return `${DIM}${cwd}${RESET}${metricsSeg}  ${DIM}${model}${RESET}`;
  }

  const pct = Math.trunc(used);
  let color = '\x1b[32m';
  let label = `ctx ${pct}%`;
  if (pct >= 85) {
    color = '\x1b[31m';
    label = `ctx ${pct}% (/sdlc-handoff & /clear!)`;
  } else if (pct >= 70) {
    color = '\x1b[33m';
    label = `ctx ${pct}% (/sdlc-handoff)`;
  } else if (pct >= 50) {
    color = '\x1b[36m';
  }
  return `${DIM}${cwd}${RESET}  ${color}${label}${RESET}${metricsSeg}  ${DIM}${model}${RESET}`;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  process.stdout.write(render(input));
});
