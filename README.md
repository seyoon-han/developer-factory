# Developer Factory

Developer Factory is an AI-centered development operations tool designed to manage development requests on a board while keeping the actual target repositories isolated under `workspace/`. Its goal is to bring task creation, requirement shaping, execution approval, review, history tracking, document storage, and analytics into a single workflow.

## Purpose

- Manage development requests in one board instead of scattering them across different channels.
- Improve automation safety by separating product code from the operational board itself.
- Reduce uncontrolled changes by introducing planning, review, and logging steps around AI execution.
- Keep team rules, project documents, comments, labels, and analytics in the same working context.

## Core Features

- Kanban-style task management
- AI-assisted requirement refinement and execution flow control
- A task pipeline that continues from approval to implementation, review, and history tracking
- Support for multiple project repositories connected under `workspace/`
- Project document and uploaded file storage
- Comments, labels, settings, webhooks, and integrations management
- Analytics views for token usage and task status
- Browser IDE integration support
- Team rulesets and automation rules storage

## What Is Included

This repository includes only the source code, configuration, tests, Docker setup, and automation scripts required to run the project. The following items are intentionally excluded:

- Local environment files
- Database files and logs
- Build artifacts
- Temporary reports and status notes

## Quick Start

### 1. Run with Docker

This is the simplest way to get started.

```bash
cp .env.example .env
docker-compose up -d --build
```

Default endpoints:

- Board: `http://localhost:3001`
- IDE port: `http://localhost:3101`

After startup:

1. Enter the key used for AI features in the settings screen.
2. Create a project or connect an existing repository.
3. Create a task and start the approval-based automation workflow.

### 2. Run in Local Development Mode

```bash
npm install
cp .env.example .env
npm run dev
```

Default endpoint:

- Local development server: `http://localhost:3000`

To run the browser IDE separately:

```bash
cd theia-ide
npm install
npm run build
npm start
```

## Recommended Workflow

1. Connect a project repository under `workspace/`.
2. Create a new task from the board and write the request.
3. Let the AI refine the requirements or strengthen the execution plan.
4. Approve the task and run the implementation or automation phase.
5. Review the result and organize comments, labels, and documents together.
6. Use reports and analytics screens when you need to inspect history.

## Environment Variables

Base examples are documented in `.env.example`, and additional integration examples are available in `.env.local.example`.

Essential or near-essential:

- `ANTHROPIC_API_KEY`: required for AI features

Frequently used:

- `PORT`: internal application port
- `THEIA_PORT`: IDE port
- `GIT_USER_NAME`: default author name for automated work or commits
- `GIT_USER_EMAIL`: default email for automated work or commits

Optional examples:

- `NEXT_PUBLIC_APP_URL`
- `GITHUB_ACCESS_TOKEN`
- `GITHUB_WEBHOOK_SECRET`
- `GITLAB_ACCESS_TOKEN`
- `GITLAB_WEBHOOK_SECRET`

## Main Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run type-check
npm run test
npm run docker:build
npm run docker:up
npm run docker:down
npm run docker:logs
npm run docker:test
```

To rebuild Docker quickly:

```bash
./scripts/docker-quick-rebuild.sh
```

## Directory Structure

```text
developer-factory/
├── app/              # UI routes and API routes
├── components/       # UI components
├── lib/              # Domain logic, stores, and utilities
├── types/            # Shared type definitions
├── docker/           # Container startup and initialization scripts
├── scripts/          # Development and operations helper scripts
├── theia-ide/        # Browser IDE integration settings
├── __tests__/        # Test code
├── workspace/        # Location of connected project repositories
├── data/             # Runtime data directory
├── logs/             # Runtime logs directory
└── reports/          # Execution report directory
```

## Operational Notes

- `workspace/` is meant for actual target project code and is intentionally kept separate from the application repository.
- `data/`, `logs/`, and `reports/` are runtime-generated outputs and are excluded from Git tracking.
- `.claude/` contains local commands and skill configuration used by the automation flow.
- In Docker mode, the initial database and required directories are prepared automatically at container startup.

## Verification Checklist

Minimum recommended checks before deployment:

```bash
docker-compose config
npm run lint
npm run type-check
npm run test
```

## Troubleshooting

### Docker build is slow or fails

- Make sure Docker has enough memory and CPU allocated.
- The first build can take a while, so try again with `docker-compose up -d --build`.

### Port conflicts

- Change the `3001:3000` and `3101:3100` mappings in `docker-compose.yml`.
- In local development mode, you can also change `PORT` and `THEIA_PORT`.

### IDE integration does not start immediately

- Check whether `theia-ide/` needs a separate build.
- If IDE functionality is required, run `cd theia-ide && npm install && npm run build` first.

## License

If you need a dedicated licensing policy, add and manage it through a `LICENSE` file.

