# Starter Guide / 新人启动指南

## 1. Install / 安装

```bash
npx github:xianzhen2008-dotcom/lobster-perpetual-machine init
```

Or run from source:

```bash
npm install
npm run init
```

## 2. Choose Roles / 选择角色

Recommended minimal team:

- Main Controller
- Product Manager
- Engineer
- QA Lead
- Supervisor

Optional:

- Daily Planner
- Writer
- Frontend
- Backend
- Data
- DevOps
- Researcher

## 3. Choose Features / 选择功能

Start with:

- Task System: on
- Agent Chat Bus: on
- Project Cockpit: on
- Runtime Snapshot: on
- Supervisor: on
- Evolution Inbox: on

If you only want a lightweight setup, disable cron hints and run heartbeats manually.

## 4. Fill the First Project Cockpit / 填第一个项目驾驶舱

Open:

```text
tasks/PROJECT-COCKPIT.md
```

Fill:

- What product or system are we improving?
- What user problem matters most?
- What does success look like today?
- Which gate is failing?
- Who owns the next action?
- What evidence proves progress?

## 5. Start the Loop / 开始循环

Run the agents in this order:

1. Planner creates daily charter.
2. Main controller chooses focus.
3. PM structures tasks.
4. Engineer implements.
5. QA verifies.
6. Supervisor audits the last hour.
7. Main controller corrects the next loop.

## 6. Common Failure Modes / 常见失败

- Agents report “stable” but no task changed.
- Tasks have no owner or acceptance criteria.
- QA accepts without evidence.
- PM asks the human instead of making a default decision.
- Supervisor checks uptime but not value.
- Messages are pushed but not written into persistent threads.

When this happens, fix the operating system, not just the prompt.
