// Claude Code status line: context window usage, so you know when to /handoff and /clear.
// Self-contained on purpose: the installer copies the compiled file to ~/.claude/ as-is.
import os from 'node:os';

interface StatusInput {
  context_window?: { used_percentage?: number | string };
  model?: { display_name?: string };
  workspace?: { current_dir?: string };
  cwd?: string;
}

const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

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

  const used = Number(data.context_window?.used_percentage);
  if (data.context_window?.used_percentage === undefined || Number.isNaN(used)) {
    return `${DIM}${cwd}  ${model}${RESET}`;
  }

  const pct = Math.trunc(used);
  let color = '\x1b[32m';
  let label = `ctx ${pct}%`;
  if (pct >= 85) {
    color = '\x1b[31m';
    label = `ctx ${pct}% (/handoff & /clear!)`;
  } else if (pct >= 70) {
    color = '\x1b[33m';
    label = `ctx ${pct}% (/handoff)`;
  } else if (pct >= 50) {
    color = '\x1b[36m';
  }
  return `${DIM}${cwd}${RESET}  ${color}${label}${RESET}  ${DIM}${model}${RESET}`;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  process.stdout.write(render(input));
});
