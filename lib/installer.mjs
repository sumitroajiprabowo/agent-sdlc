import crypto from 'node:crypto';
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

// Agents with a custom slash-command directory that accepts our markdown commands.
const COMMAND_DIRS = {
  claude: ['.claude', 'commands'],
  cursor: ['.cursor', 'commands'],
  opencode: ['.config', 'opencode', 'command'],
};

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
 * @returns {{ targets: string[], optimize: boolean, includeOrchestrator: boolean, dryRun: boolean, uninstall: boolean, doctor: boolean, force: boolean, help: boolean, version: boolean }}
 */
export function parseArgs(argv) {
  const targets = new Set();
  let optimize = false;
  let includeOrchestrator = true;
  let dryRun = false;
  let uninstall = false;
  let doctor = false;
  let force = false;
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
      case '--force':
        force = true;
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
    force,
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

const MANIFEST_NAME = path.join('.agent-sdlc', 'manifest.json');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readPackageVersion(packageRoot) {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version;
}

function loadManifest(homeDir) {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(homeDir, MANIFEST_NAME), 'utf8'));
    return { version: m.version, files: m.files ?? {}, settings: m.settings ?? null };
  } catch {
    return { version: null, files: {}, settings: null };
  }
}

function saveManifest(homeDir, manifest, version, dryRun) {
  if (dryRun) return;
  const file = path.join(homeDir, MANIFEST_NAME);
  if (Object.keys(manifest.files).length === 0 && !manifest.settings) {
    fs.rmSync(file, { force: true });
    try {
      fs.rmdirSync(path.dirname(file));
    } catch {
      // directory not empty or already gone
    }
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = { version, files: manifest.files, settings: manifest.settings };
  fs.writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
}

/** Copy a managed file unless it exists with content we did not write (unless --force). */
function installManagedFile(ctx, src, dst, mode) {
  const srcHash = sha256(src);
  if (fs.existsSync(dst)) {
    const cur = sha256(dst);
    if (cur !== srcHash && cur !== ctx.manifest.files[dst] && !ctx.force) {
      ctx.warnings.push(`Skipped ${dst}: exists and was not installed by agent-sdlc (use --force to overwrite)`);
      return;
    }
  }
  copyFileAction(src, dst, ctx.dryRun, ctx.actions, mode);
  ctx.manifest.files[dst] = srcHash;
}

/** Remove a managed file only if it is still exactly what we installed. */
function uninstallManagedFile(ctx, src, dst) {
  if (!fs.existsSync(dst)) {
    delete ctx.manifest.files[dst];
    return;
  }
  const cur = sha256(dst);
  if (cur === ctx.manifest.files[dst] || (src && cur === sha256(src)) || ctx.force) {
    removePathAction(dst, ctx.dryRun, ctx.actions);
    delete ctx.manifest.files[dst];
  } else {
    ctx.warnings.push(`Kept ${dst}: modified since install (use --force to remove)`);
  }
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full));
  }
  return out;
}

function removeEmptyDirs(dir, dryRun) {
  if (dryRun || !fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirs(path.join(dir, entry.name), dryRun);
  }
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
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

function installSkillsToDir(ctx, skillsRoot, skillNames) {
  for (const name of skillNames) {
    const srcDir = path.join(ctx.packageRoot, 'skills', name);
    const dstDir = path.join(skillsRoot, name);
    const current = new Set();
    for (const rel of listFiles(srcDir)) {
      const dst = path.join(dstDir, rel);
      current.add(dst);
      installManagedFile(ctx, path.join(srcDir, rel), dst);
    }
    // Prune files from older versions that we installed and the user never edited.
    for (const [file, hash] of Object.entries(ctx.manifest.files)) {
      if (!file.startsWith(dstDir + path.sep) || current.has(file)) continue;
      if (!fs.existsSync(file)) {
        delete ctx.manifest.files[file];
      } else if (sha256(file) === hash) {
        removePathAction(file, ctx.dryRun, ctx.actions);
        delete ctx.manifest.files[file];
      }
    }
  }
}

function uninstallSkillsFromDir(ctx, skillsRoot) {
  for (const name of SKILL_NAMES) {
    const srcDir = path.join(ctx.packageRoot, 'skills', name);
    const dstDir = path.join(skillsRoot, name);
    for (const rel of listFiles(srcDir)) {
      uninstallManagedFile(ctx, path.join(srcDir, rel), path.join(dstDir, rel));
    }
    for (const file of Object.keys(ctx.manifest.files)) {
      if (file.startsWith(dstDir + path.sep)) uninstallManagedFile(ctx, null, file);
    }
    removeEmptyDirs(dstDir, ctx.dryRun);
  }
}

function applyClaudeOptimize(ctx) {
  const claudeDir = path.join(ctx.homeDir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');
  const backupPath = path.join(claudeDir, 'settings.json.agent-sdlc.bak');
  const statuslineSrc = path.join(ctx.packageRoot, 'templates', 'claude', 'statusline-command.sh');
  const statuslineDst = path.join(claudeDir, 'statusline-command.sh');
  const { dryRun, actions, warnings } = ctx;

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

  // Record only what we add, so --uninstall can revert exactly that and nothing else.
  const rec = ctx.manifest.settings ?? { model: false, env: [], statusLine: false };

  if (settings.model === undefined) {
    settings.model = 'opusplan';
    rec.model = true;
  } else if (settings.model !== 'opusplan' && !rec.model) {
    warnings.push(`Kept existing model "${settings.model}" (opusplan recommended; set it manually to opt in).`);
  }

  settings.env = settings.env || {};
  for (const [key, value] of Object.entries(CLAUDE_OPTIMIZE_ENV)) {
    if (settings.env[key] === undefined) {
      settings.env[key] = value;
      if (!rec.env.includes(key)) rec.env.push(key);
    }
  }

  installManagedFile(ctx, statuslineSrc, statuslineDst, 0o755);
  if (!settings.statusLine) {
    settings.statusLine = {
      type: 'command',
      command: 'bash ~/.claude/statusline-command.sh',
    };
    rec.statusLine = true;
  }

  ctx.manifest.settings = rec;
  if (!dryRun) {
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  }
  actions.push(`${dryRun ? '[dry-run] ' : ''}optimize ${settingsPath}`);
}

/** Undo only the settings keys that --optimize added and the user has not changed since. */
function revertClaudeOptimize(ctx) {
  const rec = ctx.manifest.settings;
  if (!rec) return;
  const settingsPath = path.join(ctx.homeDir, '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    let settings;
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      ctx.warnings.push(`Could not revert --optimize in ${settingsPath}: not valid JSON.`);
      return;
    }
    if (rec.model && settings.model === 'opusplan') delete settings.model;
    for (const key of rec.env) {
      if (settings.env && settings.env[key] === CLAUDE_OPTIMIZE_ENV[key]) delete settings.env[key];
    }
    if (settings.env && Object.keys(settings.env).length === 0) delete settings.env;
    if (rec.statusLine && settings.statusLine?.command === 'bash ~/.claude/statusline-command.sh') {
      delete settings.statusLine;
    }
    if (!ctx.dryRun) {
      fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
    }
    ctx.actions.push(`${ctx.dryRun ? '[dry-run] ' : ''}revert optimize ${settingsPath}`);
    const backup = `${settingsPath}.agent-sdlc.bak`;
    if (fs.existsSync(backup)) ctx.warnings.push(`Left ${backup} in place (original pre-optimize copy).`);
  }
  ctx.manifest.settings = null;
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
  const ctx = {
    homeDir,
    packageRoot,
    dryRun,
    force: Boolean(options.force),
    actions: [],
    warnings: [],
    manifest: loadManifest(homeDir),
  };
  const { actions, warnings } = ctx;
  const seenSkillDirs = new Set();

  const addSkillsOnce = (dir) => {
    if (seenSkillDirs.has(dir)) return;
    seenSkillDirs.add(dir);
    if (uninstall) {
      uninstallSkillsFromDir(ctx, dir);
    } else {
      installSkillsToDir(ctx, dir, skillNames);
    }
  };

  const syncCommands = (target) => {
    const cmdDir = path.join(homeDir, ...COMMAND_DIRS[target]);
    for (const cmd of COMMAND_FILES) {
      const src = path.join(packageRoot, 'commands', cmd);
      const dst = path.join(cmdDir, cmd);
      if (uninstall) {
        uninstallManagedFile(ctx, src, dst);
      } else {
        installManagedFile(ctx, src, dst);
      }
    }
  };

  for (const target of targets) {
    if (target === 'claude') {
      addSkillsOnce(path.join(homeDir, '.claude', 'skills'));
      syncCommands('claude');
      if (uninstall) {
        revertClaudeOptimize(ctx);
        uninstallManagedFile(
          ctx,
          path.join(packageRoot, 'templates', 'claude', 'statusline-command.sh'),
          path.join(homeDir, '.claude', 'statusline-command.sh'),
        );
      } else if (optimize) {
        applyClaudeOptimize(ctx);
      }
    } else if (target === 'codex') {
      addSkillsOnce(path.join(homeDir, '.codex', 'skills'));
      addSkillsOnce(path.join(homeDir, '.agents', 'skills'));
    } else if (target === 'antigravity') {
      addSkillsOnce(path.join(homeDir, '.agents', 'skills'));
    } else if (target === 'cursor') {
      addSkillsOnce(path.join(homeDir, '.cursor', 'skills'));
      syncCommands('cursor');
    } else if (target === 'opencode') {
      addSkillsOnce(path.join(homeDir, '.config', 'opencode', 'skills'));
      addSkillsOnce(path.join(homeDir, '.agents', 'skills'));
      syncCommands('opencode');
    } else if (target === 'local') {
      const src = path.join(packageRoot, 'templates', 'local', 'LOCAL_PROMPT.md');
      const dst = path.join(homeDir, '.agent-sdlc', 'LOCAL_PROMPT.md');
      if (uninstall) {
        uninstallManagedFile(ctx, src, dst);
      } else {
        installManagedFile(ctx, src, dst);
      }
    } else if (target === 'project') {
      if (uninstall) {
        warnings.push('--uninstall ignores --project to avoid deleting repository files.');
      } else {
        scaffoldProject(cwd, packageRoot, dryRun, actions, warnings);
      }
    }
  }

  saveManifest(homeDir, ctx.manifest, readPackageVersion(packageRoot), dryRun);
  return { targets, actions, warnings };
}

/**
 * Run a read-only health and token-efficiency audit across global and current-project configs.
 * @param {{ homeDir?: string, cwd?: string, packageRoot?: string }} [options]
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

  const manifest = loadManifest(homeDir);
  if (manifest.version) {
    const current = readPackageVersion(options.packageRoot ?? DEFAULT_PACKAGE_ROOT);
    if (manifest.version === current) {
      add('OK', 'version', `Installed files match package version ${current}`);
    } else {
      add('WARN', 'version', `Installed v${manifest.version} but package is v${current}. Re-run the installer to upgrade.`);
    }
  }

  const claudeDir = path.join(homeDir, '.claude');
  const pluginsFile = path.join(claudeDir, 'plugins', 'installed_plugins.json');
  if (fs.existsSync(pluginsFile)) {
    let pluginInstalled = false;
    try {
      pluginInstalled = Object.keys(JSON.parse(fs.readFileSync(pluginsFile, 'utf8')).plugins ?? {}).some(
        (k) => k.startsWith('agent-sdlc@'),
      );
    } catch {
      // unreadable plugin registry: skip the duplicate check
    }
    if (pluginInstalled && fs.existsSync(path.join(claudeDir, 'skills', 'sdlc-workflow'))) {
      add('WARN', 'duplicate-install', 'agent-sdlc is installed as a Claude plugin AND via npx; skills load twice. Uninstall one (npx agent-sdlc --claude --uninstall).');
    }
  }
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
      const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
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
