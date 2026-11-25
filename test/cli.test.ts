import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  COMMAND_FILES,
  DEFAULT_PACKAGE_ROOT,
  detectTargets,
  parseArgs,
  runDoctor,
  runInstall,
} from '../lib/installer.js';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('parseArgs handles single targets, flags, and rejects unknown flags', () => {
  const opts = parseArgs(['--claude', '--optimize', '--no-orchestrator', '--dry-run']);
  assert.deepEqual(opts.targets, ['claude']);
  assert.equal(opts.optimize, true);
  assert.equal(opts.includeOrchestrator, false);
  assert.equal(opts.dryRun, true);

  assert.throws(() => parseArgs(['--unknown-flag']), /Unknown flag/);
});

test('detectTargets discovers existing agent dirs and falls back to antigravity', () => {
  const emptyHome = makeTempDir('agent-sdlc-empty-');
  assert.deepEqual(detectTargets(emptyHome), ['antigravity']);

  const claudeCodexHome = makeTempDir('agent-sdlc-cc-');
  fs.mkdirSync(path.join(claudeCodexHome, '.claude'));
  fs.mkdirSync(path.join(claudeCodexHome, '.codex'));
  assert.deepEqual(detectTargets(claudeCodexHome), ['claude', 'codex']);
});

test('--claude installs 2 skills + 9 commands, and --no-orchestrator skips orchestrator', () => {
  const home = makeTempDir('agent-sdlc-claude-');
  const res = runInstall({ targets: ['claude'], homeDir: home });
  assert.equal(res.warnings.length, 0);
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow/SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow/references/architecture-checklist.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow/references/monolith-and-microservices.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow/references/clean-code.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow/references/quality-gates.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow/references/security-checklist.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow/references/database-hygiene.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow/references/incident-response.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow/references/developer-habits.md')));
  assert.ok(fs.existsSync(path.join(home, '.claude/skills/sdlc-orchestrator/SKILL.md')));
  for (const cmd of COMMAND_FILES) {
    assert.ok(fs.existsSync(path.join(home, '.claude/commands', cmd)));
  }

  const home2 = makeTempDir('agent-sdlc-claude-no-orch-');
  runInstall({ targets: ['claude'], homeDir: home2, includeOrchestrator: false });
  assert.ok(fs.existsSync(path.join(home2, '.claude/skills/sdlc-workflow/SKILL.md')));
  assert.equal(fs.existsSync(path.join(home2, '.claude/skills/sdlc-orchestrator')), false);
});

test('--claude --optimize merges settings safely, preserves plugins/hooks, and creates backup', () => {
  const home = makeTempDir('agent-sdlc-opt-');
  const claudeDir = path.join(home, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  const existing = {
    enabledPlugins: { 'gopls-lsp@claude-plugins-official': true },
    hooks: { PreToolUse: [{ matcher: 'Bash' }] },
    env: { CUSTOM_VAR: 'keep-me' },
  };
  fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify(existing, null, 2));

  runInstall({ targets: ['claude'], optimize: true, homeDir: home });

  assert.ok(fs.existsSync(path.join(claudeDir, 'settings.json.agent-sdlc.bak')));
  const updated = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
  assert.equal(updated.model, 'opusplan');
  assert.equal(updated.env.CUSTOM_VAR, 'keep-me');
  assert.equal(updated.env.CLAUDE_CODE_DISABLE_1M_CONTEXT, '1');
  assert.equal(updated.env.ENABLE_TOOL_SEARCH, 'auto:5');
  assert.deepEqual(updated.enabledPlugins, existing.enabledPlugins);
  assert.deepEqual(updated.hooks, existing.hooks);
  assert.ok(fs.existsSync(path.join(claudeDir, 'statusline-command.sh')));
});

test('--codex, --antigravity, and --local install to expected paths', () => {
  const home = makeTempDir('agent-sdlc-multi-');
  runInstall({ targets: ['codex'], homeDir: home });
  assert.ok(fs.existsSync(path.join(home, '.codex/skills/sdlc-workflow/SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.codex/skills/sdlc-workflow/references/architecture-checklist.md')));
  assert.ok(fs.existsSync(path.join(home, '.codex/skills/sdlc-workflow/references/monolith-and-microservices.md')));
  assert.ok(fs.existsSync(path.join(home, '.agents/skills/sdlc-workflow/SKILL.md')));

  const homeAg = makeTempDir('agent-sdlc-ag-');
  runInstall({ targets: ['antigravity'], homeDir: homeAg });
  assert.ok(fs.existsSync(path.join(homeAg, '.agents/skills/sdlc-workflow/SKILL.md')));
  assert.ok(fs.existsSync(path.join(homeAg, '.agents/skills/sdlc-workflow/references/clean-code.md')));
  assert.ok(fs.existsSync(path.join(homeAg, '.agents/skills/sdlc-workflow/references/quality-gates.md')));
  assert.ok(fs.existsSync(path.join(homeAg, '.agents/skills/sdlc-workflow/references/security-checklist.md')));
  assert.ok(fs.existsSync(path.join(homeAg, '.agents/skills/sdlc-workflow/references/database-hygiene.md')));
  assert.ok(fs.existsSync(path.join(homeAg, '.agents/skills/sdlc-workflow/references/incident-response.md')));
  assert.ok(fs.existsSync(path.join(homeAg, '.agents/skills/sdlc-workflow/references/developer-habits.md')));
  assert.equal(fs.existsSync(path.join(homeAg, '.codex')), false);

  runInstall({ targets: ['local'], homeDir: home });
  const localPrompt = path.join(home, '.agent-sdlc/LOCAL_PROMPT.md');
  assert.ok(fs.existsSync(localPrompt));
  assert.ok(fs.statSync(localPrompt).size < 2600);
});

test('--project scaffolds missing files, preserves existing AGENTS.md, and updates .gitignore idempotently', () => {
  const cwd = makeTempDir('agent-sdlc-proj-');
  const home = makeTempDir('agent-sdlc-proj-home-');
  fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# Custom Project Agents\n');
  fs.writeFileSync(path.join(cwd, '.gitignore'), 'node_modules/\n');

  const res1 = runInstall({ targets: ['project'], cwd, homeDir: home });
  assert.ok(res1.warnings.some((w) => w.includes('AGENTS.md')));
  assert.equal(fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8'), '# Custom Project Agents\n');
  assert.equal(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
  assert.ok(fs.existsSync(path.join(cwd, 'docs/INDEX.md')));
  assert.ok(fs.existsSync(path.join(cwd, 'docs/adr/TEMPLATE.md')));
  assert.ok(fs.existsSync(path.join(cwd, '.github/PULL_REQUEST_TEMPLATE.md')));

  const gi = fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8');
  assert.ok(gi.includes('.claude/HANDOFF.md'));
  assert.ok(gi.includes('CLAUDE.local.md'));

  // Second run must be idempotent
  const res2 = runInstall({ targets: ['project'], cwd, homeDir: home });
  assert.equal(res2.actions.length, 0);
});

test('--dry-run writes nothing and --uninstall removes only agent-sdlc files', () => {
  const home = makeTempDir('agent-sdlc-dry-');
  const allTargets = parseArgs(['--all']).targets;
  assert.deepEqual(allTargets, ['claude', 'codex', 'antigravity', 'cursor', 'opencode', 'local']);
  runInstall({ targets: allTargets, dryRun: true, homeDir: home });
  assert.equal(fs.readdirSync(home).length, 0);

  // Install, add custom user files, then uninstall
  runInstall({ targets: ['claude'], homeDir: home });
  const customSkill = path.join(home, '.claude/skills/my-custom/SKILL.md');
  fs.mkdirSync(path.dirname(customSkill), { recursive: true });
  fs.writeFileSync(customSkill, '# keep me\n');

  runInstall({ targets: ['claude'], uninstall: true, homeDir: home });
  assert.equal(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow')), false);
  assert.equal(fs.existsSync(path.join(home, '.claude/commands/start.md')), false);
  assert.ok(fs.existsSync(customSkill));
});

test('public repo leakage check: zero internal/company references in shipped files', () => {
  const forbidden = ['ckt', 'sidekem', 'bukaloker', 'misindo', 'llm-wiki-mcp', 'freeradius', '/Users/'];
  const dirsToScan = ['skills', 'commands', 'templates', 'lib'];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const content = fs.readFileSync(full, 'utf8');
        for (const word of forbidden) {
          assert.equal(
            content.toLowerCase().includes(word.toLowerCase()),
            false,
            `Forbidden reference "${word}" found in ${full}`,
          );
        }
      }
    }
  }

  for (const d of dirsToScan) {
    walk(path.join(DEFAULT_PACKAGE_ROOT, d));
  }
});

test('CLI subprocess smoke tests (--help, --version, invalid flag)', () => {
  const cliPath = path.join(DEFAULT_PACKAGE_ROOT, 'dist/bin/cli.js');
  const helpOut = execFileSync(process.execPath, [cliPath, '--help'], { encoding: 'utf8' });
  assert.ok(helpOut.includes('agent-sdlc'));
  assert.ok(helpOut.includes('--claude'));

  const verOut = execFileSync(process.execPath, [cliPath, '--version'], { encoding: 'utf8' }).trim();
  assert.equal(verOut, '0.1.0');

  assert.throws(
    () => execFileSync(process.execPath, [cliPath, '--nope'], { stdio: 'pipe' }),
    (err: NodeJS.ErrnoException & { status?: number }) => err.status !== 0,
  );
});

test('agentskills.io and command frontmatter compliance', () => {
  const skillsDir = path.join(DEFAULT_PACKAGE_ROOT, 'skills');
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), `Missing SKILL.md in ${entry.name}`);
    const content = fs.readFileSync(skillPath, 'utf8');
    const lines = content.split(/\r?\n/);
    assert.ok(lines.length <= 100, `${entry.name}/SKILL.md has ${lines.length} lines (>100)`);

    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(match, `Missing YAML frontmatter in ${entry.name}/SKILL.md`);
    const fm: Record<string, string> = {};
    for (const line of (match[1] ?? '').split('\n')) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }

    assert.equal(fm.name, entry.name, `name must match folder ${entry.name}`);
    assert.match(fm.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(fm.name.length <= 64);
    assert.ok(fm.license, `Missing license in ${entry.name}/SKILL.md`);

    const rawDesc = fm.description || '';
    const isQuoted = rawDesc.startsWith('"') && rawDesc.endsWith('"');
    const desc = isQuoted ? rawDesc.slice(1, -1) : rawDesc;
    if (!isQuoted) {
      assert.equal(desc.includes(': '), false, `Unquoted ': ' in ${entry.name} description`);
    }
    assert.ok(desc.length >= 1 && desc.length <= 1024);
    assert.equal(/[<>]/.test(desc), false, `Angle brackets disallowed in ${entry.name} description`);
    assert.ok(desc.includes('Use when'), `Description in ${entry.name} must include 'Use when' trigger`);
  }

  const cmdDir = path.join(DEFAULT_PACKAGE_ROOT, 'commands');
  for (const file of fs.readdirSync(cmdDir)) {
    if (!file.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(cmdDir, file), 'utf8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(match, `Missing YAML frontmatter in commands/${file}`);
    const descLine = (match[1] ?? '').split('\n').find((l) => l.startsWith('description:'));
    assert.ok(descLine, `Missing description in commands/${file}`);
    const rawDesc = descLine.slice('description:'.length).trim();
    assert.ok(rawDesc.startsWith('"') && rawDesc.endsWith('"'), `Description in commands/${file} must be double-quoted`);
    assert.equal(/[<>]/.test(rawDesc), false, `Angle brackets disallowed in commands/${file} description`);
  }
});

test('repeated --claude --optimize preserves original .bak file', () => {
  const home = makeTempDir('agent-sdlc-bak-');
  const claudeDir = path.join(home, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  const original = '{"theme":"light"}\n';
  fs.writeFileSync(path.join(claudeDir, 'settings.json'), original);

  runInstall({ targets: ['claude'], optimize: true, homeDir: home });
  const bakPath = path.join(claudeDir, 'settings.json.agent-sdlc.bak');
  assert.equal(fs.readFileSync(bakPath, 'utf8'), original);

  // Second run must NOT overwrite original backup
  runInstall({ targets: ['claude'], optimize: true, homeDir: home });
  assert.equal(fs.readFileSync(bakPath, 'utf8'), original);
});

test('--cursor and --opencode install, detect, and uninstall cleanly', () => {
  const home = makeTempDir('agent-sdlc-cur-oc-');
  fs.mkdirSync(path.join(home, '.cursor'));
  fs.mkdirSync(path.join(home, '.config', 'opencode'), { recursive: true });
  assert.deepEqual(detectTargets(home), ['cursor', 'opencode']);

  runInstall({ targets: ['cursor', 'opencode'], homeDir: home });
  assert.ok(fs.existsSync(path.join(home, '.cursor/skills/sdlc-workflow/SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.config/opencode/skills/sdlc-workflow/SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.agents/skills/sdlc-workflow/SKILL.md')));

  runInstall({ targets: ['cursor', 'opencode'], uninstall: true, homeDir: home });
  assert.equal(fs.existsSync(path.join(home, '.cursor/skills/sdlc-workflow')), false);
  assert.equal(fs.existsSync(path.join(home, '.config/opencode/skills/sdlc-workflow')), false);
});

test('--project preserves pre-existing CLAUDE.md without overwriting', () => {
  const cwd = makeTempDir('agent-sdlc-claudemd-');
  const home = makeTempDir('agent-sdlc-claudemd-home-');
  fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# Existing CLAUDE\n');
  runInstall({ targets: ['project'], cwd, homeDir: home });
  assert.equal(fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'), '# Existing CLAUDE\n');
});

test('runDoctor reports warnings on bloated/unoptimized setup and 0 warnings on clean setup', () => {
  const home = makeTempDir('agent-sdlc-doc-bad-');
  const cwd = makeTempDir('agent-sdlc-doc-proj-');
  fs.mkdirSync(path.join(home, '.claude/skills'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude/settings.json'), '{"model":"opus"}');
  for (let i = 0; i < 22; i++) {
    fs.mkdirSync(path.join(home, '.claude/skills', `s-${i}`));
  }
  fs.mkdirSync(path.join(cwd, '.git'));
  fs.mkdirSync(path.join(cwd, '.claude/rules'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.claude/rules/huge.md'), 'x'.repeat(20000));

  const bad = runDoctor({ homeDir: home, cwd });
  assert.ok(bad.warnCount >= 4);

  const cleanHome = makeTempDir('agent-sdlc-doc-ok-');
  const cleanCwd = makeTempDir('agent-sdlc-doc-ok-proj-');
  fs.mkdirSync(path.join(cleanCwd, '.git'));
  runInstall({ targets: ['claude'], optimize: true, homeDir: cleanHome });
  runInstall({ targets: ['project'], cwd: cleanCwd, homeDir: cleanHome });
  const ok = runDoctor({ homeDir: cleanHome, cwd: cleanCwd });
  assert.equal(ok.warnCount, 0);
});

test('statusline-command.sh works via node fallback when jq is unavailable', () => {
  const script = path.join(DEFAULT_PACKAGE_ROOT, 'templates/claude/statusline-command.sh');
  const nodeDir = path.dirname(process.execPath);
  const out = execFileSync('/bin/bash', [script], {
    input: JSON.stringify({
      context_window: { used_percentage: 74 },
      model: { display_name: 'Sonnet' },
      workspace: { current_dir: '/tmp/demo' },
    }),
    env: { HOME: '/tmp', PATH: `${nodeDir}:/usr/bin:/bin` },
    encoding: 'utf8',
  });
  assert.ok(out.includes('ctx 74% (/handoff)'));
  assert.ok(out.includes('Sonnet'));
});

test('CLI subprocess --doctor smoke test', () => {
  const cliPath = path.join(DEFAULT_PACKAGE_ROOT, 'dist/bin/cli.js');
  const out = execFileSync(process.execPath, [cliPath, '--doctor'], { encoding: 'utf8' });
  assert.ok(out.includes('agent-sdlc --doctor'));
  assert.ok(out.includes('Summary:'));
});

test('install never clobbers a user-owned command; --force overrides', () => {
  const home = makeTempDir('agent-sdlc-noclobber-');
  const review = path.join(home, '.claude/commands/review.md');
  fs.mkdirSync(path.dirname(review), { recursive: true });
  fs.writeFileSync(review, 'my own review command\n');

  const res = runInstall({ targets: ['claude'], homeDir: home });
  assert.equal(fs.readFileSync(review, 'utf8'), 'my own review command\n');
  assert.ok(res.warnings.some((w) => w.includes('review.md') && w.includes('--force')));

  runInstall({ targets: ['claude'], homeDir: home, force: true });
  assert.notEqual(fs.readFileSync(review, 'utf8'), 'my own review command\n');
});

test('uninstall keeps files modified after install and removes the manifest when done', () => {
  const home = makeTempDir('agent-sdlc-uninst-');
  runInstall({ targets: ['claude', 'local'], homeDir: home });
  assert.ok(fs.existsSync(path.join(home, '.agent-sdlc/manifest.json')));

  const edited = path.join(home, '.claude/commands/ship.md');
  fs.appendFileSync(edited, '\n# my tweak\n');
  const res = runInstall({ targets: ['claude', 'local'], uninstall: true, homeDir: home });

  assert.ok(fs.existsSync(edited));
  assert.ok(res.warnings.some((w) => w.includes('ship.md') && w.includes('modified')));
  assert.equal(fs.existsSync(path.join(home, '.claude/commands/start.md')), false);
  assert.equal(fs.existsSync(path.join(home, '.claude/skills/sdlc-workflow')), false);
  assert.equal(fs.existsSync(path.join(home, '.agent-sdlc/LOCAL_PROMPT.md')), false);
});

test('uninstall removes legacy (pre-manifest) installs only when content matches the package', () => {
  const home = makeTempDir('agent-sdlc-legacy-');
  runInstall({ targets: ['claude'], homeDir: home });
  fs.rmSync(path.join(home, '.agent-sdlc'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude/commands/qa.md'), 'user rewrote this\n');

  runInstall({ targets: ['claude'], uninstall: true, homeDir: home });
  assert.equal(fs.existsSync(path.join(home, '.claude/commands/adr.md')), false);
  assert.ok(fs.existsSync(path.join(home, '.claude/commands/qa.md')));
});

test('--optimize keeps user model/env and --uninstall reverts only what it added', () => {
  const home = makeTempDir('agent-sdlc-revert-');
  const claudeDir = path.join(home, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  const settingsPath = path.join(claudeDir, 'settings.json');
  fs.writeFileSync(
    settingsPath,
    JSON.stringify({ model: 'opus', env: { BASH_MAX_OUTPUT_LENGTH: '99999', KEEP: '1' }, theme: 'dark' }),
  );

  const res = runInstall({ targets: ['claude'], optimize: true, homeDir: home });
  const optimized = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.equal(optimized.model, 'opus');
  assert.equal(optimized.env.BASH_MAX_OUTPUT_LENGTH, '99999');
  assert.equal(optimized.env.ENABLE_TOOL_SEARCH, 'auto:5');
  assert.ok(res.warnings.some((w) => w.includes('Kept existing model')));

  runInstall({ targets: ['claude'], uninstall: true, homeDir: home });
  const reverted = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.deepEqual(reverted, { model: 'opus', env: { BASH_MAX_OUTPUT_LENGTH: '99999', KEEP: '1' }, theme: 'dark' });
  assert.equal(fs.existsSync(path.join(claudeDir, 'statusline-command.sh')), false);
});

test('upgrade prunes stale unmodified files and doctor flags an outdated install', () => {
  const home = makeTempDir('agent-sdlc-upgrade-');
  runInstall({ targets: ['claude'], homeDir: home });
  const stale = path.join(home, '.claude/skills/sdlc-workflow/references/old-removed.md');
  fs.writeFileSync(stale, 'from an older version\n');
  const manifestPath = path.join(home, '.agent-sdlc/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  manifest.files[stale] = crypto.createHash('sha256').update('from an older version\n').digest('hex');
  manifest.version = '0.0.1';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));

  const cwd = makeTempDir('agent-sdlc-upgrade-cwd-');
  const before = runDoctor({ homeDir: home, cwd });
  assert.ok(before.checks.some((c) => c.area === 'version' && c.level === 'WARN'));

  runInstall({ targets: ['claude'], homeDir: home });
  assert.equal(fs.existsSync(stale), false);
  const after = runDoctor({ homeDir: home, cwd });
  assert.ok(after.checks.some((c) => c.area === 'version' && c.level === 'OK'));
});

test('--dry-run with existing manifest does not modify it', () => {
  const home = makeTempDir('agent-sdlc-dry-manifest-');
  runInstall({ targets: ['claude'], homeDir: home });
  const manifestPath = path.join(home, '.agent-sdlc/manifest.json');
  const before = fs.readFileSync(manifestPath, 'utf8');
  runInstall({ targets: ['claude'], uninstall: true, dryRun: true, homeDir: home });
  assert.equal(fs.readFileSync(manifestPath, 'utf8'), before);
  assert.ok(fs.existsSync(path.join(home, '.claude/commands/start.md')));
});

test('--cursor and --opencode also install and uninstall the 9 slash commands', () => {
  const home = makeTempDir('agent-sdlc-cmds-');
  runInstall({ targets: ['cursor', 'opencode'], homeDir: home });
  for (const cmd of COMMAND_FILES) {
    assert.ok(fs.existsSync(path.join(home, '.cursor/commands', cmd)));
    assert.ok(fs.existsSync(path.join(home, '.config/opencode/command', cmd)));
  }
  runInstall({ targets: ['cursor', 'opencode'], uninstall: true, homeDir: home });
  for (const cmd of COMMAND_FILES) {
    assert.equal(fs.existsSync(path.join(home, '.cursor/commands', cmd)), false);
    assert.equal(fs.existsSync(path.join(home, '.config/opencode/command', cmd)), false);
  }
});

test('versions stay in sync across package.json, plugin.json, and CHANGELOG', () => {
  const read = (rel: string): string => fs.readFileSync(path.join(DEFAULT_PACKAGE_ROOT, rel), 'utf8');
  const pkg = JSON.parse(read('package.json'));
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  assert.equal(plugin.version, pkg.version);
  assert.match(read('CHANGELOG.md'), new RegExp(`^## \\[${pkg.version.replaceAll('.', '\\.')}\\]`, 'm'));
  assert.equal(pkg.engines.node, '>=20.0.0');
});

test('token budget: slim frontmatter descriptions and short commands', () => {
  const root = DEFAULT_PACKAGE_ROOT;
  for (const skill of ['sdlc-workflow', 'sdlc-orchestrator']) {
    const body = fs.readFileSync(path.join(root, 'skills', skill, 'SKILL.md'), 'utf8');
    const desc = body.match(/^description:\s*"(.*)"\s*$/m)?.[1] ?? '';
    assert.ok(desc.length <= 400, `${skill} description is ${desc.length} chars`);
  }
  for (const cmd of COMMAND_FILES) {
    const lines = fs.readFileSync(path.join(root, 'commands', cmd), 'utf8').split('\n').length;
    assert.ok(lines <= 30, `${cmd} has ${lines} lines`);
  }
});

test('doctor handles CRLF rule files and flags plugin + npx duplicate installs', () => {
  const home = makeTempDir('agent-sdlc-dup-');
  const cwd = makeTempDir('agent-sdlc-dup-cwd-');
  fs.mkdirSync(path.join(cwd, '.claude/rules'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, '.claude/rules/scoped.md'),
    `---\r\npaths:\r\n  - "src/**"\r\n---\r\n${'x'.repeat(20000)}`,
  );
  runInstall({ targets: ['claude'], homeDir: home });
  const pluginsDir = path.join(home, '.claude/plugins');
  fs.mkdirSync(pluginsDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginsDir, 'installed_plugins.json'),
    JSON.stringify({ plugins: { 'agent-sdlc@agent-sdlc': [{}] } }),
  );
  const report = runDoctor({ homeDir: home, cwd });
  assert.ok(report.checks.some((c) => c.area === 'duplicate-install' && c.level === 'WARN'));
  assert.ok(report.checks.some((c) => c.area === 'project-rules' && c.level === 'OK'));
});
