# AI Agent Instructions & Security Policy for Quiz_SP

## 🔒 Mandatory Security Rules (CRITICAL)

All AI agents (Antigravity, Gemini, Copilot, Claude, Cursor, etc.) working on this repository MUST strictly follow these rules before editing files, staging changes, or executing git commands:

### 1. Zero-Secret Policy in Codebase
- **NEVER** hardcode real API keys (e.g. `sk-...`, `AI_API_KEY`), tokens, JWT secrets, passwords, or external proxy/server IP addresses (`http://<ip>:<port>`) into any tracked source code file.
- Default settings in `backend/app/core/config.py`, `docker-compose.yml`, and `frontend/` MUST always use safe local dummy defaults (e.g. `http://localhost:8000/v1`, `""`, `change-this-...`).
- All real credentials MUST be loaded strictly via environment variables from `.env` or `backend/.env`.

### 2. Pre-Commit / Pre-Push Audit Checklist
Before running any `git add`, `git commit`, or `git push`:
1. Check `git status` and ensure no `.env` or sensitive files are staged.
2. Check `git diff --cached` (or `git diff`) to verify no credentials, API keys (`sk-*`), or external IP addresses are present in the changes.
3. Verify that `.env.example` contains ONLY placeholders and no production/dev secrets.
4. If ANY potential secret is found, **STOP IMMEDIATELY**, do not commit, and notify the user.

### 3. File Protection
- `.env`, `.env.*`, `backend/.env`, and any credentials MUST remain in `.gitignore`.
- If new sensitive files are created, add them to `.gitignore` before creating them.
