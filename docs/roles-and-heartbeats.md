# Roles and Heartbeats / 角色与心跳

## Role Map

| Role | Responsibility | Typical Heartbeat |
|---|---|---|
| Main Controller | Direction, dispatch, decision, escalation, user-value judgment. | 10 minutes |
| Daily Planner | Daily charter, goals, gates, schedule, risk forecast. | 1-2 times/day |
| Product Manager | Requirement structure, specs, milestones, acceptance criteria. | 30 minutes |
| Engineer | Architecture, implementation, debugging, technical evidence. | 30 minutes |
| QA Lead | Acceptance, regression, defect creation, evidence validation. | 30 minutes |
| Supervisor | Health audit, output audit, communication audit, drift correction. | 60 minutes |

## Heartbeat Contract

A heartbeat must not be a passive status report. It must produce at least one of:

- A verifiable action.
- A clear decision.
- A correction.
- A blocked reason with owner and review time.
- An acceptance or rejection with evidence.
- A promoted improvement candidate.

## 中文规则

心跳不是“我还活着”。心跳必须回答：

- 刚过去这一轮真实变化是什么？
- 当前主线卡在哪？
- 我做了什么、决定了什么、派给谁？
- 证据在哪里？
- 如果空转，原因是什么，下一轮怎么纠偏？

## Output Style

Use natural language. Avoid raw machine fields in human-facing messages.

Recommended main controller format:

```text
Past window:
Current focus:
I arranged:
Risk / correction:
Improvement thought:
```

中文推荐：

```text
【过去一轮】
【当前主线】
【我已安排】
【风险与纠偏】
【进化思考】
```
