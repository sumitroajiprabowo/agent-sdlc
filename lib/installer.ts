import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function findPackageRoot(start: string): string {
  let dir = start;
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('package.json not found above ' + start);
    dir = parent;
  }
  return dir;
}
export const DEFAULT_PACKAGE_ROOT = findPackageRoot(__dirname);

export type Target = 'claude' | 'codex' | 'antigravity' | 'cursor' | 'opencode' | 'local' | 'project';
type CommandTarget = 'claude' | 'codex' | 'cursor' | 'opencode';

export interface InstallerOptions {
  targets: Target[];
  optimize: boolean;
  includeOrchestrator: boolean;
  dryRun: boolean;
  uninstall: boolean;
  doctor: boolean;
  force: boolean;
  help: boolean;
  version: boolean;
}

export interface RunOptions {
  homeDir?: string;
  cwd?: string;
  packageRoot?: string;
  targets?: Target[];
  dryRun?: boolean;
  uninstall?: boolean;
  optimize?: boolean;
  includeOrchestrator?: boolean;
  force?: boolean;
}

export interface RunResult {
  targets: Target[];
  actions: string[];
  warnings: string[];
}

export interface DoctorCheck {
  level: 'OK' | 'WARN' | 'INFO';
  area: string;
  message: string;
}

export interface DoctorResult {
  checks: DoctorCheck[];
  okCount: number;
  warnCount: number;
}

interface SettingsRecord {
  model: boolean;
  env: string[];
  statusLine: boolean;
}

interface Manifest {
  version: string | null;
  files: Record<string, string>;
  settings: SettingsRecord | null;
}

interface ClaudeSettings {
  model?: string;
  env?: Record<string, string>;
  statusLine?: { type: string; command: string };
  [key: string]: unknown;
}

interface Context {
  homeDir: string;
  packageRoot: string;
  dryRun: boolean;
  force: boolean;
  actions: string[];
  warnings: string[];
  manifest: Manifest;
}

export const SKILL_NAMES = ['sdlc-workflow', 'sdlc-orchestrator'];
export const COMMAND_FILES = [
  'sdlc-spec.md',
  'sdlc-start.md',
  'sdlc-handoff.md',
  'sdlc-pickup.md',
  'sdlc-handoff-pr.md',
  'sdlc-adr.md',
  'sdlc-qa.md',
  'sdlc-review.md',
  'sdlc-ship.md',
];
export const AGENT_FILES = ['sdlc-reviewer.md', 'sdlc-tester.md'];

// Pre-0.2.0 unprefixed names; removed on install/uninstall when still unmodified.
const LEGACY_COMMAND_FILES = COMMAND_FILES.map((f) => f.replace(/^sdlc-/, ''));

// Claude Code built-in slash commands/skills our command names must never equal.
export const RESERVED_COMMAND_NAMES = [
  'clear', 'code-review', 'compact', 'config', 'help', 'init', 'loop', 'review',
  'run', 'schedule', 'security-review', 'ship', 'simplify', 'steward',
];

// Agents with a custom slash-command directory that accepts our markdown commands.
const COMMAND_DIRS: Record<CommandTarget, string[]> = {
  claude: ['.claude', 'commands'],
  codex: ['.codex', 'prompts'],
  cursor: ['.cursor', 'commands'],
  opencode: ['.config', 'opencode', 'command'],
};

const CLAUDE_OPTIMIZE_ENV: Record<string, string> = {
  CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet',
  CLAUDE_CODE_DISABLE_1M_CONTEXT: '1',
  ENABLE_TOOL_SEARCH: 'auto:5',
  CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: '70',
  BASH_MAX_OUTPUT_LENGTH: '15000',
  MAX_MCP_OUTPUT_TOKENS: '10000',
};

// Pre-TypeScript installs used a bash statusline; uninstall must still clean it up.
const LEGACY_STATUSLINE_FILE = 'statusline-command.sh';
const LEGACY_STATUSLINE_COMMAND = 'bash ~/.claude/statusline-command.sh';
const STATUSLINE_FILE = 'sdlc-kit-statusline.mjs';
// 0.1.0 shipped under the name agent-sdlc; installs made then are migrated on the next run.
const PRE_RENAME_STATUSLINE_FILE = 'agent-sdlc-statusline.mjs';

function statuslineCommand(homeDir: string, file: string = STATUSLINE_FILE): string {
  return `node "${path.join(homeDir, '.claude', file)}"`;
}

const PROJECT_GITIGNORE_ENTRIES = [
  '.claude/HANDOFF.md',
  '.claude/tasks/',
  'CLAUDE.local.md',
  '.claude/settings.local.json',
];

/**
 * Parse CLI arguments into installer options.
 */
export function parseArgs(argv: string[]): InstallerOptions {
  const targets = new Set<Target>();
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
 */
export function detectTargets(homeDir: string = os.homedir()): Target[] {
  const detected: Target[] = [];
  if (fs.existsSync(path.join(homeDir, '.claude'))) detected.push('claude');
  if (fs.existsSync(path.join(homeDir, '.codex'))) detected.push('codex');
  if (fs.existsSync(path.join(homeDir, '.agents'))) detected.push('antigravity');
  if (fs.existsSync(path.join(homeDir, '.cursor'))) detected.push('cursor');
  if (fs.existsSync(path.join(homeDir, '.config', 'opencode'))) detected.push('opencode');
  return detected.length > 0 ? detected : ['antigravity'];
}

const MANIFEST_NAME = path.join('.sdlc-kit', 'manifest.json');
const PRE_RENAME_MANIFEST_NAME = path.join('.agent-sdlc', 'manifest.json');
const LOCAL_PROMPT_NAME = path.join('.sdlc-kit', 'LOCAL_PROMPT.md');
const PRE_RENAME_LOCAL_PROMPT_NAME = path.join('.agent-sdlc', 'LOCAL_PROMPT.md');

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readPackageVersion(packageRoot: string): string {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version;
}

function loadManifest(homeDir: string): Manifest {
  for (const name of [MANIFEST_NAME, PRE_RENAME_MANIFEST_NAME]) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(homeDir, name), 'utf8'));
      return { version: m.version, files: m.files ?? {}, settings: m.settings ?? null };
    } catch {
      // missing or unreadable: try the pre-rename location
    }
  }
  return { version: null, files: {}, settings: null };
}

function removeManifestFile(homeDir: string, name: string): void {
  const file = path.join(homeDir, name);
  fs.rmSync(file, { force: true });
  try {
    fs.rmdirSync(path.dirname(file));
  } catch {
    // directory not empty or already gone
  }
}

function saveManifest(homeDir: string, manifest: Manifest, version: string, dryRun: boolean): void {
  if (dryRun) return;
  const file = path.join(homeDir, MANIFEST_NAME);
  if (Object.keys(manifest.files).length === 0 && !manifest.settings) {
    removeManifestFile(homeDir, MANIFEST_NAME);
    removeManifestFile(homeDir, PRE_RENAME_MANIFEST_NAME);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = { version, files: manifest.files, settings: manifest.settings };
  fs.writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
  removeManifestFile(homeDir, PRE_RENAME_MANIFEST_NAME);
}

/** Copy a managed file unless it exists with content we did not write (unless --force). */
function installManagedFile(ctx: Context, src: string, dst: string): void {
  const srcHash = sha256(src);
  if (fs.existsSync(dst)) {
    const cur = sha256(dst);
    if (cur !== srcHash && cur !== ctx.manifest.files[dst] && !ctx.force) {
      ctx.warnings.push(`Skipped ${dst}: exists and was not installed by sdlc-kit (use --force to overwrite)`);
      return;
    }
  }
  copyFileAction(src, dst, ctx.dryRun, ctx.actions);
  ctx.manifest.files[dst] = srcHash;
}

/** Remove a managed file only if it is still exactly what we installed. */
function uninstallManagedFile(ctx: Context, src: string | null, dst: string): void {
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

// Remove a file we installed under an old name. Never touches files absent from the
// manifest (user-owned), and ignores --force so a same-named user command is safe.
function removeLegacyManagedFile(ctx: Context, dst: string): void {
  const recorded = ctx.manifest.files[dst];
  if (recorded === undefined) return;
  if (!fs.existsSync(dst)) {
    delete ctx.manifest.files[dst];
  } else if (sha256(dst) === recorded) {
    removePathAction(dst, ctx.dryRun, ctx.actions);
    delete ctx.manifest.files[dst];
  } else {
    ctx.warnings.push(`Kept ${dst}: modified since install (old command name; remove manually)`);
  }
}

function listFiles(dir: string, base: string = dir): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full));
  }
  return out;
}

function removeEmptyDirs(dir: string, dryRun: boolean): void {
  if (dryRun || !fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirs(path.join(dir, entry.name), dryRun);
  }
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}

function copyFileAction(src: string, dst: string, dryRun: boolean, actions: string[]): void {
  if (!dryRun) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  actions.push(`${dryRun ? '[dry-run] ' : ''}install ${dst}`);
}

function removePathAction(targetPath: string, dryRun: boolean, actions: string[]): void {
  if (!fs.existsSync(targetPath)) return;
  if (!dryRun) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
  actions.push(`${dryRun ? '[dry-run] ' : ''}remove ${targetPath}`);
}

function copyDirRecursive(srcDir: string, dstDir: string, dryRun: boolean, actions: string[]): void {
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

function installSkillsToDir(ctx: Context, skillsRoot: string, skillNames: string[]): void {
  for (const name of skillNames) {
    const srcDir = path.join(ctx.packageRoot, 'skills', name);
    const dstDir = path.join(skillsRoot, name);
    const current = new Set<string>();
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

function uninstallSkillsFromDir(ctx: Context, skillsRoot: string): void {
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

function applyClaudeOptimize(ctx: Context): void {
  const claudeDir = path.join(ctx.homeDir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');
  const backupPath = path.join(claudeDir, 'settings.json.sdlc-kit.bak');
  const preRenameBackupPath = path.join(claudeDir, 'settings.json.agent-sdlc.bak');
  const statuslineSrc = path.join(ctx.packageRoot, 'dist', 'lib', 'statusline.js');
  const statuslineDst = path.join(claudeDir, STATUSLINE_FILE);
  const { dryRun, actions, warnings } = ctx;

  let settings: ClaudeSettings = {};
  if (fs.existsSync(settingsPath)) {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    try {
      settings = JSON.parse(raw) as ClaudeSettings;
    } catch {
      warnings.push(`Skipped --optimize on ${settingsPath}: existing file is not valid JSON.`);
      return;
    }
    if (!fs.existsSync(backupPath) && !fs.existsSync(preRenameBackupPath)) {
      if (!dryRun) {
        fs.writeFileSync(backupPath, raw, 'utf8');
      }
      actions.push(`${dryRun ? '[dry-run] ' : ''}backup ${backupPath}`);
    }
  }

  // Record only what we add, so --uninstall can revert exactly that and nothing else.
  const rec: SettingsRecord = ctx.manifest.settings ?? { model: false, env: [], statusLine: false };

  if (settings.model === undefined) {
    settings.model = 'opusplan';
    rec.model = true;
  } else if (settings.model !== 'opusplan' && !rec.model) {
    warnings.push(`Kept existing model "${settings.model}" (opusplan recommended; set it manually to opt in).`);
  }

  const env: Record<string, string> = (settings.env ??= {});
  for (const [key, value] of Object.entries(CLAUDE_OPTIMIZE_ENV)) {
    if (env[key] === undefined) {
      env[key] = value;
      if (!rec.env.includes(key)) rec.env.push(key);
    }
  }

  installManagedFile(ctx, statuslineSrc, statuslineDst);
  uninstallManagedFile(ctx, null, path.join(claudeDir, PRE_RENAME_STATUSLINE_FILE));
  if (rec.statusLine && settings.statusLine?.command === statuslineCommand(ctx.homeDir, PRE_RENAME_STATUSLINE_FILE)) {
    settings.statusLine.command = statuslineCommand(ctx.homeDir);
  }
  if (!settings.statusLine) {
    settings.statusLine = {
      type: 'command',
      command: statuslineCommand(ctx.homeDir),
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
function revertClaudeOptimize(ctx: Context): void {
  const rec = ctx.manifest.settings;
  if (!rec) return;
  const settingsPath = path.join(ctx.homeDir, '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    let settings: ClaudeSettings;
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as ClaudeSettings;
    } catch {
      ctx.warnings.push(`Could not revert --optimize in ${settingsPath}: not valid JSON.`);
      return;
    }
    if (rec.model && settings.model === 'opusplan') delete settings.model;
    for (const key of rec.env) {
      if (settings.env && settings.env[key] === CLAUDE_OPTIMIZE_ENV[key]) delete settings.env[key];
    }
    if (settings.env && Object.keys(settings.env).length === 0) delete settings.env;
    const slCommand = settings.statusLine?.command;
    if (
      rec.statusLine &&
      (slCommand === statuslineCommand(ctx.homeDir) ||
        slCommand === statuslineCommand(ctx.homeDir, PRE_RENAME_STATUSLINE_FILE) ||
        slCommand === LEGACY_STATUSLINE_COMMAND)
    ) {
      delete settings.statusLine;
    }
    if (!ctx.dryRun) {
      fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
    }
    ctx.actions.push(`${ctx.dryRun ? '[dry-run] ' : ''}revert optimize ${settingsPath}`);
    for (const suffix of ['sdlc-kit', 'agent-sdlc']) {
      const backup = `${settingsPath}.${suffix}.bak`;
      if (fs.existsSync(backup)) ctx.warnings.push(`Left ${backup} in place (original pre-optimize copy).`);
    }
  }
  ctx.manifest.settings = null;
}

function scaffoldProject(cwd: string, packageRoot: string, dryRun: boolean, actions: string[], warnings: string[]): void {
  const projectTemplateDir = path.join(packageRoot, 'templates', 'project');
  const mappings: Array<[string, string]> = [
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
 */
export function runInstall(options: RunOptions = {}): RunResult {
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
  const ctx: Context = {
    homeDir,
    packageRoot,
    dryRun,
    force: Boolean(options.force),
    actions: [],
    warnings: [],
    manifest: loadManifest(homeDir),
  };
  const { actions, warnings } = ctx;
  const seenSkillDirs = new Set<string>();

  const addSkillsOnce = (dir: string): void => {
    if (seenSkillDirs.has(dir)) return;
    seenSkillDirs.add(dir);
    if (uninstall) {
      uninstallSkillsFromDir(ctx, dir);
    } else {
      installSkillsToDir(ctx, dir, skillNames);
    }
  };

  const syncCommands = (target: CommandTarget): void => {
    const cmdDir = path.join(homeDir, ...COMMAND_DIRS[target]);
    for (const old of LEGACY_COMMAND_FILES) {
      removeLegacyManagedFile(ctx, path.join(cmdDir, old));
    }
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

  const syncAgents = (): void => {
    const agentDir = path.join(homeDir, '.claude', 'agents');
    for (const agent of AGENT_FILES) {
      const src = path.join(packageRoot, 'agents', agent);
      const dst = path.join(agentDir, agent);
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
      syncAgents();
      if (uninstall) {
        revertClaudeOptimize(ctx);
        uninstallManagedFile(
          ctx,
          path.join(packageRoot, 'dist', 'lib', 'statusline.js'),
          path.join(homeDir, '.claude', STATUSLINE_FILE),
        );
        uninstallManagedFile(ctx, null, path.join(homeDir, '.claude', PRE_RENAME_STATUSLINE_FILE));
        uninstallManagedFile(ctx, null, path.join(homeDir, '.claude', LEGACY_STATUSLINE_FILE));
      } else if (optimize) {
        applyClaudeOptimize(ctx);
      }
    } else if (target === 'codex') {
      addSkillsOnce(path.join(homeDir, '.codex', 'skills'));
      addSkillsOnce(path.join(homeDir, '.agents', 'skills'));
      syncCommands('codex');
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
      const dst = path.join(homeDir, LOCAL_PROMPT_NAME);
      const preRenameDst = path.join(homeDir, PRE_RENAME_LOCAL_PROMPT_NAME);
      if (uninstall) {
        uninstallManagedFile(ctx, src, dst);
      } else {
        installManagedFile(ctx, src, dst);
      }
      uninstallManagedFile(ctx, src, preRenameDst);
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
 */
export function runDoctor(options: { homeDir?: string; cwd?: string; packageRoot?: string } = {}): DoctorResult {
  const homeDir = options.homeDir ?? os.homedir();
  const cwd = options.cwd ?? process.cwd();
  const checks: DoctorCheck[] = [];

  const add = (level: DoctorCheck['level'], area: string, message: string): void => {
    checks.push({ level, area, message });
  };

  const locations: Array<[string, string]> = [
    ['claude', path.join(homeDir, '.claude/skills/sdlc-workflow/SKILL.md')],
    ['codex', path.join(homeDir, '.codex/skills/sdlc-workflow/SKILL.md')],
    ['antigravity', path.join(homeDir, '.agents/skills/sdlc-workflow/SKILL.md')],
    ['cursor', path.join(homeDir, '.cursor/skills/sdlc-workflow/SKILL.md')],
    ['opencode', path.join(homeDir, '.config/opencode/skills/sdlc-workflow/SKILL.md')],
    ['local', path.join(homeDir, LOCAL_PROMPT_NAME)],
    ['local', path.join(homeDir, PRE_RENAME_LOCAL_PROMPT_NAME)],
  ];
  const installed = [...new Set(locations.filter(([, p]) => fs.existsSync(p)).map(([name]) => name))];
  if (installed.length > 0) {
    add('OK', 'installs', `Installed for: ${installed.join(', ')}`);
  } else {
    add('WARN', 'installs', 'No sdlc-kit targets installed yet. Run npx sdlc-kit.');
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
        (k) => k.startsWith('sdlc-kit@') || k.startsWith('agent-sdlc@'),
      );
    } catch {
      // unreadable plugin registry: skip the duplicate check
    }
    if (pluginInstalled && fs.existsSync(path.join(claudeDir, 'skills', 'sdlc-workflow'))) {
      add('WARN', 'duplicate-install', 'sdlc-kit is installed as a Claude plugin AND via npx; skills load twice. Uninstall one (npx sdlc-kit --claude --uninstall).');
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
    const agentCount = AGENT_FILES.filter((f) =>
      fs.existsSync(path.join(claudeDir, 'agents', f)),
    ).length;
    add(
      agentCount === AGENT_FILES.length ? 'OK' : 'WARN',
      'claude-agents',
      `${agentCount}/${AGENT_FILES.length} subagents installed in ~/.claude/agents/`,
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
      if (!m || !m[1]?.includes('paths:')) {
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
    const missing = ['.claude/HANDOFF.md', '.claude/tasks/'].filter((e) => !gi.includes(e));
    if (missing.length > 0) {
      add('WARN', 'project-gitignore', `.gitignore is missing ${missing.join(', ')} (run --project to add safely)`);
    } else {
      add('OK', 'project-gitignore', '.gitignore excludes .claude/HANDOFF.md and .claude/tasks/');
    }
  }

  const okCount = checks.filter((c) => c.level === 'OK').length;
  const warnCount = checks.filter((c) => c.level === 'WARN').length;
  return { checks, okCount, warnCount };
}
