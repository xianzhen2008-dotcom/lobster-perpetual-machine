# Privacy and Safety / 隐私与安全

This project is designed as a public template. Keep private data outside the repository.

## Never Commit

- API keys and tokens.
- OAuth credentials and cookies.
- Private chat logs.
- Customer data.
- Work emails.
- Business reports.
- Local databases.
- Runtime memory containing personal details.

## Suggested Practice

- Keep secrets in `.env`, a secret manager, or your runtime config.
- Keep public templates generic.
- Keep private personas and user memories local.
- Redact task examples before sharing.
- Treat external actions as high-risk unless explicitly approved.

## 中文

龙虾永动机可以开源的是“组织机制、协议、模板、启动程序”。不应该开源的是你的真实业务数据、私人记忆、账号凭证、邮件、聊天记录和客户信息。
