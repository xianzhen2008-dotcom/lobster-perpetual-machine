# Agent Chat Bus / Agent 私聊总线

## English

Agent communication should not depend on a one-time push message. Every core agent gets a mailbox and every important collaboration gets a thread.

### Rules

- Every heartbeat starts by reading the agent mailbox.
- If there are unread or blocked threads, the agent reads the relevant thread before doing other work.
- Every heartbeat ends by writing a state update, even if there is no actionable item.
- Push notifications are acceleration only. The thread store is the truth source.
- Main controller and supervisor can observe and intervene in important threads.

## 中文

Agent 之间不能只靠“临时发一句”。每个核心 agent 都应该有收件箱，重要协作应该有长期私聊或多人线程。

### 状态机

- `unread`：未读。
- `read`：已读但未承诺行动。
- `processing`：已接单，必须写 next action 和 ETA。
- `blocked`：必须写 blocker、需要谁介入、复查时间。
- `done`：必须写结果摘要和证据。

### 升级规则

以下情况自动进入主控待决策：

- 出现 blocker、decision、approval、escalation。
- 超过一个心跳周期仍未读。
- processing 超过 SLA 未更新。
- 连续两轮只读不处理。
- 明确 @main 或 @supervisor。

## Minimal File Surface

```text
agent-chat/
  mailboxes/main.md
  mailboxes/pm.md
  threads/main-pm.md
  threads/main-supervisor.md
```
