#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_PACKAGE_ROOT, parseArgs, runDoctor, runInstall } from '../lib/installer.mjs';

const HELP_TEXT = `agent-sdlc — Universal, token-efficient SDLC skills, commands & orchestrator protocol

Usage:
  npx agent-sdlc [options]
  npx github:sumitroajiprabowo/agent-sdlc [options]

Targets (auto-detected if omitted):
  --claude            Install skills & 9 slash commands to ~/.claude/
  --codex             Install skills to ~/.codex/skills/ and ~/.agents/skills/
  --antigravity       Install skills to ~/.agents/skills/
  --cursor            Install skills to ~/.cursor/skills/
  --opencode          Install skills to ~/.config/opencode/skills/ and ~/.agents/skills/
  --local             Install ultra-compact prompt (<800 tokens) to ~/.agent-sdlc/LOCAL_PROMPT.md
  --project           Scaffold docs/, PR template, AGENTS.md, CLAUDE.md bridge & .gitignore
  --all               Install to claude, codex, antigravity, cursor, opencode, and local

Options:
  --optimize          (With --claude) Set opusplan, 200k cap, tool search & statusline in ~/.claude/settings.json
  --doctor            Run a read-only health & token-efficiency audit
  --no-orchestrator   Skip installing the multi-agent sdlc-orchestrator skill
  --dry-run           Preview planned changes without writing files
  --uninstall         Remove agent-sdlc managed files from selected targets
  -h, --help          Show help
  -v, --version       Show version
`;

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
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
    console.log('agent-sdlc --doctor');
    for (const c of report.checks) {
      console.log(`  [${c.level}] ${c.area}: ${c.message}`);
    }
    console.log(`Summary: ${report.okCount} ok, ${report.warnCount} warning(s)`);
    return;
  }

  const result = runInstall(parsed);
  const mode = parsed.uninstall ? 'Uninstall' : 'Install';
  console.log(`agent-sdlc (${mode}) targets: ${result.targets.join(', ')}`);
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
