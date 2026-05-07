#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_ROLES = [
  {
    id: 'main',
    name: 'Lobster',
    title: 'Main Controller',
    enabled: true,
    heartbeat: '10m',
    responsibility: 'Owns direction, decisions, dispatch, escalation, and value judgment.'
  },
  {
    id: 'planner',
    name: 'Planner',
    title: 'Daily Architect',
    enabled: true,
    heartbeat: '24h',
    responsibility: 'Creates the daily charter and keeps work aligned with goals.'
  },
  {
    id: 'pm',
    name: 'PM',
    title: 'Product Manager',
    enabled: true,
    heartbeat: '30m',
    responsibility: 'Turns vague ideas into specs, milestones, gates, and acceptance criteria.'
  },
  {
    id: 'dev',
    name: 'Engineer',
    title: 'Engineering Lead',
    enabled: true,
    heartbeat: '30m',
    responsibility: 'Plans and implements technical changes with evidence.'
  },
  {
    id: 'qa',
    name: 'QA',
    title: 'Quality Lead',
    enabled: true,
    heartbeat: '30m',
    responsibility: 'Verifies outcomes, rejects weak evidence, and creates bugs when needed.'
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    title: 'Governance Officer',
    enabled: true,
    heartbeat: '60m',
    responsibility: 'Audits system health, real output, communication, drift, and value.'
  }
];

const DEFAULT_FEATURES = {
  taskSystem: true,
  agentChatBus: true,
  projectCockpit: true,
  evolutionInbox: true,
  runtimeSnapshot: true,
  scheduler: true,
  agentDiscovery: true,
  personalityLayer: true
};

function defaultSchedulerMode() {
  return 'openclaw-cron';
}

function usage() {
  console.log(`Lobster Perpetual Machine

Usage:
  lobster-pm init [--yes] [--dir <workspace>]
  lobster-pm doctor [--dir <workspace>]
  lobster-pm tick [--dir <workspace>] [--role <roleId>]
  lobster-pm demo-loop [--dir <workspace>] [--rounds <n>]
  lobster-pm scan-agents [--openclaw-dir <path>]
  lobster-pm install-agents [--dir <workspace>] [--openclaw-dir <path>] [--confirm]
  lobster-pm install-scheduler [--dir <workspace>] [--mode openclaw-cron|manual] [--confirm]
  lobster-pm help
`);
}

function parseArgs(argv) {
  const args = {
    command: argv[2] || 'help',
    yes: false,
    dir: null,
    role: 'main',
    rounds: 1,
    mode: defaultSchedulerMode(),
    confirm: false,
    openclawDir: path.join(process.env.HOME || '', '.openclaw')
  };
  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') args.yes = true;
    else if (arg === '--confirm') args.confirm = true;
    else if (arg === '--dir') args.dir = argv[++i];
    else if (arg.startsWith('--dir=')) args.dir = arg.slice('--dir='.length);
    else if (arg === '--role') args.role = argv[++i];
    else if (arg.startsWith('--role=')) args.role = arg.slice('--role='.length);
    else if (arg === '--rounds') args.rounds = Number(argv[++i]);
    else if (arg.startsWith('--rounds=')) args.rounds = Number(arg.slice('--rounds='.length));
    else if (arg === '--mode') args.mode = argv[++i];
    else if (arg.startsWith('--mode=')) args.mode = arg.slice('--mode='.length);
    else if (arg === '--openclaw-dir') args.openclawDir = argv[++i];
    else if (arg.startsWith('--openclaw-dir=')) args.openclawDir = arg.slice('--openclaw-dir='.length);
  }
  return args;
}

async function ask(rl, question, fallback) {
  const suffix = fallback === undefined ? '' : ` (${fallback})`;
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || fallback;
}

async function askBool(rl, question, fallback) {
  const label = fallback ? 'Y/n' : 'y/N';
  const answer = (await rl.question(`${question} (${label}): `)).trim().toLowerCase();
  if (!answer) return fallback;
  return ['y', 'yes', 'true', '1', '是', '开', '开启'].includes(answer);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text);
}

function appendText(file, text) {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, text);
}

function readText(file, fallback = '') {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : fallback;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function appendJsonl(file, value) {
  appendText(file, `${JSON.stringify(value)}\n`);
}

function heartbeatSeconds(interval) {
  const value = String(interval || '').trim().toLowerCase();
  if (value.endsWith('m')) return Math.max(60, Number.parseInt(value, 10) * 60);
  if (value.endsWith('h')) return Math.max(60, Number.parseInt(value, 10) * 3600);
  if (value.endsWith('d') || value === '24h') return 86400;
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) ? Math.max(60, numeric * 60) : 1800;
}

function schedulerCommand(out, roleId) {
  return `npx lobster-pm tick --dir ${shellQuote(out)} --role ${roleId}`;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function plistEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function workspaceSlug(out) {
  return path.basename(path.resolve(out)).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() || 'workspace';
}

function cronExprForRole(role) {
  const value = String(role.heartbeat || '').trim().toLowerCase();
  if (role.id === 'main') return '*/10 * * * *';
  if (role.id === 'planner') return '15 9 * * *';
  if (role.id === 'supervisor') return '15 * * * *';
  if (value.endsWith('m')) {
    const minutes = Number.parseInt(value, 10);
    if (Number.isFinite(minutes) && minutes > 0 && minutes <= 59) return `*/${minutes} * * * *`;
  }
  if (value.endsWith('h')) {
    const hours = Number.parseInt(value, 10);
    if (Number.isFinite(hours) && hours > 0 && hours <= 23) return `0 */${hours} * * *`;
  }
  return '*/30 * * * *';
}

function openClawConfigCandidates(openclawDir) {
  const base = path.resolve(openclawDir || path.join(process.env.HOME || '', '.openclaw'));
  return [
    path.join(base, 'openclaw.json'),
    path.join(base, '.openclaw/openclaw.json')
  ];
}

function readOpenClawAgents(openclawDir) {
  for (const file of openClawConfigCandidates(openclawDir)) {
    const config = readJson(file, null);
    const list = config?.agents?.list;
    if (Array.isArray(list)) {
      return {
        file,
        agents: list.map(agent => ({
          id: agent.id,
          name: agent.name || agent.id,
          model: agent.model,
          skills: Array.isArray(agent.skills) ? agent.skills : [],
          heartbeat: agent.heartbeat
        })).filter(agent => agent.id)
      };
    }
  }
  return { file: null, agents: [] };
}

function roleFromOpenClawAgent(role, agent) {
  if (!agent) return { ...role, source: 'default-generated' };
  return {
    ...role,
    name: agent.name || role.name,
    source: 'openclaw-detected',
    openclawAgentId: agent.id,
    openclawModel: agent.model,
    openclawSkills: agent.skills,
    heartbeat: role.heartbeat
  };
}

function discoverRoles(openclawDir) {
  const discovered = readOpenClawAgents(openclawDir);
  const byId = new Map(discovered.agents.map(agent => [agent.id, agent]));
  const roles = DEFAULT_ROLES.map(role => roleFromOpenClawAgent(role, byId.get(role.id)));
  return {
    openclawConfig: discovered.file,
    detectedAgents: discovered.agents,
    roles,
    missingRoleIds: roles.filter(role => role.source === 'default-generated').map(role => role.id)
  };
}

function defaultOpenClawAgent(role, workspace) {
  return {
    id: role.id,
    name: role.name,
    model: {
      primary: role.id === 'main' ? 'openai/gpt-5.4' : 'openai/gpt-5.4-mini',
      fallbacks: ['openrouter/free']
    },
    workspace: path.join(workspace, `workspace-${role.id}`),
    heartbeat: {
      every: role.heartbeat,
      target: 'last'
    },
    skills: ['team-chat', 'memory-search', 'self-improving-agent'],
    metadata: {
      generatedBy: 'lobster-perpetual-machine',
      roleTitle: role.title,
      responsibility: role.responsibility
    }
  };
}

function renderPrompt(role, config) {
  const featureLines = Object.entries(config.features)
    .filter(([, enabled]) => enabled)
    .map(([name]) => `- ${name}`)
    .join('\n');

  return `# ${role.name} · ${role.title}

You are part of a Lobster Perpetual Machine agent team.

## Role

${role.responsibility}

## Operating Rules

- Start every heartbeat by reading your inbox and the latest runtime snapshot.
- Do not invent a second truth source. Use the task file, project cockpit, thread records, and evidence paths.
- Every turn must end with one of: verifiable action, decision, correction, blocker, handoff, or evidence.
- If the task is vague, route it to PM/specification before implementation.
- If implementation is complete, route it to QA before release.
- If you are blocked, state the exact blocker, owner, and review time.
- Do not handle real private business, credentials, destructive external actions, or personal data unless the user explicitly configured this workspace for that scope.

## Enabled Features

${featureLines || '- none'}

## Heartbeat Output Style

Use short natural language. Avoid raw machine fields unless debugging.

Recommended structure:

1. What changed since last turn.
2. Current project or task stage.
3. What you did or decided.
4. What needs attention.
5. One improvement thought if useful.
`;
}

function operatingRules(config) {
  return `# Operating Rules

## Core Loop

1. Read daily charter.
2. Read project cockpit.
3. Read task truth source.
4. Read agent-chat inbox.
5. Decide one highest-value action.
6. Dispatch, implement, verify, or correct.
7. Write evidence and thread status.
8. Refresh runtime snapshot.

## Valid Heartbeat Outcomes

- Action: a real change with evidence.
- Decision: a clear owner, priority, or scope call.
- Correction: a detected drift and concrete fix.
- Verification: pass/fail with evidence.
- Blocker: exact reason, owner, and review time.

“Everything is stable” is not enough unless the heartbeat also records what was checked.

## Enabled Features

${Object.entries(config.features).map(([k, v]) => `- ${k}: ${v ? 'enabled' : 'disabled'}`).join('\n')}
`;
}

function projectCockpit(config) {
  return `# Project Cockpit

- project_id: PROJECT-001
- phase: Intake
- user_problem: Define the first real user problem here.
- target_outcome: Define what success looks like.
- current_gate: Intake -> Design
- failing_gate: none
- current_defects: none
- next_owner: ${config.roles.find(r => r.id === 'pm')?.name || 'PM'}
- release_artifact: TBD
- qa_gate: User journey must pass with evidence.

## Stage Gates

- Intake -> Design: user problem, success picture, non-goals.
- Design -> Build: PRD, smallest usable path, acceptance criteria.
- Build -> QA: runnable artifact and evidence.
- QA -> Release: user journey pass.
- Release -> Improve: next improvement selected.
`;
}

function todoSeed(config) {
  return {
    version: 1,
    tasks: [
      {
        id: 'TASK-001',
        title: 'Create first daily charter',
        status: 'ready',
        owner: config.roles.find(r => r.id === 'planner')?.name || 'Planner',
        value_stream: 'framework',
        project_id: 'PROJECT-001',
        project_phase: 'Intake',
        user_problem: 'The team needs a daily operating charter before autonomous work starts.',
        target_outcome: 'A short daily plan with goal, owner, evidence path, and QA gate.',
        next_action: 'Write today’s goal, deliverable, risks, owners, and acceptance gates.',
        acceptance_criteria: [
          'Daily charter exists.',
          'At least one project goal has owner, evidence path, and QA gate.'
        ],
        evidence: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_actor: 'lobster-pm-init'
      }
    ]
  };
}

function runtimeSnapshot() {
  return `# OPS-SNAPSHOT

- generated_at: not-started
- health: unknown
- active_tasks: 0
- last_heartbeat: none
- real_outputs_last_60m: 0

## Main Control

- status: not-started
- current_focus: none
- decision_queue: empty

## Supervisor Notes

- No audit yet.
`;
}

function heartbeatDiff() {
  return `# HEARTBEAT-DIFF

- last_checked_at: none
- task_changes: 0
- thread_changes: 0
- evidence_changes: 0
- empty_loop_reason: not-started
`;
}

function evolutionInbox() {
  return `# EVOLUTION-INBOX

This is not a task pool. It collects improvement candidates.

## Candidate Rules

- External ideas must be screened for value, cost, risk, and fit.
- Local lessons must include problem, evidence, and reusable rule.
- Only promoted candidates become tasks.

## Candidates

- none
`;
}

function schedulerPlan(config, out) {
  const enabledRoles = config.roles.filter(role => role.enabled);
  const lines = [
    '# Lobster Perpetual Machine fallback schedule hints',
    '# Primary mode is OpenClaw native cron. This file is only a human-readable fallback/export.',
    '# To deploy to OpenClaw native cron, run:',
    `# npx lobster-pm install-scheduler --dir ${out} --mode openclaw-cron --confirm`,
    '# Local simulator fallback:',
    ''
  ];
  for (const role of enabledRoles) {
    lines.push(`${cronExprForRole(role)} npx lobster-pm tick --dir ${out} --role ${role.id}`);
  }
  lines.push('');
  return `${lines.join('\n')}`;
}

function openClawPrompt(role, out) {
  const promptPath = path.join(out, `prompts/${role.id}.md`);
  const mailboxPath = path.join(out, `agent-chat/mailboxes/${role.id}.md`);
  return `【龙虾永动机心跳｜${role.id}】

这是 OpenClaw 原生 cron 定时唤醒。请先读：
1. ${promptPath}
2. ${mailboxPath}
3. ${path.join(out, 'tasks/todo.json')}
4. ${path.join(out, 'tasks/PROJECT-COCKPIT.md')}
5. ${path.join(out, 'muse/TASK-LIFECYCLE.md')}
6. ${path.join(out, 'memory/runtime/OPS-SNAPSHOT.md')}

本轮必须产生：真实动作、明确决策、纠偏、验收、blocker，或无任务 keepalive 记录。处理后必须写回 Muse 任务、agent-chat 线程或 runtime 证据。不要只说系统稳定。`;
}

function openClawCronJobs(config, out) {
  const slug = workspaceSlug(out);
  const jobs = config.roles.filter(role => role.enabled).map(role => ({
    id: `lpm-${slug}-${role.id}`,
    agentId: role.id,
    name: `LPM ${role.name} heartbeat (${role.id})`,
    enabled: true,
    createdAtMs: Date.now(),
    schedule: {
      kind: 'cron',
      expr: cronExprForRole(role),
      tz: 'Asia/Shanghai'
    },
    sessionTarget: role.id,
    wakeMode: 'now',
    payload: {
      kind: 'systemEvent',
      text: openClawPrompt(role, out)
    },
    state: {}
  }));
  return {
    version: 1,
    scheduler: {
      mode: 'openclaw-cron',
      workspace: out,
      note: 'Generated by lobster-pm. Merge into OpenClaw cron/jobs.json with install-scheduler.'
    },
    jobs
  };
}

function openClawAgentPlan(config, out) {
  const roles = config.roles.filter(role => role.enabled);
  const generatedAgents = roles
    .filter(role => role.source !== 'openclaw-detected')
    .map(role => defaultOpenClawAgent(role, out));
  const detectedAgents = roles
    .filter(role => role.source === 'openclaw-detected')
    .map(role => ({
      roleId: role.id,
      openclawAgentId: role.openclawAgentId,
      name: role.name,
      source: role.source
    }));
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    mode: generatedAgents.length > 0 ? 'detected-plus-defaults' : 'detected',
    openclawConfig: config.agentDiscovery?.openclawConfig || null,
    detectedAgents,
    generatedAgents,
    installHint: 'Run `npx lobster-pm install-agents --dir <workspace> --confirm` to merge generatedAgents into OpenClaw openclaw.json.'
  };
}

function schedulerReadme(config) {
  return `# Scheduler / 心跳定时

Primary scheduler: OpenClaw native cron.

The starter generates:

- \`scheduler/openclaw-cron-jobs.json\`: OpenClaw native cron jobs.
- \`scheduler/heartbeat-plan.cron\`: fallback reference only.

## Deploy to OpenClaw

\`\`\`bash
npx lobster-pm install-scheduler --dir . --mode openclaw-cron --confirm
\`\`\`

This merges generated jobs into \`~/.openclaw/cron/jobs.json\` by default. Use \`--openclaw-dir <path>\` if your OpenClaw home is elsewhere.

## Local simulator fallback

\`\`\`bash
npx lobster-pm demo-loop --dir . --rounds 1
npx lobster-pm tick --dir . --role main
\`\`\`

## Generated role cadence

${config.roles.filter(role => role.enabled).map(role => `- ${role.id}: ${role.heartbeat}`).join('\n')}

## Production integration

Use OpenClaw native cron first. Use OS cron/system timers only when OpenClaw cron is not available.
`;
}

function museReadme() {
  return `# Muse Adapter / Muse 任务底座

This public template ships a Muse-compatible task truth source instead of a full private Muse deployment.

Canonical task source:

\`\`\`text
tasks/todo.json
\`\`\`

Required task fields:

- id
- title
- status
- owner
- project_id
- next_action
- acceptance_criteria
- evidence

Do not create a second task source. If you connect a real Muse app, keep it synced with \`tasks/todo.json\` or replace this file with a documented adapter.
`;
}

function museLifecycle() {
  return `# Muse Task Lifecycle / Muse 任务链路

Muse is the task truth source for Lobster Perpetual Machine.

Canonical file:

\`\`\`text
tasks/todo.json
\`\`\`

## 1. Create / 写入任务

A task may be created by the user, main controller, PM, supervisor, or evolution pipeline.

Minimum required fields:

- \`id\`
- \`title\`
- \`status\`: \`draft\`
- \`owner\`
- \`project_id\`
- \`project_phase\`
- \`user_problem\`
- \`target_outcome\`
- \`next_action\`
- \`acceptance_criteria\`
- \`evidence\`
- \`created_at\`
- \`updated_at\`
- \`last_actor\`

One-line ideas must enter \`draft\` and go to PM before implementation.

## 2. Read / 读取任务

Every heartbeat reads \`tasks/todo.json\` before dispatching work.

Read priority:

1. \`blocked\` tasks with explicit owner.
2. \`pending_acceptance\` tasks for QA.
3. \`in_progress\` tasks with stale activity.
4. \`ready\` tasks aligned with the project cockpit.
5. \`draft\` tasks that PM must structure.

## 3. Start / 接单执行

Only \`ready\` tasks can move to \`in_progress\`.

The owner must write:

- \`started_at\`
- \`last_actor\`
- \`next_action\`
- expected evidence path

## 4. Submit / 提交验收

When implementation is finished, set:

- \`status: pending_acceptance\`
- \`submitted_at\`
- \`evidence\`: file path, command output, screenshot, URL, or log
- \`acceptance_note\`

No evidence means not done.

## 5. Accept or Reject / 完成或打回

QA must set one of:

- accepted: \`status: done\`, \`accepted_at\`, \`accepted_by\`, \`acceptance_note\`
- rejected: \`status: ready\`, \`rejected_at\`, \`rejected_by\`, \`rejection_reason\`, \`next_action\`

Rejected work returns to the owner or PM with a concrete next action.

## 6. Close / 归档

Only \`done\` tasks with evidence can be archived or summarized.

## State Flow

\`\`\`text
draft -> ready -> in_progress -> pending_acceptance -> done
                         |              |
                         v              v
                      blocked          ready
\`\`\`
`;
}

function mailbox(agent) {
  return `# Mailbox · ${agent.name}

## Unread

- none

## Processing

- none

## Blocked

- none

## Recently Done

- none

## Heartbeat Record

- not-started
`;
}

function readmeLocal(config) {
  const detectedCount = config.roles.filter(role => role.source === 'openclaw-detected').length;
  const generatedCount = config.roles.filter(role => role.enabled && role.source !== 'openclaw-detected').length;
  return `# ${config.workspaceName}

Generated by Lobster Perpetual Machine.

## First Steps

1. Open \`docs/OPERATING-RULES.md\`.
2. Fill \`tasks/PROJECT-COCKPIT.md\`.
3. Review prompts in \`prompts/\`.
4. Add real tasks to \`tasks/todo.json\`.
5. Start your agent runtime or connect these files to your own orchestrator.
6. To experience the loop locally, run \`npx lobster-pm demo-loop --dir . --rounds 1\`.

## Roles

${config.roles.map(r => `- ${r.name} (${r.id}): ${r.responsibility} Heartbeat: ${r.heartbeat}.`).join('\n')}

## Important

- OpenClaw native cron is the primary scheduler.
- Generated OpenClaw jobs are in \`scheduler/openclaw-cron-jobs.json\`.
- Agent discovery scanned local OpenClaw agents: detected ${detectedCount}, generated defaults ${generatedCount}.
- Generated/missing agent definitions are in \`agents/openclaw-agents.json\`.
- The Muse-compatible task source is \`tasks/todo.json\`.
- Muse lifecycle rules are in \`muse/TASK-LIFECYCLE.md\`.
- Agent DM/thread surfaces are in \`agent-chat/\`.
`;
}

async function buildConfig(args) {
  const defaultOpenClawDir = path.resolve(args.openclawDir || path.join(process.env.HOME || '', '.openclaw'));
  if (args.yes) {
    const discovery = discoverRoles(defaultOpenClawDir);
    return {
      workspaceName: 'My Lobster Perpetual Machine',
      outputDir: path.resolve(args.dir || 'workspace'),
      roles: discovery.roles,
      features: DEFAULT_FEATURES,
      agentDiscovery: {
        mode: discovery.detectedAgents.length > 0 ? 'detected-plus-defaults' : 'default-generated',
        openclawDir: defaultOpenClawDir,
        openclawConfig: discovery.openclawConfig,
        detectedCount: discovery.detectedAgents.length,
        missingRoleIds: discovery.missingRoleIds
      },
      scheduler: {
        mode: defaultSchedulerMode(),
        deploy: false,
        openclawDir: defaultOpenClawDir
      }
    };
  }

  const rl = readline.createInterface({ input, output });
  try {
    console.log('\n龙虾永动机初始化向导 / Lobster Perpetual Machine Starter\n');
    const workspaceName = await ask(rl, 'Workspace name / 工作区名称', 'My Lobster Perpetual Machine');
    const outputDir = path.resolve(await ask(rl, 'Output directory / 输出目录', args.dir || './workspace'));
    const features = {};
    for (const [key, fallback] of Object.entries(DEFAULT_FEATURES)) {
      features[key] = await askBool(rl, `Enable ${key}? / 是否开启 ${key}`, fallback);
    }
    const schedulerMode = features.scheduler
      ? await ask(rl, 'Scheduler mode / 心跳定时方式：优先 openclaw-cron，可选 manual', defaultSchedulerMode())
      : 'manual';
    const deployScheduler = schedulerMode === 'openclaw-cron'
      ? await askBool(rl, 'Deploy OpenClaw cron jobs now? / 是否现在自动部署到 OpenClaw 原生 cron', false)
      : false;
    const openclawDir = deployScheduler
      ? path.resolve(await ask(rl, 'OpenClaw home directory / OpenClaw 目录', path.join(process.env.HOME || '', '.openclaw')))
      : defaultOpenClawDir;
    const discovery = features.agentDiscovery ? discoverRoles(openclawDir) : {
      openclawConfig: null,
      detectedAgents: [],
      roles: DEFAULT_ROLES,
      missingRoleIds: DEFAULT_ROLES.map(role => role.id)
    };
    console.log(`\nAgent discovery / Agent 扫描：detected ${discovery.detectedAgents.length}, missing core roles ${discovery.missingRoleIds.length}.`);
    if (discovery.openclawConfig) console.log(`OpenClaw config: ${discovery.openclawConfig}`);

    const roles = [];
    for (const role of discovery.roles) {
      const enabled = await askBool(rl, `Enable role ${role.id} (${role.title})? / 是否启用`, role.enabled);
      if (!enabled) {
        roles.push({ ...role, enabled: false });
        continue;
      }
      const name = await ask(rl, `Display name for ${role.id} / 显示名称`, role.name);
      const heartbeat = await ask(rl, `Heartbeat interval for ${role.id} / 心跳频率`, role.heartbeat);
      const responsibility = await ask(rl, `Responsibility for ${role.id} / 职责`, role.responsibility);
      roles.push({ ...role, enabled: true, name, heartbeat, responsibility });
    }
    return {
      workspaceName,
      outputDir,
      roles,
      features,
      agentDiscovery: {
        mode: discovery.detectedAgents.length > 0 ? 'detected-plus-defaults' : 'default-generated',
        openclawDir,
        openclawConfig: discovery.openclawConfig,
        detectedCount: discovery.detectedAgents.length,
        missingRoleIds: discovery.missingRoleIds
      },
      scheduler: {
        mode: schedulerMode,
        deploy: deployScheduler,
        openclawDir
      }
    };
  } finally {
    rl.close();
  }
}

function generateWorkspace(config) {
  const out = config.outputDir;
  const enabledRoles = config.roles.filter(r => r.enabled);
  ensureDir(out);
  writeJson(path.join(out, 'config/lpm.config.json'), {
    workspaceName: config.workspaceName,
    generatedAt: new Date().toISOString(),
    roles: config.roles,
    features: config.features,
    agentDiscovery: config.agentDiscovery || { mode: 'default-generated' },
    scheduler: config.scheduler || { mode: 'openclaw-cron', deploy: false }
  });
  writeText(path.join(out, 'README.md'), readmeLocal({ ...config, roles: enabledRoles }));
  writeJson(path.join(out, 'agents/openclaw-agents.json'), openClawAgentPlan({ ...config, roles: enabledRoles }, out));
  writeText(path.join(out, 'docs/OPERATING-RULES.md'), operatingRules(config));
  writeText(path.join(out, 'tasks/PROJECT-COCKPIT.md'), projectCockpit({ ...config, roles: enabledRoles }));
  writeJson(path.join(out, 'tasks/todo.json'), todoSeed({ ...config, roles: enabledRoles }));
  writeText(path.join(out, 'memory/runtime/OPS-SNAPSHOT.md'), runtimeSnapshot());
  writeText(path.join(out, 'memory/runtime/HEARTBEAT-DIFF.md'), heartbeatDiff());
  writeText(path.join(out, 'evolution/EVOLUTION-INBOX.md'), evolutionInbox());
  writeText(path.join(out, 'muse/README.md'), museReadme());
  writeText(path.join(out, 'muse/TASK-LIFECYCLE.md'), museLifecycle());
  if (config.features.scheduler) {
    writeJson(path.join(out, 'scheduler/openclaw-cron-jobs.json'), openClawCronJobs({ ...config, roles: enabledRoles }, out));
    writeText(path.join(out, 'scheduler/heartbeat-plan.cron'), schedulerPlan({ ...config, roles: enabledRoles }, out));
    writeText(path.join(out, 'scheduler/README.md'), schedulerReadme({ ...config, roles: enabledRoles }));
  }

  for (const role of enabledRoles) {
    writeText(path.join(out, `prompts/${role.id}.md`), renderPrompt(role, config));
    writeText(path.join(out, `agent-chat/mailboxes/${role.id}.md`), mailbox(role));
  }

  writeText(path.join(out, 'agent-chat/threads/main-supervisor.md'), `# Main Controller ↔ Supervisor

- threadType: dm
- participants: main / supervisor
- state: open

## Messages

- none
`);

  return out;
}

function workspaceDir(args) {
  return path.resolve(args.dir || process.cwd());
}

function loadWorkspaceConfig(dir) {
  return readJson(path.join(dir, 'config/lpm.config.json'), null);
}

function enabledRoleIds(config) {
  return config.roles.filter(role => role.enabled).map(role => role.id);
}

function requiredWorkspaceFiles(config) {
  const roleIds = enabledRoleIds(config);
  return [
    'README.md',
    'config/lpm.config.json',
    'agents/openclaw-agents.json',
    'docs/OPERATING-RULES.md',
    'tasks/todo.json',
    'tasks/PROJECT-COCKPIT.md',
    'memory/runtime/OPS-SNAPSHOT.md',
    'memory/runtime/HEARTBEAT-DIFF.md',
    'evolution/EVOLUTION-INBOX.md',
    'muse/README.md',
    'muse/TASK-LIFECYCLE.md',
    'agent-chat/threads/main-supervisor.md',
    ...roleIds.map(id => `prompts/${id}.md`),
    ...roleIds.map(id => `agent-chat/mailboxes/${id}.md`),
    ...(config.features.scheduler ? ['scheduler/openclaw-cron-jobs.json', 'scheduler/heartbeat-plan.cron', 'scheduler/README.md'] : [])
  ];
}

function mergeOpenClawCronJobs(workspace, openclawDir) {
  const generatedFile = path.join(workspace, 'scheduler/openclaw-cron-jobs.json');
  const generated = readJson(generatedFile, null);
  if (!generated?.jobs?.length) throw new Error(`Missing generated OpenClaw cron jobs: ${generatedFile}`);

  const cronDir = path.join(openclawDir, 'cron');
  const jobsFile = path.join(cronDir, 'jobs.json');
  ensureDir(cronDir);
  const current = readJson(jobsFile, { version: 1, jobs: [] });
  const currentJobs = Array.isArray(current.jobs) ? current.jobs : [];
  const generatedIds = new Set(generated.jobs.map(job => job.id));
  const merged = {
    ...current,
    version: current.version || 1,
    jobs: [
      ...currentJobs.filter(job => !generatedIds.has(job.id)),
      ...generated.jobs
    ]
  };
  if (fs.existsSync(jobsFile)) {
    fs.copyFileSync(jobsFile, `${jobsFile}.bak-${Date.now()}`);
  }
  writeJson(jobsFile, merged);
  writeText(path.join(workspace, 'scheduler/DEPLOYED.md'), `# Scheduler Deployed

- mode: openclaw-cron
- openclaw_jobs_file: ${jobsFile}
- deployed_at: ${new Date().toISOString()}
- jobs: ${generated.jobs.map(job => job.id).join(', ')}
`);
  return { jobsFile, count: generated.jobs.length };
}

function openClawConfigPath(openclawDir) {
  const candidates = openClawConfigCandidates(openclawDir);
  return candidates.find(file => fs.existsSync(file)) || candidates[0];
}

function mergeOpenClawAgents(workspace, openclawDir) {
  const planFile = path.join(workspace, 'agents/openclaw-agents.json');
  const plan = readJson(planFile, null);
  const generated = Array.isArray(plan?.generatedAgents) ? plan.generatedAgents : [];
  if (generated.length === 0) {
    return { configFile: openClawConfigPath(openclawDir), count: 0 };
  }

  const configFile = openClawConfigPath(openclawDir);
  const config = readJson(configFile, {
    meta: { generatedBy: 'lobster-perpetual-machine' },
    agents: { defaults: {}, list: [] }
  });
  if (!config.agents) config.agents = { defaults: {}, list: [] };
  if (!Array.isArray(config.agents.list)) config.agents.list = [];
  const generatedIds = new Set(generated.map(agent => agent.id));
  config.agents.list = [
    ...config.agents.list.filter(agent => !generatedIds.has(agent.id)),
    ...generated
  ];
  ensureDir(path.dirname(configFile));
  if (fs.existsSync(configFile)) fs.copyFileSync(configFile, `${configFile}.bak-${Date.now()}`);
  writeJson(configFile, config);
  writeText(path.join(workspace, 'agents/DEPLOYED.md'), `# Agents Deployed

- mode: openclaw-agents
- openclaw_config: ${configFile}
- deployed_at: ${new Date().toISOString()}
- generated_agents: ${generated.map(agent => agent.id).join(', ')}
`);
  return { configFile, count: generated.length };
}

function installAgents(args) {
  const dir = workspaceDir(args);
  const config = loadWorkspaceConfig(dir);
  if (!config) throw new Error(`Not a Lobster workspace: ${dir}`);
  if (!args.confirm) {
    throw new Error('Refusing to deploy without --confirm. This writes generated agents into OpenClaw openclaw.json.');
  }
  const result = mergeOpenClawAgents(dir, path.resolve(args.openclawDir));
  if (result.count === 0) {
    console.log('No missing agents to install. Existing OpenClaw agents already cover the enabled LPM roles.');
    return;
  }
  console.log(`Installed ${result.count} generated OpenClaw agents into ${result.configFile}`);
}

function scanAgents(args) {
  const discovery = discoverRoles(path.resolve(args.openclawDir));
  console.log(`OpenClaw config: ${discovery.openclawConfig || 'not found'}`);
  console.log(`Detected agents: ${discovery.detectedAgents.length}`);
  for (const agent of discovery.detectedAgents) {
    console.log(`- ${agent.id}: ${agent.name}`);
  }
  console.log(`Missing core roles: ${discovery.missingRoleIds.join(', ') || 'none'}`);
}

function installScheduler(args) {
  const dir = workspaceDir(args);
  const config = loadWorkspaceConfig(dir);
  if (!config) throw new Error(`Not a Lobster workspace: ${dir}`);
  if (args.mode !== 'openclaw-cron') {
    throw new Error('Only openclaw-cron install is supported. Use scheduler/heartbeat-plan.cron manually for other runtimes.');
  }
  if (!args.confirm) {
    throw new Error('Refusing to deploy without --confirm. This writes to OpenClaw cron/jobs.json.');
  }
  const result = mergeOpenClawCronJobs(dir, path.resolve(args.openclawDir));
  console.log(`Installed ${result.count} OpenClaw cron jobs into ${result.jobsFile}`);
  console.log('If OpenClaw is running, it should pick up the generated jobs according to its cron scheduler.');
}

function doctorWorkspace(dir) {
  const config = loadWorkspaceConfig(dir);
  if (!config) {
    throw new Error(`Not a Lobster workspace: ${dir}`);
  }
  const missing = requiredWorkspaceFiles(config).filter(rel => !fs.existsSync(path.join(dir, rel)));
  if (missing.length > 0) {
    throw new Error(`Workspace is incomplete:\n${missing.map(rel => `- ${rel}`).join('\n')}`);
  }
  console.log(`Workspace OK: ${dir}`);
  console.log(`Roles: ${enabledRoleIds(config).join(', ')}`);
  console.log('Found Muse-compatible task source, agent-chat bus, runtime snapshot, and prompts.');
  if (config.features.scheduler) console.log('Found OpenClaw native cron job definitions.');
  if (config.features.agentDiscovery) console.log(`Agent discovery mode: ${config.agentDiscovery?.mode || 'unknown'}.`);
}

function firstTask(todo) {
  return Array.isArray(todo.tasks) ? todo.tasks[0] : null;
}

function tickMessage(roleId, task) {
  const taskLabel = task ? `${task.id} ${task.title}` : 'no active task';
  const messages = {
    planner: `我检查了项目驾驶舱和任务池，本轮把今日目标对齐到 ${taskLabel}。`,
    main: `我读完收件箱、项目驾驶舱和 Muse 任务源，本轮主线先推进 ${taskLabel}，下一棒按角色职责接力。`,
    pm: `我从产品视角检查了 ${taskLabel}，重点确认它是否有 next_action、验收标准和证据位置。`,
    dev: `我从工程视角检查了 ${taskLabel}，本轮产出实现前判断：先确认规格和可验证路径，再进入开发。`,
    qa: `我从验收视角检查了 ${taskLabel}，本轮要求任何完成结论都必须带 evidence，不能只口头通过。`,
    supervisor: `我审计了这一轮运行链路：必须看到任务、线程或快照的真实写入，不能用稳定状态冒充产出。`
  };
  return messages[roleId] || `我完成了 ${roleId} 的一轮心跳检查，目标是推进 ${taskLabel}。`;
}

function tickRole(dir, roleId) {
  const config = loadWorkspaceConfig(dir);
  if (!config) throw new Error(`Not a Lobster workspace: ${dir}`);
  if (!enabledRoleIds(config).includes(roleId)) {
    throw new Error(`Role is not enabled in this workspace: ${roleId}`);
  }

  const now = new Date().toISOString();
  const mailboxFile = path.join(dir, `agent-chat/mailboxes/${roleId}.md`);
  const snapshotFile = path.join(dir, 'memory/runtime/OPS-SNAPSHOT.md');
  const diffFile = path.join(dir, 'memory/runtime/HEARTBEAT-DIFF.md');
  const logFile = path.join(dir, 'memory/runtime/heartbeat-log.jsonl');
  const threadFile = path.join(dir, 'agent-chat/threads/main-supervisor.md');
  const todoFile = path.join(dir, 'tasks/todo.json');
  const cockpitFile = path.join(dir, 'tasks/PROJECT-COCKPIT.md');
  const todo = readJson(todoFile, { tasks: [] });
  const task = firstTask(todo);
  const result = tickMessage(roleId, task);
  const evidence = [
    `agent-chat/mailboxes/${roleId}.md`,
    'memory/runtime/heartbeat-log.jsonl',
    'memory/runtime/OPS-SNAPSHOT.md'
  ];

  appendText(mailboxFile, `\n- ${now}: heartbeat checked inbox; ${result}\n`);
  appendJsonl(logFile, {
    at: now,
    role: roleId,
    action: 'heartbeat_tick',
    task: task?.id || null,
    read: [
      `agent-chat/mailboxes/${roleId}.md`,
      'tasks/todo.json',
      'tasks/PROJECT-COCKPIT.md',
      'memory/runtime/OPS-SNAPSHOT.md'
    ],
    result,
    evidence
  });
  appendText(threadFile, `\n- ${now} · ${roleId}: ${result}\n`);
  writeText(snapshotFile, `# OPS-SNAPSHOT

- generated_at: ${now}
- health: running
- active_tasks: ${Array.isArray(todo.tasks) ? todo.tasks.filter(item => !['done', 'archived', 'cancelled'].includes(item.status)).length : 0}
- last_heartbeat: ${roleId}
- real_outputs_last_60m: see memory/runtime/heartbeat-log.jsonl

## Main Control

- status: simulator-active
- current_focus: ${task ? `${task.id} ${task.title}` : 'none'}
- decision_queue: inspect agent-chat threads

## Last Tick

- role: ${roleId}
- result: ${result}

## Supervisor Notes

- This is a local simulator tick. Replace with a real agent runtime for production use.
`);
  writeText(diffFile, `# HEARTBEAT-DIFF

- last_checked_at: ${now}
- task_changes: 0
- thread_changes: 1
- evidence_changes: 1
- empty_loop_reason: none; simulator wrote mailbox/thread/log evidence
`);

  readText(cockpitFile);
  console.log(`[${roleId}] ${result}`);
  console.log(`Evidence: ${evidence.join(', ')}`);
}

function demoLoop(dir, rounds) {
  const config = loadWorkspaceConfig(dir);
  if (!config) throw new Error(`Not a Lobster workspace: ${dir}`);
  const order = ['planner', 'main', 'pm', 'dev', 'qa', 'supervisor'].filter(id => enabledRoleIds(config).includes(id));
  const totalRounds = Number.isFinite(rounds) && rounds > 0 ? Math.floor(rounds) : 1;
  for (let round = 1; round <= totalRounds; round += 1) {
    console.log(`\nDemo loop round ${round}/${totalRounds}`);
    for (const roleId of order) tickRole(dir, roleId);
  }
  console.log(`\nDemo loop complete. Inspect ${path.join(dir, 'memory/runtime/heartbeat-log.jsonl')}`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.command === 'help' || args.command === '--help' || args.command === '-h') {
    usage();
    return;
  }
  if (args.command === 'doctor') {
    doctorWorkspace(workspaceDir(args));
    return;
  }
  if (args.command === 'tick') {
    tickRole(workspaceDir(args), args.role);
    return;
  }
  if (args.command === 'demo-loop') {
    demoLoop(workspaceDir(args), args.rounds);
    return;
  }
  if (args.command === 'scan-agents') {
    scanAgents(args);
    return;
  }
  if (args.command === 'install-agents') {
    installAgents(args);
    return;
  }
  if (args.command === 'install-scheduler') {
    installScheduler(args);
    return;
  }
  if (args.command !== 'init') {
    usage();
    process.exitCode = 1;
    return;
  }
  const config = await buildConfig(args);
  const out = generateWorkspace(config);
  if (config.scheduler?.deploy && config.scheduler.mode === 'openclaw-cron') {
    const result = mergeOpenClawCronJobs(out, path.resolve(config.scheduler.openclawDir));
    console.log(`Installed ${result.count} OpenClaw cron jobs into ${result.jobsFile}`);
  }
  console.log(`\nGenerated workspace: ${out}`);
  console.log('Next: open README.md and fill tasks/PROJECT-COCKPIT.md');
  console.log(`Try: npx lobster-pm doctor --dir ${out}`);
  console.log(`Try: npx lobster-pm demo-loop --dir ${out} --rounds 1\n`);
  console.log(`Install generated missing agents later: npx lobster-pm install-agents --dir ${out} --confirm`);
  console.log(`Deploy OpenClaw cron later: npx lobster-pm install-scheduler --dir ${out} --mode openclaw-cron --confirm\n`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
