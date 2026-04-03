# MyCommunity — Project Brief

## Project Overview
> **[Describe the app idea here — fill this in during brainstorming]**

## Stack
- **Runtime**: Node.js
- **Framework**: TBD during brainstorming
- **Database**: TBD during brainstorming
- **Deployment**: Railway (auto-deploy from `main` branch)
- **Repo**: https://github.com/marounhashem/mycommunity

## Developer
- Solo developer: Maroun Hashem
- Claude Code + Superpowers plugin installed (user scope)

## Superpowers Workflow
This project follows the mandatory Superpowers skill workflow:
1. **brainstorming** — Design first, no code until approved
2. **using-git-worktrees** — Isolated branches per feature
3. **writing-plans** — Break work into 2–5 min tasks
4. **executing-plans** — Batch execution with checkpoints
5. **test-driven-development** — RED → GREEN → REFACTOR always
6. **requesting-code-review** — Review between every task
7. **finishing-a-development-branch** — Merge/PR/discard decision

## Railway Setup
- Project name: `mycommunity`
- Environment: `production`
- Branch: `main`
- Region: asia-southeast1
- Auto-deploys on every push to `main`

## Environment Variables
> Add Railway environment variables here as they are created:
```
# DATABASE_URL=
# PORT=
# NODE_ENV=production
```

## Commands
```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Run tests
npm test

# Push to deploy
git push origin main
```

## Design Principles
- Test-Driven Development — write tests first, always
- Systematic over ad-hoc — process over guessing
- Complexity reduction — simplicity as primary goal
- Evidence over claims — verify before declaring success
