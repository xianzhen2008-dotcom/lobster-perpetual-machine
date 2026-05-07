#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lpm-newcomer-'));
const INSTALL_DIR = path.join(TMP, 'fresh-project');
const WORKSPACE_DIR = path.join(INSTALL_DIR, 'workspace');

function run(cmd, args, opts = {}) {
  const label = `${cmd} ${args.join(' ')}`;
  console.log(`\n$ ${label}`);
  return execFileSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    stdio: opts.stdio || 'pipe',
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_loglevel: 'warn',
      npm_config_yes: 'true'
    }
  });
}

function assertFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`missing generated file: ${path.relative(WORKSPACE_DIR, file)}`);
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertIncludes(file, needle) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) {
    throw new Error(`${path.relative(WORKSPACE_DIR, file)} does not include: ${needle}`);
  }
}

function main() {
  console.log(`Newcomer smoke test temp dir: ${TMP}`);
  fs.mkdirSync(INSTALL_DIR, { recursive: true });

  const packOutput = run('npm', ['pack', '--pack-destination', TMP], { cwd: ROOT });
  const tarballName = packOutput.trim().split('\n').at(-1);
  const tarball = path.join(TMP, tarballName);
  if (!fs.existsSync(tarball)) throw new Error(`npm pack did not create tarball: ${tarball}`);

  run('npm', ['init', '-y'], { cwd: INSTALL_DIR });
  run('npm', ['install', tarball], { cwd: INSTALL_DIR });
  run('npx', ['lobster-pm', 'init', '--yes', '--dir', WORKSPACE_DIR], { cwd: INSTALL_DIR, stdio: 'inherit' });

  const required = [
    'README.md',
    'config/lpm.config.json',
    'docs/OPERATING-RULES.md',
    'tasks/todo.json',
    'tasks/PROJECT-COCKPIT.md',
    'memory/runtime/OPS-SNAPSHOT.md',
    'memory/runtime/HEARTBEAT-DIFF.md',
    'evolution/EVOLUTION-INBOX.md',
    'muse/README.md',
    'muse/TASK-LIFECYCLE.md',
    'scheduler/openclaw-cron-jobs.json',
    'scheduler/heartbeat-plan.cron',
    'scheduler/README.md',
    'agent-chat/threads/main-supervisor.md',
    'prompts/main.md',
    'prompts/planner.md',
    'prompts/pm.md',
    'prompts/dev.md',
    'prompts/qa.md',
    'prompts/supervisor.md',
    'agent-chat/mailboxes/main.md',
    'agent-chat/mailboxes/planner.md',
    'agent-chat/mailboxes/pm.md',
    'agent-chat/mailboxes/dev.md',
    'agent-chat/mailboxes/qa.md',
    'agent-chat/mailboxes/supervisor.md'
  ];
  for (const rel of required) assertFile(path.join(WORKSPACE_DIR, rel));

  const config = readJson(path.join(WORKSPACE_DIR, 'config/lpm.config.json'));
  const enabled = config.roles.filter(role => role.enabled).map(role => role.id);
  for (const id of ['main', 'planner', 'pm', 'dev', 'qa', 'supervisor']) {
    if (!enabled.includes(id)) throw new Error(`role not enabled: ${id}`);
  }

  const todo = readJson(path.join(WORKSPACE_DIR, 'tasks/todo.json'));
  if (!Array.isArray(todo.tasks) || todo.tasks.length < 1) {
    throw new Error('todo.json should include seed task');
  }
  const task = todo.tasks[0];
  for (const field of ['id', 'title', 'status', 'owner', 'project_id', 'project_phase', 'user_problem', 'target_outcome', 'next_action', 'acceptance_criteria', 'evidence', 'created_at', 'updated_at', 'last_actor']) {
    if (!(field in task)) throw new Error(`seed task missing field: ${field}`);
  }

  assertIncludes(path.join(WORKSPACE_DIR, 'prompts/main.md'), 'Start every heartbeat by reading your inbox');
  assertIncludes(path.join(WORKSPACE_DIR, 'prompts/qa.md'), 'If implementation is complete, route it to QA');
  assertIncludes(path.join(WORKSPACE_DIR, 'docs/OPERATING-RULES.md'), 'Everything is stable');
  assertIncludes(path.join(WORKSPACE_DIR, 'tasks/PROJECT-COCKPIT.md'), 'Stage Gates');
  assertIncludes(path.join(WORKSPACE_DIR, 'muse/README.md'), 'tasks/todo.json');
  assertIncludes(path.join(WORKSPACE_DIR, 'muse/TASK-LIFECYCLE.md'), 'pending_acceptance');
  assertIncludes(path.join(WORKSPACE_DIR, 'scheduler/README.md'), 'OpenClaw native cron');
  const openclawJobs = readJson(path.join(WORKSPACE_DIR, 'scheduler/openclaw-cron-jobs.json'));
  if (!Array.isArray(openclawJobs.jobs) || openclawJobs.jobs.length < 1) {
    throw new Error('OpenClaw cron jobs should be generated');
  }

  run('npx', ['lobster-pm', 'doctor', '--dir', WORKSPACE_DIR], { cwd: INSTALL_DIR, stdio: 'inherit' });
  run('npx', ['lobster-pm', 'demo-loop', '--dir', WORKSPACE_DIR, '--rounds', '1'], { cwd: INSTALL_DIR, stdio: 'inherit' });
  assertFile(path.join(WORKSPACE_DIR, 'memory/runtime/heartbeat-log.jsonl'));
  assertIncludes(path.join(WORKSPACE_DIR, 'memory/runtime/HEARTBEAT-DIFF.md'), 'thread_changes: 1');

  console.log('\nNewcomer smoke test passed.');
  console.log(`Generated workspace: ${WORKSPACE_DIR}`);
}

try {
  main();
} catch (error) {
  console.error('\nNewcomer smoke test failed.');
  console.error(error?.stack || error);
  process.exit(1);
}
