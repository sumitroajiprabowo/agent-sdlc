import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_PACKAGE_ROOT } from './installer.js';

export interface CheckRunResult {
  errors: string[];
  strikes: string[];
}

interface WorkflowStep {
  id: string;
  type: 'agent' | 'script' | 'gate' | string;
  role?: string;
  panel?: string[];
  needs?: string[];
}

interface WorkflowDef {
  name: string;
  steps: WorkflowStep[];
}

const ALLOWED_STATUSES = new Set([
  'pending',
  'running',
  'done',
  'failed',
  'waiting-gate',
  'skipped',
]);

const ALLOWED_BOARD_TYPES = new Set([
  'QUESTION',
  'ANSWER',
  'HANDOFF',
  'CONTRACT',
  'BLOCKED',
  'DECISION',
  'OBJECTION',
  'DISSENT',
]);

const BOARD_SPECIAL_PARTICIPANTS = new Set(['all', 'user', 'lead']);
const BOARD_LINE_RE = /^\[([^\]]+)\] (\S+) → (\S+): ([A-Z]+)\b/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findRosterPath(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, '.sdlc', 'team.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function loadRosterRoles(taskDir: string, rosterPath?: string): Set<string> | null {
  const file = rosterPath ?? findRosterPath(taskDir);
  if (!file || !fs.existsSync(file)) return null;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (isRecord(parsed) && isRecord(parsed.roles)) {
      return new Set(Object.keys(parsed.roles));
    }
  } catch {
    return null;
  }
  return null;
}

function loadWorkflow(packageRoot: string, workflow: string): Map<string, WorkflowStep> | null {
  if (!workflow || workflow.includes('/') || workflow.includes('\\') || workflow.includes('..')) {
    return null;
  }
  const wfPath = path.join(
    packageRoot,
    'skills',
    'sdlc-orchestrator',
    'references',
    'workflows',
    `${workflow}.json`,
  );
  if (!fs.existsSync(wfPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(wfPath, 'utf8')) as WorkflowDef;
    if (!parsed || !Array.isArray(parsed.steps)) return null;
    return new Map(parsed.steps.map((s) => [s.id, s]));
  } catch {
    return null;
  }
}

export function checkRun(
  taskDir: string,
  opts: { packageRoot?: string; rosterPath?: string } = {},
): CheckRunResult {
  const packageRoot = opts.packageRoot ?? DEFAULT_PACKAGE_ROOT;
  const errors: string[] = [];
  const strikes: string[] = [];

  const runPath = path.join(taskDir, 'run.json');
  if (!fs.existsSync(runPath)) {
    errors.push('run.json: file not found');
    return { errors, strikes };
  }

  let rawRun: unknown;
  try {
    rawRun = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  } catch (err) {
    errors.push(`run.json: invalid JSON (${err instanceof Error ? err.message : String(err)})`);
    return { errors, strikes };
  }

  if (!isRecord(rawRun)) {
    errors.push('run.json: root must be a JSON object');
    return { errors, strikes };
  }

  const rosterRoles = loadRosterRoles(taskDir, opts.rosterPath);

  let workflowSteps: Map<string, WorkflowStep> | null = null;
  if (typeof rawRun.workflow !== 'string' || rawRun.workflow.trim().length === 0) {
    errors.push('run.json: missing or invalid "workflow"');
  } else {
    workflowSteps = loadWorkflow(packageRoot, rawRun.workflow);
    if (!workflowSteps) {
      errors.push(`run.json: unknown workflow "${rawRun.workflow}"`);
    }
  }

  if (!isRecord(rawRun.steps)) {
    errors.push('run.json: missing or invalid "steps"');
  } else {
    const stepsObj = rawRun.steps;
    for (const [stepId, stepVal] of Object.entries(stepsObj)) {
      const wfStep = workflowSteps?.get(stepId);
      if (workflowSteps && !wfStep) {
        errors.push(`run.json: unknown step "${stepId}"`);
      }
      if (!isRecord(stepVal)) {
        errors.push(`run.json: step "${stepId}" must be an object`);
        continue;
      }
      if (typeof stepVal.status !== 'string' || !ALLOWED_STATUSES.has(stepVal.status)) {
        errors.push(`run.json: step "${stepId}" has invalid status "${String(stepVal.status)}"`);
      }
      if (
        typeof stepVal.attempts !== 'number' ||
        !Number.isInteger(stepVal.attempts) ||
        stepVal.attempts < 0
      ) {
        errors.push(`run.json: step "${stepId}" attempts must be an integer >= 0`);
      }

      if (wfStep && stepVal.status === 'done') {
        for (const need of wfStep.needs ?? []) {
          const depVal = stepsObj[need];
          const depStatus = isRecord(depVal) ? depVal.status : undefined;
          if (depStatus !== 'done' && depStatus !== 'skipped') {
            errors.push(
              `run.json: step "${stepId}" is done but needed step "${need}" is "${String(depStatus ?? 'missing')}"`,
            );
          }
        }
        if (wfStep.type === 'gate' && stepVal.approvedBy !== 'user') {
          errors.push(`run.json: gate "${stepId}" is done without approvedBy "user"`);
        }
      }
    }
  }

  if (rawRun.sessions !== undefined) {
    if (!isRecord(rawRun.sessions)) {
      errors.push('run.json: "sessions" must be an object');
    } else {
      for (const [role, entry] of Object.entries(rawRun.sessions)) {
        if (!isRecord(entry)) {
          errors.push(`run.json: session "${role}" must be an object`);
          continue;
        }
        if (typeof entry.cli !== 'string' || entry.cli.trim().length === 0) {
          errors.push(`run.json: session "${role}" missing non-empty "cli"`);
        }
        if (typeof entry.id !== 'string' || entry.id.trim().length === 0) {
          errors.push(`run.json: session "${role}" missing non-empty "id"`);
        }
      }
    }
  }

  if (rawRun.sendbacks !== undefined) {
    if (!Array.isArray(rawRun.sendbacks)) {
      errors.push('run.json: "sendbacks" must be an array');
    } else {
      for (let i = 0; i < rawRun.sendbacks.length; i++) {
        const sb = rawRun.sendbacks[i];
        if (!isRecord(sb)) {
          errors.push(`run.json: sendbacks[${i}] must be an object`);
          continue;
        }
        for (const field of ['from', 'to'] as const) {
          const val = sb[field];
          if (typeof val !== 'string' || val.trim().length === 0) {
            errors.push(`run.json: sendbacks[${i}].${field} must be a non-empty string`);
            continue;
          }
          if (workflowSteps && rosterRoles) {
            if (!workflowSteps.has(val) && !rosterRoles.has(val)) {
              errors.push(`run.json: sendbacks[${i}].${field} "${val}" is not a workflow step or roster role`);
            }
          }
        }
      }
    }
  }

  const boardPath = path.join(taskDir, 'board.md');
  if (fs.existsSync(boardPath)) {
    const lines = fs.readFileSync(boardPath, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      const trimmed = (lines[i] ?? '').trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

      const match = BOARD_LINE_RE.exec(trimmed);
      if (!match) {
        errors.push(`board.md:${lineNo}: invalid line format`);
        continue;
      }

      const stepId = match[1]!;
      const from = match[2]!;
      const to = match[3]!;
      const msgType = match[4]!;

      let hadFinding = false;

      if (workflowSteps && stepId !== 'live-thread' && !workflowSteps.has(stepId)) {
        errors.push(`board.md:${lineNo}: unknown step "${stepId}"`);
        hadFinding = true;
      }

      const hasStrike = /\(strike:/i.test(trimmed);
      const bucket = hasStrike ? strikes : errors;

      if (!ALLOWED_BOARD_TYPES.has(msgType)) {
        bucket.push(`board.md:${lineNo}: unknown TYPE "${msgType}"`);
        hadFinding = true;
      }

      if (rosterRoles) {
        if (!rosterRoles.has(from) && !BOARD_SPECIAL_PARTICIPANTS.has(from)) {
          bucket.push(`board.md:${lineNo}: unknown sender "${from}"`);
          hadFinding = true;
        }
        if (!rosterRoles.has(to) && !BOARD_SPECIAL_PARTICIPANTS.has(to)) {
          bucket.push(`board.md:${lineNo}: unknown recipient "${to}"`);
          hadFinding = true;
        }
      }

      if (hasStrike && !hadFinding) {
        strikes.push(`board.md:${lineNo}: strike recorded`);
      }
    }
  }

  return { errors, strikes };
}
