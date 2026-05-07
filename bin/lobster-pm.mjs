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
  cronHints: true,
  personalityLayer: true
};

function usage() {
  console.log(`Lobster Perpetual Machine

Usage:
  lobster-pm init [--yes] [--dir <workspace>]
  lobster-pm doctor [--dir <workspace>]
  lobster-pm tick [--dir <workspace>] [--role <roleId>]
  lobster-pm demo-loop [--dir <workspace>] [--rounds <n>]
  lobster-pm help
`);
}

function parseArgs(argv) {
  const args = { command: argv[2] || 'help', yes: false, dir: null, role: 'main', rounds: 1 };
  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') args.yes = true;
    else if (arg === '--dir') args.dir = argv[++i];
    else if (arg.startsWith('--dir=')) args.dir = arg.slice('--dir='.length);
    else if (arg === '--role') args.role = argv[++i];
    else if (arg.startsWith('--role=')) args.role = arg.slice('--role='.length);
    else if (arg === '--rounds') args.rounds = Number(argv[++i]);
    else if (arg.startsWith('--rounds=')) args.rounds = Number(arg.slice('--rounds='.length));
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
        next_action: 'Write today’s goal, deliverable, risks, owners, and acceptance gates.',
        acceptance_criteria: [
          'Daily charter exists.',
          'At least one project goal has owner, evidence path, and QA gate.'
        ],
        evidence: []
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
    '# Lobster Perpetual Machine heartbeat schedule hints',
    '# These entries are generated for review. They are NOT installed automatically.',
    '# Replace `npx lobster-pm tick` with your real agent runtime when connected.',
    '# Example local simulator schedule:',
    ''
  ];
  for (const role of enabledRoles) {
    const cron = role.id === 'main'
      ? '*/10 * * * *'
      : role.id === 'planner'
        ? '15 9 * * *'
        : role.id === 'supervisor'
          ? '15 * * * *'
          : '*/30 * * * *';
    lines.push(`${cron} npx lobster-pm tick --dir ${out} --role ${role.id}`);
  }
  lines.push('');
  return `${lines.join('\n')}`;
}

function schedulerReadme(config) {
  return `# Scheduler / 心跳定时

The starter generates scheduler hints but does not install OS timers automatically.

Why:

- Different users run different agent runtimes.
- Installing cron/launchd without review is surprising and unsafe.
- The generated schedule should be checked before it wakes agents repeatedly.

## Local simulator

\`\`\`bash
npx lobster-pm demo-loop --dir . --rounds 1
npx lobster-pm tick --dir . --role main
\`\`\`

## Generated role cadence

${config.roles.filter(role => role.enabled).map(role => `- ${role.id}: ${role.heartbeat}`).join('\n')}

## Production integration

Use \`heartbeat-plan.cron\` as a reference. Replace \`npx lobster-pm tick\` with the command that wakes your real agent runtime with the corresponding prompt.
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

- OS timers are not installed automatically.
- Scheduler hints are generated in \`scheduler/\`.
- The Muse-compatible task source is \`tasks/todo.json\`.
- Agent DM/thread surfaces are in \`agent-chat/\`.
`;
}

async function buildConfig(args) {
  if (args.yes) {
    return {
      workspaceName: 'My Lobster Perpetual Machine',
      outputDir: path.resolve(args.dir || 'workspace'),
      roles: DEFAULT_ROLES,
      features: DEFAULT_FEATURES
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

    const roles = [];
    for (const role of DEFAULT_ROLES) {
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
    return { workspaceName, outputDir, roles, features };
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
    features: config.features
  });
  writeText(path.join(out, 'README.md'), readmeLocal({ ...config, roles: enabledRoles }));
  writeText(path.join(out, 'docs/OPERATING-RULES.md'), operatingRules(config));
  writeText(path.join(out, 'tasks/PROJECT-COCKPIT.md'), projectCockpit({ ...config, roles: enabledRoles }));
  writeJson(path.join(out, 'tasks/todo.json'), todoSeed({ ...config, roles: enabledRoles }));
  writeText(path.join(out, 'memory/runtime/OPS-SNAPSHOT.md'), runtimeSnapshot());
  writeText(path.join(out, 'memory/runtime/HEARTBEAT-DIFF.md'), heartbeatDiff());
  writeText(path.join(out, 'evolution/EVOLUTION-INBOX.md'), evolutionInbox());
  writeText(path.join(out, 'muse/README.md'), museReadme());
  if (config.features.cronHints) {
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
    'docs/OPERATING-RULES.md',
    'tasks/todo.json',
    'tasks/PROJECT-COCKPIT.md',
    'memory/runtime/OPS-SNAPSHOT.md',
    'memory/runtime/HEARTBEAT-DIFF.md',
    'evolution/EVOLUTION-INBOX.md',
    'muse/README.md',
    'agent-chat/threads/main-supervisor.md',
    ...roleIds.map(id => `prompts/${id}.md`),
    ...roleIds.map(id => `agent-chat/mailboxes/${id}.md`),
    ...(config.features.cronHints ? ['scheduler/heartbeat-plan.cron', 'scheduler/README.md'] : [])
  ];
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
  if (config.features.cronHints) console.log('Scheduler hints exist. OS timers are not auto-installed.');
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
  if (args.command !== 'init') {
    usage();
    process.exitCode = 1;
    return;
  }
  const config = await buildConfig(args);
  const out = generateWorkspace(config);
  console.log(`\nGenerated workspace: ${out}`);
  console.log('Next: open README.md and fill tasks/PROJECT-COCKPIT.md');
  console.log(`Try: npx lobster-pm doctor --dir ${out}`);
  console.log(`Try: npx lobster-pm demo-loop --dir ${out} --rounds 1\n`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
