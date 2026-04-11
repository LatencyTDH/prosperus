# Troubleshooting

## Canonical Local Validation

Run the same top-level validation flow before opening a pull request:

```bash
make check
```

That command runs:

- `pnpm -r build`
- `pnpm -r lint`
- `cd packages/sdk-python && uv run mypy src/`
- `pnpm -r test`
- `cd packages/sdk-python && uv run pytest`

## Server Integration Tests Need PostgreSQL And Migrations

The server integration tests in `packages/server/tests/integration.test.ts` only run when all of the following are true:

- `DATABASE_URL` is set
- PostgreSQL is reachable
- the `spans` table exists

The fastest way to satisfy that locally is:

```bash
make setup
pnpm --filter @prosperus/server test
```

If you already have PostgreSQL running, applying migrations is enough:

```bash
pnpm --filter @prosperus/server db:migrate
pnpm --filter @prosperus/server test
```

## Python SDK Environment Missing Or Out Of Sync

If the SDK commands fail because the local environment is missing or stale, resync it with `uv`:

```bash
cd packages/sdk-python
uv sync
```

## Docker Pull Or Startup Failures

If `docker compose up postgres -d` fails before tests can start:

- confirm Docker Desktop is running
- confirm the machine can reach Docker Hub
- retry `docker compose pull postgres`

Once the image is available locally, rerun `make setup`.
