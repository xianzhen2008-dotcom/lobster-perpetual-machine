# Installation and Configuration Guide

[中文版](installation.zh-CN.md) | [Back to README](../README.en.md)

This guide shows how to generate a Lobster Perpetual Machine workspace and connect it to your own agent runtime, task system, and scheduler.

## 1. Requirements

Minimum requirements:

- Node.js 18 or later.
- npm or a compatible package manager.
- An agent runtime, such as OpenClaw, Claude Code, Codex, your own runtime, or any system that can read files and trigger recurring agent turns.

Check Node:

```bash
node -v
npm -v
```

If you do not have Node.js, install the LTS version:

```text
https://nodejs.org/
```

## 2. Option A: Run Directly from GitHub

No clone required:

```bash
npx github:xianzhen2008-dotcom/lobster-perpetual-machine init
```

Generate a default workspace without prompts:

```bash
npx github:xianzhen2008-dotcom/lobster-perpetual-machine init --yes --dir ./lobster-workspace
```

Arguments:

- `init`: start the setup wizard.
- `--yes`: skip prompts and use defaults.
- `--dir ./lobster-workspace`: choose output directory.

## 3. Option B: Clone and Run Locally

Use this if you want to edit templates or contribute.

```bash
git clone https://github.com/xianzhen2008-dotcom/lobster-perpetual-machine.git
cd lobster-perpetual-machine
npm install
npm run init
```

Generate a default demo:

```bash
npm run demo
```

Run validation:

```bash
npm run check
```

Simulate a real newcomer install:

```bash
npm run smoke:newcomer
```

This command creates a temporary empty directory, packs the current project as an npm package, installs it like an external user, runs `npx lobster-pm init --yes`, and checks that the generated workspace includes required config, role prompts, task truth source, project cockpit, runtime snapshot, and agent chat bus files.

## 4. Setup Wizard

The wizard asks for:

### Workspace Name

Used in generated `README.md` and config.

Example:

```text
My AI Team OS
```

### Output Directory

Where the runtime workspace is generated.

Example:

```text
./workspace
```

### Feature Flags

Recommended defaults:

- `taskSystem`: task truth source.
- `agentChatBus`: persistent agent communication.
- `projectCockpit`: project-level dashboard.
- `evolutionInbox`: improvement candidate queue.
- `runtimeSnapshot`: operating snapshot.
- `scheduler`: OpenClaw native cron scheduling.
- `personalityLayer`: role style and personality layer.

Keep defaults if you are trying the project for the first time.

### Roles

Default core team:

- `main`: controller for focus, decisions, dispatch, correction.
- `planner`: daily charter.
- `pm`: requirement structure and acceptance criteria.
- `dev`: implementation and technical evidence.
- `qa`: acceptance, rejection, and defects.
- `supervisor`: health, output, communication, and drift audit.

You can disable roles or edit display name, heartbeat interval, and responsibility.

## 5. Generated Directory

```text
workspace/
  config/lpm.config.json        # main config
  prompts/                      # role prompts
  tasks/todo.json               # task truth source
  tasks/PROJECT-COCKPIT.md      # project cockpit
  agent-chat/mailboxes/         # agent inboxes
  agent-chat/threads/           # DM/group threads
  muse/README.md                # Muse-compatible task base notes
  muse/TASK-LIFECYCLE.md        # Muse create/read/complete/QA flow
  scheduler/openclaw-cron-jobs.json # OpenClaw native cron job definitions
  scheduler/heartbeat-plan.cron # fallback reference only
  scheduler/README.md
  memory/runtime/OPS-SNAPSHOT.md
  memory/runtime/HEARTBEAT-DIFF.md
  evolution/EVOLUTION-INBOX.md
  docs/OPERATING-RULES.md
```

## 6. First Configuration

After generation, do these in order:

### 6.1 Fill the Project Cockpit

Open:

```text
tasks/PROJECT-COCKPIT.md
```

Fill:

- What project are we improving?
- What user problem matters?
- What should be delivered today?
- Which stage are we in?
- Which gate is failing?
- Who owns the next move?
- What evidence proves success?

### 6.2 Add Tasks

Open:

```text
tasks/todo.json
```

Each task should have:

- `title`
- `status`
- `owner`
- `project_id`
- `next_action`
- `acceptance_criteria`
- `evidence`

Do not send one-line ideas directly to engineering. Let PM structure them first.

### 6.3 Review Role Prompts

Open:

```text
prompts/main.md
prompts/pm.md
prompts/dev.md
prompts/qa.md
prompts/supervisor.md
```

Connect these prompts to your own agent runtime.

## 7. Heartbeat Scheduling

In an OpenClaw environment, Lobster Perpetual Machine uses **OpenClaw native cron first**. The starter wizard asks:

- Scheduling method: default is `openclaw-cron`.
- Which roles to schedule: enabled main / planner / pm / dev / qa / supervisor roles.
- Cadence: for example main every 10 minutes, pm/dev/qa every 30 minutes, supervisor every 60 minutes.
- Whether to deploy now: if yes, it writes into OpenClaw `cron/jobs.json`.

The non-interactive `--yes` path does not silently deploy scheduler jobs. Deploy after review:

```bash
npx lobster-pm install-scheduler --dir ./workspace --mode openclaw-cron --confirm
```

If your OpenClaw home is not `~/.openclaw`:

```bash
npx lobster-pm install-scheduler --dir ./workspace --mode openclaw-cron --openclaw-dir /path/to/.openclaw --confirm
```

The install command merges `scheduler/openclaw-cron-jobs.json` into OpenClaw `cron/jobs.json` and backs up the original file first. `scheduler/heartbeat-plan.cron` is only a fallback reference.

Each heartbeat must still follow the protocol:

1. Read mailbox first.
2. Read project cockpit and Muse task truth source.
3. Produce a real action, decision, correction, QA result, or blocker.
4. Write back thread status, task evidence, or runtime snapshot.

If you only want to experience the flow, you do not need a real model or OpenClaw. Run the local simulator:

```bash
npx lobster-pm doctor --dir ./workspace
npx lobster-pm demo-loop --dir ./workspace --rounds 1
npx lobster-pm tick --dir ./workspace --role main
```

The simulator reads `tasks/todo.json`, `agent-chat/mailboxes/*`, and `tasks/PROJECT-COCKPIT.md`, then writes:

- `memory/runtime/heartbeat-log.jsonl`
- `memory/runtime/OPS-SNAPSHOT.md`
- `memory/runtime/HEARTBEAT-DIFF.md`
- `agent-chat/threads/main-supervisor.md`

This verifies the operating loop, but it is not a production agent. It is a newcomer demo and deployment self-check.

## 8. How to Know It Is Working

Do not only check whether agents reply. Check whether these files change:

- `tasks/todo.json`: task status progresses.
- `agent-chat/threads/`: collaboration has read/write closure.
- `memory/runtime/OPS-SNAPSHOT.md`: real changes are recorded.
- `evolution/EVOLUTION-INBOX.md`: improvement candidates are captured.
- `tasks/PROJECT-COCKPIT.md`: project stage and gates are updated.

If multiple loops only say “stable” or “waiting for input”, the system is idling and the supervisor should intervene.

## 9. How to Simulate a Real Newcomer Environment

Use four layers:

### 9.1 Local Package Black-Box Test

```bash
npm run smoke:newcomer
```

It verifies:

- The package works outside the source directory.
- `lobster-pm` is available through `npx`.
- `init --yes` generates a complete workspace.
- Required files exist.
- The Muse-compatible task base, private threads, and OpenClaw cron jobs exist.
- The seed task has executable fields.
- Prompts include heartbeat, inbox, and QA protocol.
- `doctor` and `demo-loop` can run one simulated heartbeat loop.

### 9.2 GitHub Remote Install Test

Run this in any empty directory:

```bash
npx github:xianzhen2008-dotcom/lobster-perpetual-machine init --yes --dir ./lobster-test
```

If it fails, check GitHub packaging, `package.json bin`, or Node version.

### 9.3 Newcomer Reading Path Test

Ask someone who has never seen the project to read only:

```text
README.en.md
docs/installation.en.md
docs/starter-guide.md
```

They should be able to answer:

- What problem does this project solve?
- How do I install it?
- Which generated file should I edit first?
- How do I know the system is actually running?
- What must not be committed publicly?

### 9.4 First-Loop Simulation

After generating a workspace, manually simulate the first loop:

1. planner reads `tasks/PROJECT-COCKPIT.md` and writes a daily charter.
2. main reads `tasks/todo.json` and `agent-chat/mailboxes/main.md`, then decides the next move.
3. pm clarifies the task.
4. dev creates an implementation plan or blocker.
5. qa defines acceptance requirements.
6. supervisor checks whether there was real change and evidence.

If these six steps cannot run, the issue is not the model. The task fields, role responsibilities, or heartbeat protocol are not clear enough.

You can also run the automatic simulator:

```bash
npx lobster-pm demo-loop --dir ./lobster-test --rounds 1
```

## 10. Common Setups

### Lightweight Personal Setup

- Enable: main, pm, dev, qa, supervisor.
- Disable planner or run it once per day.
- Run main manually; run others on demand.

### Project Team Setup

- Enable all default roles.
- main every 10 minutes.
- pm/dev/qa every 30 minutes.
- supervisor every 60 minutes.
- planner once or twice per day.

### Research / Evolution Setup

- Enable evolutionInbox.
- Add researcher or analyst specialist.
- External materials go into Evolution Inbox first, not directly into tasks.

## 11. Privacy and Safety

Do not commit:

- `.env`
- API keys / tokens
- cookies / auth state
- databases
- real business data
- emails or chat logs
- private memories or private persona files

Keep public templates separate from private runtime workspaces.
