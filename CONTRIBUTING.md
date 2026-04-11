# Contributing to Prosperus

## Development Setup

```bash
make start    # installs deps, starts Postgres, migrates, launches dev servers
make stop     # shuts everything down
```

See [README.md](README.md#quick-start) for prerequisites and manual setup steps.

## Workflow

1. Create a branch from `main`
2. Run `make start` to get a local environment
3. Make your changes
4. Run `make check` (builds, lints, typechecks, and tests all packages)
5. Open a pull request

## Code Standards

### TypeScript (server, web)

- Strict mode enabled in all tsconfig files
- Zod validation on all API request bodies and query parameters
- Layered architecture in server: routes → services → db

### Python (sdk-python)

- Python 3.9+ compatibility (use `from __future__ import annotations`)
- Type annotations on all public functions
- `ruff` for linting, `mypy --strict` for type checking
- `pytest` for tests

### Commit Messages

Use conventional commit format:

```
feat(server): add evaluation filtering by label
fix(sdk-python): prevent context leak on flush error
docs: update architecture diagram
```

## Pull Request Process

1. Ensure CI passes (build, lint, test for all affected packages)
2. Add tests for new functionality
3. Update documentation if changing public APIs
4. Request review from a code owner

## Project Structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed breakdown of each package.
