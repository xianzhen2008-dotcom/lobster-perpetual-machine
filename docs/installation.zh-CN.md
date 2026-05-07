# 安装与配置教程

[English Version](installation.en.md) | [返回 README](../README.md)

这份教程会带你从零生成一个“龙虾永动机”工作区，并说明如何把它接入你自己的 Agent Runtime、任务系统和定时器。

## 1. 环境要求

最低要求：

- Node.js 18 或更高版本。
- npm 或兼容的包管理器。
- 一个可以运行 Agent 的环境，例如 OpenClaw、Claude Code、Codex、自建 agent runtime，或任意支持读取文件和定时唤醒的系统。

检查 Node：

```bash
node -v
npm -v
```

如果没有 Node.js，推荐从官网安装 LTS 版本：

```text
https://nodejs.org/
```

## 2. 方式一：直接从 GitHub 运行

不需要提前克隆仓库：

```bash
npx github:xianzhen2008-dotcom/lobster-perpetual-machine init
```

如果你只想快速生成默认配置：

```bash
npx github:xianzhen2008-dotcom/lobster-perpetual-machine init --yes --dir ./lobster-workspace
```

参数说明：

- `init`：启动新人配置向导。
- `--yes`：跳过交互，使用默认角色和默认功能。
- `--dir ./lobster-workspace`：指定生成工作区目录。

## 3. 方式二：克隆仓库后运行

适合想修改模板、二次开发或提交贡献的人。

```bash
git clone https://github.com/xianzhen2008-dotcom/lobster-perpetual-machine.git
cd lobster-perpetual-machine
npm install
npm run init
```

快速生成默认示例：

```bash
npm run demo
```

运行校验：

```bash
npm run check
```

模拟真实新人安装：

```bash
npm run smoke:newcomer
```

这个命令会创建一个临时空目录，把当前项目打成 npm 包，像外部用户一样安装并运行 `npx lobster-pm init --yes`，最后检查生成的工作区是否包含必要配置、角色提示词、任务真相源、项目驾驶舱、运行快照和私聊总线文件。

## 4. 初始化向导详解

向导会依次询问：

### 工作区名称

用于生成 `README.md` 和配置文件里的显示名。

示例：

```text
My AI Team OS
```

### 输出目录

生成的运行工作区位置。

示例：

```text
./workspace
```

### 功能开关

建议默认开启：

- `taskSystem`：任务真相源。
- `agentChatBus`：Agent 私聊总线。
- `projectCockpit`：项目驾驶舱。
- `evolutionInbox`：进化收件箱。
- `runtimeSnapshot`：运行快照。
- `cronHints`：定时心跳提示。
- `personalityLayer`：角色人格与表达风格层。

如果你只是想先试用，可以全部保持默认。

### 角色配置

默认核心团队：

- `main`：主控，负责主线、决策、派活、纠偏。
- `planner`：每日规划，负责每日纲领。
- `pm`：产品经理，负责需求结构化和验收标准。
- `dev`：工程负责人，负责实现和技术证据。
- `qa`：质量负责人，负责验收、打回和缺陷。
- `supervisor`：监督官，负责健康、产出、沟通、偏航审计。

你可以关闭某些角色，也可以修改显示名、心跳频率和职责描述。

## 5. 生成后的目录说明

```text
workspace/
  config/lpm.config.json        # 总配置
  prompts/                      # 各角色提示词
  tasks/todo.json               # 任务真相源
  tasks/PROJECT-COCKPIT.md      # 项目驾驶舱
  agent-chat/mailboxes/         # 每个 agent 的收件箱
  agent-chat/threads/           # 私聊/群聊线程
  muse/README.md                # Muse 兼容任务底座说明
  scheduler/heartbeat-plan.cron # 心跳定时参考，不会自动安装
  scheduler/README.md
  memory/runtime/OPS-SNAPSHOT.md
  memory/runtime/HEARTBEAT-DIFF.md
  evolution/EVOLUTION-INBOX.md
  docs/OPERATING-RULES.md
```

## 6. 第一次配置建议

生成后，按顺序做这几件事：

### 6.1 填项目驾驶舱

打开：

```text
tasks/PROJECT-COCKPIT.md
```

至少补齐：

- 当前项目是什么。
- 用户问题是什么。
- 今天希望交付什么。
- 当前处于哪个阶段。
- 哪个门禁失败。
- 下一棒 owner 是谁。
- 验收看什么证据。

### 6.2 填第一批任务

打开：

```text
tasks/todo.json
```

每条任务至少要有：

- `title`
- `status`
- `owner`
- `project_id`
- `next_action`
- `acceptance_criteria`
- `evidence`

不要把一句话需求直接交给开发。先让 PM 结构化。

### 6.3 检查角色提示词

打开：

```text
prompts/main.md
prompts/pm.md
prompts/dev.md
prompts/qa.md
prompts/supervisor.md
```

把这些 prompt 接入你自己的 Agent Runtime。

## 7. 如何接入定时心跳

龙虾永动机本身不绑定某个具体 runtime。初始化程序不会自动安装系统定时器，但会生成 `scheduler/heartbeat-plan.cron` 和 `scheduler/README.md`，让你清楚看到推荐频率。

这样设计是故意的：公开模板不知道你最终使用 OpenClaw、Codex、Claude Code 还是自建 runtime，直接写入 cron/launchd 容易制造意外唤醒。

你可以用任意方式定时唤醒 agent，只要每轮遵守协议：

1. 先读自己的 mailbox。
2. 读项目驾驶舱和任务真相源。
3. 做一个真实动作、决策、纠偏、验收或 blocker 回写。
4. 更新线程、任务证据或运行快照。

示例 cron 思路：

```cron
*/10 * * * * run-agent main prompts/main.md
15 9 * * * run-agent planner prompts/planner.md
*/30 * * * * run-agent pm prompts/pm.md
*/30 * * * * run-agent dev prompts/dev.md
*/30 * * * * run-agent qa prompts/qa.md
15 * * * * run-agent supervisor prompts/supervisor.md
```

这里的 `run-agent` 是占位命令，你需要替换成自己的 agent runtime 命令。

如果只是想体验流程，不需要真实模型或 OpenClaw，可以先跑本地模拟：

```bash
npx lobster-pm doctor --dir ./workspace
npx lobster-pm demo-loop --dir ./workspace --rounds 1
npx lobster-pm tick --dir ./workspace --role main
```

模拟会读取 `tasks/todo.json`、`agent-chat/mailboxes/*`、`tasks/PROJECT-COCKPIT.md`，并写入：

- `memory/runtime/heartbeat-log.jsonl`
- `memory/runtime/OPS-SNAPSHOT.md`
- `memory/runtime/HEARTBEAT-DIFF.md`
- `agent-chat/threads/main-supervisor.md`

这能验证底层闭环是否成立，但它不是生产 agent，只是新手体验和部署自检。

## 8. 如何判断系统跑起来了

不要只看 agent 有没有回复，要看这几个文件有没有变化：

- `tasks/todo.json`：任务状态是否推进。
- `agent-chat/threads/`：协作是否有读写闭环。
- `memory/runtime/OPS-SNAPSHOT.md`：是否记录真实变化。
- `evolution/EVOLUTION-INBOX.md`：是否沉淀改进候选。
- `tasks/PROJECT-COCKPIT.md`：项目阶段和门禁是否更新。

如果连续几轮只有“系统稳定”“等待输入”，说明框架在空转，需要监督官介入纠偏。

## 9. 如何模拟真实新人环境测试

推荐分四层测试：

### 9.1 本地包安装黑盒测试

```bash
npm run smoke:newcomer
```

它验证：

- 新人不在源码目录里也能安装。
- `lobster-pm` 命令能被 `npx` 找到。
- `init --yes` 能生成完整工作区。
- 核心文件都存在。
- Muse 兼容任务底座、私聊线程、调度提示都存在。
- seed task 具备可执行字段。
- prompt 中包含心跳、收件箱、验收等关键协议。
- `doctor` 和 `demo-loop` 可以实际跑通一轮模拟心跳。

### 9.2 GitHub 远程安装测试

在任意空目录运行：

```bash
npx github:xianzhen2008-dotcom/lobster-perpetual-machine init --yes --dir ./lobster-test
```

如果这一步失败，通常是 GitHub 包入口、`package.json bin` 或 Node 版本存在问题。

### 9.3 新人阅读路径测试

让一个没看过项目的人只读这三个文件：

```text
README.md
docs/installation.zh-CN.md
docs/starter-guide.md
```

看她能否回答：

- 这个项目解决什么问题？
- 怎么安装？
- 生成后先改哪个文件？
- 如何判断系统真的跑起来？
- 哪些事情不能提交到公开仓库？

### 9.4 首轮运行模拟

生成工作区后，手动模拟第一轮：

1. planner 读 `tasks/PROJECT-COCKPIT.md`，写今日纲领。
2. main 读 `tasks/todo.json` 和 `agent-chat/mailboxes/main.md`，决定下一步。
3. pm 补齐任务规格。
4. dev 根据规格给出实现计划或 blocker。
5. qa 根据 acceptance criteria 给出验收要求。
6. supervisor 检查是否有真实变化和证据。

如果这六步无法跑通，说明不是模型问题，而是任务字段、角色职责或心跳协议还不够清楚。

也可以直接使用自动模拟：

```bash
npx lobster-pm demo-loop --dir ./lobster-test --rounds 1
```

## 10. 常见配置方案

### 轻量个人版

- 开启：main、pm、dev、qa、supervisor。
- 关闭：planner 或降低到每天一次。
- 心跳：main 手动运行，其余按需运行。

### 项目团队版

- 开启全部默认角色。
- main 每 10 分钟。
- pm/dev/qa 每 30 分钟。
- supervisor 每 60 分钟。
- planner 每天早晚各一次。

### 研究/进化版

- 开启 evolutionInbox。
- 增加 researcher 或 analyst specialist。
- 所有外部资料先进入进化收件箱，不直接进入任务池。

## 11. 隐私和安全

不要把以下内容提交到公开仓库：

- `.env`
- API key / token
- cookie / auth-state
- 数据库
- 真实业务数据
- 邮件或聊天记录
- 私人记忆和私人角色设定

建议把公开模板和私人运行工作区分开。
