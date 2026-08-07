# Development Guide

## First-time setup

1. Install the pinned Node.js release with `nvm use`.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` when database work begins. `APP_DATA_DIR` defaults to the local `storage/` directory.
4. Start the development server with `npm run dev`.

## Quality checks

Run these checks before committing changes:

```bash
npm run lint
npm run build
```

`npm run build` is the release-readiness check; it compiles the application and runs Next.js production validation.

Run the protected-route browser smoke test with:

```bash
npm run test:e2e
```

See [backup and restore operations](BACKUP-RESTORE.md) before handling local business data.

## Dependency policy

Use local project dependencies only. Add a package when it solves a concrete project need, use the package manager lockfile, and avoid global tooling for project tasks.

## Git workflow

The default branch is `main`. Keep changes focused, run the quality checks, and write commit messages that explain the intent of the change.
