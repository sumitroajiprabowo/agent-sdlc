#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_PACKAGE_ROOT, parseArgs, runDoctor, runInstall } from '../lib/installer.js';

const HELP_TEXT = `sdlc-kit — SDLC skills, slash commands & multi-agent orchestrator protocol

Usage:
  npx sdlc-kit [options]
  npx github:sumitroajiprabowo/sdlc-kit [options]

Targets (auto-detected if omitted):
  --claude            Install skills, 9 slash commands & 2 subagents to ~/.claude/
  --codex             Install skills & 9 prompts to ~/.codex/ and ~/.agents/skills/
  --antigravity       Install skills to ~/.agents/skills/
  --cursor            Install skills & commands to ~/.cursor/
  --opencode          Install skills & commands to ~/.config/opencode/ and ~/.agents/skills/
  --local             Install a compact prompt (<800 tokens) to ~/.sdlc-kit/LOCAL_PROMPT.md
  --project           Scaffold docs/, PR template, AGENTS.md, CLAUDE.md bridge & .gitignore
  --all               Install to claude, codex, antigravity, cursor, opencode, and local

Options:
  --optimize          (With --claude) Add opusplan, 200k cap, tool search & statusline (ctx %, cost, tokens) to ~/.claude/settings.json (keeps your existing values)
  --doctor            Run a read-only health & token-efficiency audit
  --no-orchestrator   Skip installing the multi-agent sdlc-orchestrator skill
  --dry-run           Preview planned changes without writing files
  --uninstall         Remove sdlc-kit managed files from selected targets (skips files you edited)
  --force             Overwrite/remove files even if they were not installed by sdlc-kit
  -h, --help          Show help
  -v, --version       Show version
`;

function main() {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  if (parsed.help) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  if (parsed.version) {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(DEFAULT_PACKAGE_ROOT, 'package.json'), 'utf8'),
    );
    console.log(pkg.version);
    return;
  }

  if (parsed.doctor) {
    const report = runDoctor();
    console.log('sdlc-kit --doctor');
    for (const c of report.checks) {
      console.log(`  [${c.level}] ${c.area}: ${c.message}`);
    }
    console.log(`Summary: ${report.okCount} ok, ${report.warnCount} warning(s)`);
    return;
  }

  const result = runInstall(parsed);
  const mode = parsed.uninstall ? 'Uninstall' : 'Install';
  console.log(`sdlc-kit (${mode}) targets: ${result.targets.join(', ')}`);
  for (const action of result.actions) {
    console.log(`  - ${action}`);
  }
  for (const warn of result.warnings) {
    console.log(`  ! ${warn}`);
  }
  if (result.actions.length === 0) {
    console.log('  (no changes)');
  }
}

main();
