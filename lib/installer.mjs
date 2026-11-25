import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_PACKAGE_ROOT = path.resolve(__dirname, '..');

export const SKILL_NAMES = ['sdlc-workflow', 'sdlc-orchestrator'];
export const COMMAND_FILES = [
  'spec.md',
  'start.md',
  'handoff.md',
  'pickup.md',
  'handoff-pr.md',
  'adr.md',
  'qa.md',
  'review.md',
  'ship.md',
];

const CLAUDE_OPTIMIZE_ENV = {
  CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet',
  CLAUDE_CODE_DISABLE_1M_CONTEXT: '1',
  ENABLE_TOOL_SEARCH: 'auto:5',
  CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '70',
  BASH_MAX_OUTPUT_LENGTH: '15000',
  MAX_MCP_OUTPUT_TOKENS: '10000',
};

const PROJECT_GITIGNORE_ENTRIES = [
  '.claude/HANDOFF.md',
  'CLAUDE.local.md',
  '.claude/settings.local.json',
];

/**
 * Parse CLI arguments into installer options.
 * @param {string[]} argv
 * @returns {{ targets: string[], optimize: boolean, includeOrchestrator: boolean, dryRun: boolean, uninstall: boolean, doctor: boolean, help: boolean, version: boolean }}
 */
export function parseArgs(argv) {
  const targets = new Set();
  let optimize = false;
  let includeOrchestrator = true;
  let dryRun = false;
  let uninstall = false;
  let doctor = false;
  let help = false;
  let version = false;

  for (const arg of argv) {
    switch (arg) {
      case '--claude':
        targets.add('claude');
        break;
      case '--codex':
        targets.add('codex');
        break;
      case '--antigravity':
        targets.add('antigravity');
        break;
      case '--cursor':
        targets.add('cursor');
        break;
      case '--opencode':
        targets.add('opencode');
        break;
      case '--local':
        targets.add('local');
        break;
      case '--project':
        targets.add('project');
        break;
      case '--all':
        targets.add('claude');
        targets.add('codex');
        targets.add('antigravity');
        targets.add('cursor');
        targets.add('opencode');
        targets.add('local');
        break;
      case '--optimize':
        optimize = true;
        break;
      case '--no-orchestrator':
        includeOrchestrator = false;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--uninstall':
        uninstall = true;
        break;
      case '--doctor':
        doctor = true;
        break;
      case '-h':
      case '--help':
        help = true;
        break;
      case '-v':
      case '--version':
        version = true;
        break;
      default:
        throw new Error(`Unknown flag: ${arg}. Run with --help to see valid options.`);
    }
  }

  return {
    targets: [...targets],
    optimize,
    includeOrchestrator,
    dryRun,
    uninstall,
    doctor,
    help,
    version,
  };
}

/**
 * Auto-detect installed AI agent directories under homeDir.
 * Falls back to ['antigravity'] (~/.agents/skills) when none are found.
 * @param {string} homeDir
 * @returns {string[]}
 */
export function detectTargets(homeDir = os.homedir()) {
  const detected = [];
  if (fs.existsSync(path.join(homeDir, '.claude'))) detected.push('claude');
  if (fs.existsSync(path.join(homeDir, '.codex'))) detected.push('codex');
  if (fs.existsSync(path.join(homeDir, '.agents'))) detected.push('antigravity');
  if (fs.existsSync(path.join(homeDir, '.cursor'))) detected.push('cursor');
  if (fs.existsSync(path.join(homeDir, '.config', 'opencode'))) detected.push('opencode');
  return detected.length > 0 ? detected : ['antigravity'];
}

function copyFileAction(src, dst, dryRun, actions, mode) {
  if (!dryRun) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    if (mode !== undefined) fs.chmodSync(dst, mode);
  }
  actions.push(`${dryRun ? '[dry-run] ' : ''}install ${dst}`);
}

function removePathAction(targetPath, dryRun, actions) {
  if (!fs.existsSync(targetPath)) return;
  if (!dryRun) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
  actions.push(`${dryRun ? '[dry-run] ' : ''}remove ${targetPath}`);
}

function copyDirRecursive(srcDir, dstDir, dryRun, actions) {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath, dryRun, actions);
    } else {
      copyFileAction(srcPath, dstPath, dryRun, actions);
    }
  }
}

function installSkillsToDir(skillsRoot, skillNames, packageRoot, dryRun, actions) {
  for (const name of skillNames) {
    const srcSkillDir = path.join(packageRoot, 'skills', name);
    const dstSkillDir = path.join(skillsRoot, name);
    copyDirRecursive(srcSkillDir, dstSkillDir, dryRun, actions);
  }
}

function uninstallSkillsFromDir(skillsRoot, dryRun, actions) {
  for (const name of SKILL_NAMES) {
    removePathAction(path.join(skillsRoot, name), dryRun, actions);
  }
}

function applyClaudeOptimize(homeDir, packageRoot, dryRun, actions, warnings) {
  const claudeDir = path.join(homeDir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');
  const backupPath = path.join(claudeDir, 'settings.json.agent-sdlc.bak');
  const statuslineSrc = path.join(packageRoot, 'templates', 'claude', 'statusline-command.sh');
  const statuslineDst = path.join(claudeDir, 'statusline-command.sh');

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    try {
      settings = JSON.parse(raw);
    } catch {
      warnings.push(`Skipped --optimize on ${settingsPath}: existing file is not valid JSON.`);
      return;
    }
    if (!fs.existsSync(backupPath)) {
      if (!dryRun) {
        fs.writeFileSync(backupPath, raw, 'utf8');
      }
      actions.push(`${dryRun ? '[dry-run] ' : ''}backup ${backupPath}`);
    }
  }

  settings.model = 'opusplan';
  settings.env = { ...(settings.env || {}), ...CLAUDE_OPTIMIZE_ENV };

  if (!fs.existsSync(statuslineDst)) {
    copyFileAction(statuslineSrc, statuslineDst, dryRun, actions, 0o755);
  }
  if (!settings.statusLine) {
    settings.statusLine = {
      type: 'command',
      command: 'bash ~/.claude/statusline-command.sh',
    };
  }

  if (!dryRun) {
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  }
  actions.push(`${dryRun ? '[dry-run] ' : ''}optimize ${settingsPath}`);
}

function scaffoldProject(cwd, packageRoot, dryRun, actions, warnings) {
  const projectTemplateDir = path.join(packageRoot, 'templates', 'project');
  const mappings = [
    ['docs/INDEX.md', 'docs/INDEX.md'],
    ['docs/adr/TEMPLATE.md', 'docs/adr/TEMPLATE.md'],
    ['docs/plans/.gitkeep', 'docs/plans/.gitkeep'],
    ['.github/PULL_REQUEST_TEMPLATE.md', '.github/PULL_REQUEST_TEMPLATE.md'],
    ['AGENTS.md', 'AGENTS.md'],
    ['CLAUDE.md', 'CLAUDE.md'],
  ];

  for (const [relSrc, relDst] of mappings) {
    const src = path.join(projectTemplateDir, relSrc);
    const dst = path.join(cwd, relDst);
    if (fs.existsSync(dst)) {
      warnings.push(`Skipped existing ${relDst}`);
      continue;
    }
    copyFileAction(src, dst, dryRun, actions);
  }

  const gitignorePath = path.join(cwd, '.gitignore');
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf8')
    : '';
  const lines = new Set(existing.split(/\r?\n/).map((l) => l.trim()));
  const missing = PROJECT_GITIGNORE_ENTRIES.filter((entry) => !lines.has(entry));

  if (missing.length > 0) {
    const prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
    const block = `${prefix}${missing.join('\n')}\n`;
    if (!dryRun) {
      fs.writeFileSync(gitignorePath, existing + block, 'utf8');
    }
    actions.push(`${dryRun ? '[dry-run] ' : ''}update ${gitignorePath} (+${missing.length} entries)`);
  }
}

/**
 * Execute install or uninstall across requested targets.
 * @param {object} [options]
 * @returns {{ targets: string[], actions: string[], warnings: string[] }}
 */
export function runInstall(options = {}) {
  const homeDir = options.homeDir ?? os.homedir();
  const cwd = options.cwd ?? process.cwd();
  const packageRoot = options.packageRoot ?? DEFAULT_PACKAGE_ROOT;
  const dryRun = Boolean(options.dryRun);
  const uninstall = Boolean(options.uninstall);
  const optimize = Boolean(options.optimize);
  const includeOrchestrator = options.includeOrchestrator ?? true;

  const targets =
    options.targets && options.targets.length > 0
      ? options.targets
      : detectTargets(homeDir);

  const skillNames = includeOrchestrator ? SKILL_NAMES : ['sdlc-workflow'];
  const actions = [];
  const warnings = [];
  const seenSkillDirs = new Set();

  const addSkillsOnce = (dir) => {
    if (seenSkillDirs.has(dir)) return;
    seenSkillDirs.add(dir);
    if (uninstall) {
      uninstallSkillsFromDir(dir, dryRun, actions);
    } else {
      installSkillsToDir(dir, skillNames, packageRoot, dryRun, actions);
    }
  };

  for (const target of targets) {
    if (target === 'claude') {
      addSkillsOnce(path.join(homeDir, '.claude', 'skills'));
      const cmdDir = path.join(homeDir, '.claude', 'commands');
      for (const cmd of COMMAND_FILES) {
        const dst = path.join(cmdDir, cmd);
        if (uninstall) {
          removePathAction(dst, dryRun, actions);
        } else {
          copyFileAction(path.join(packageRoot, 'commands', cmd), dst, dryRun, actions);
        }
      }
      if (optimize && !uninstall) {
        applyClaudeOptimize(homeDir, packageRoot, dryRun, actions, warnings);
      }
    } else if (target === 'codex') {
      addSkillsOnce(path.join(homeDir, '.codex', 'skills'));
      addSkillsOnce(path.join(homeDir, '.agents', 'skills'));
    } else if (target === 'antigravity') {
      addSkillsOnce(path.join(homeDir, '.agents', 'skills'));
    } else if (target === 'cursor') {
      addSkillsOnce(path.join(homeDir, '.cursor', 'skills'));
    } else if (target === 'opencode') {
      addSkillsOnce(path.join(homeDir, '.config', 'opencode', 'skills'));
      addSkillsOnce(path.join(homeDir, '.agents', 'skills'));
    } else if (target === 'local') {
      const dst = path.join(homeDir, '.agent-sdlc', 'LOCAL_PROMPT.md');
      if (uninstall) {
        removePathAction(dst, dryRun, actions);
      } else {
        copyFileAction(
          path.join(packageRoot, 'templates', 'local', 'LOCAL_PROMPT.md'),
          dst,
          dryRun,
          actions,
        );
      }
    } else if (target === 'project') {
      if (uninstall) {
        warnings.push('--uninstall ignores --project to avoid deleting repository files.');
      } else {
        scaffoldProject(cwd, packageRoot, dryRun, actions, warnings);
      }
    }
  }

  return { targets, actions, warnings };
}

/**
 * Run a read-only health and token-efficiency audit across global and current-project configs.
 * @param {{ homeDir?: string, cwd?: string }} [options]
 * @returns {{ checks: Array<{ level: 'OK'|'WARN'|'INFO', area: string, message: string }>, okCount: number, warnCount: number }}
 */
export function runDoctor(options = {}) {
  const homeDir = options.homeDir ?? os.homedir();
  const cwd = options.cwd ?? process.cwd();
  const checks = [];

  const add = (level, area, message) => checks.push({ level, area, message });

  const locations = [
    ['claude', path.join(homeDir, '.claude/skills/sdlc-workflow/SKILL.md')],
    ['codex', path.join(homeDir, '.codex/skills/sdlc-workflow/SKILL.md')],
    ['antigravity', path.join(homeDir, '.agents/skills/sdlc-workflow/SKILL.md')],
    ['cursor', path.join(homeDir, '.cursor/skills/sdlc-workflow/SKILL.md')],
    ['opencode', path.join(homeDir, '.config/opencode/skills/sdlc-workflow/SKILL.md')],
    ['local', path.join(homeDir, '.agent-sdlc/LOCAL_PROMPT.md')],
  ];
  const installed = locations.filter(([, p]) => fs.existsSync(p)).map(([name]) => name);
  if (installed.length > 0) {
    add('OK', 'installs', `Installed for: ${installed.join(', ')}`);
  } else {
    add('WARN', 'installs', 'No agent-sdlc targets installed yet. Run npx agent-sdlc.');
  }

  const claudeDir = path.join(homeDir, '.claude');
  if (fs.existsSync(claudeDir)) {
    const cmdCount = COMMAND_FILES.filter((f) =>
      fs.existsSync(path.join(claudeDir, 'commands', f)),
    ).length;
    add(
      cmdCount === COMMAND_FILES.length ? 'OK' : 'WARN',
      'claude-commands',
      `${cmdCount}/${COMMAND_FILES.length} slash commands installed in ~/.claude/commands/`,
    );

    const skillsDir = path.join(claudeDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      const skillEntries = fs.readdirSync(skillsDir).filter((e) => e !== 'synced');
      if (skillEntries.length > 20) {
        add('WARN', 'claude-skills', `${skillEntries.length} global skills in ~/.claude/skills/ (>20 increases baseline token overhead)`);
      } else {
        add('OK', 'claude-skills', `${skillEntries.length} global skills in ~/.claude/skills/ (lean)`);
      }
    }

    const settingsPath = path.join(claudeDir, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      try {
        const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const missing = [];
        if (s.model !== 'opusplan') missing.push('model=opusplan');
        const env = s.env || {};
        for (const k of [
          'CLAUDE_CODE_DISABLE_1M_CONTEXT',
          'ENABLE_TOOL_SEARCH',
          'CLAUDE_AUTOCOMPACT_PCT_OVERRIDE',
          'BASH_MAX_OUTPUT_LENGTH',
          'MAX_MCP_OUTPUT_TOKENS',
        ]) {
          if (!env[k]) missing.push(k);
        }
        if (missing.length > 0) {
          add('WARN', 'claude-settings', `Missing token guardrails (${missing.join(', ')}). Run --claude --optimize.`);
        } else {
          add('OK', 'claude-settings', 'All token guardrails active (opusplan, 200k cap, tool search, auto-compact)');
        }
      } catch {
        add('WARN', 'claude-settings', '~/.claude/settings.json is not valid JSON');
      }
    } else {
      add('INFO', 'claude-settings', 'No ~/.claude/settings.json found');
    }
  }

  const rulesDir = path.join(cwd, '.claude', 'rules');
  if (fs.existsSync(rulesDir)) {
    let uncondCount = 0;
    let uncondBytes = 0;
    for (const file of fs.readdirSync(rulesDir)) {
      if (!file.endsWith('.md')) continue;
      const content = fs.readFileSync(path.join(rulesDir, file), 'utf8');
      const m = content.match(/^---\n([\s\S]*?)\n---/);
      if (!m || !m[1].includes('paths:')) {
        uncondCount += 1;
        uncondBytes += Buffer.byteLength(content, 'utf8');
      }
    }
    if (uncondBytes > 16384) {
      add('WARN', 'project-rules', `${uncondCount} unconditional rule(s) in .claude/rules/ (~${Math.round(uncondBytes / 4)} tokens/turn). Add YAML paths: scoping.`);
    } else {
      add('OK', 'project-rules', `.claude/rules/ baseline is lean (${uncondCount} unconditional, ~${Math.round(uncondBytes / 4)} tokens)`);
    }
  }

  if (fs.existsSync(path.join(cwd, '.git'))) {
    const giPath = path.join(cwd, '.gitignore');
    const gi = fs.existsSync(giPath) ? fs.readFileSync(giPath, 'utf8') : '';
    if (!gi.includes('.claude/HANDOFF.md')) {
      add('WARN', 'project-gitignore', '.gitignore is missing .claude/HANDOFF.md (run --project to add safely)');
    } else {
      add('OK', 'project-gitignore', '.gitignore excludes .claude/HANDOFF.md');
    }
  }

  const okCount = checks.filter((c) => c.level === 'OK').length;
  const warnCount = checks.filter((c) => c.level === 'WARN').length;
  return { checks, okCount, warnCount };
}
