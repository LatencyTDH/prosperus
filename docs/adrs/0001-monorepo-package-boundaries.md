# ADR 0001: Keep the repository split into sdk-python, server, and web packages

## Status

Accepted

## Context

Prosperus ships three distinct surfaces:

- A Python SDK for instrumentation inside user applications
- A Fastify API for ingestion and querying
- A React dashboard for exploration and analysis

Those surfaces have different runtimes, dependency graphs, and release concerns, but they still need to evolve together around a shared domain model of traces, spans, evaluations, prompts, and experiments.

## Decision

Keep the repository as a monorepo with three package boundaries:

- `packages/sdk-python` for the Python SDK
- `packages/server` for the API
- `packages/web` for the dashboard

Use `pnpm` workspaces for the JavaScript and TypeScript packages, and keep Python packaging local to `sdk-python` via `hatchling`.

## Consequences

- Shared product changes can be developed in one repository without splitting domain context across multiple repos
- Each package keeps its own build and test tooling appropriate to its runtime
- Top-level docs and automation can describe one coherent system while package-level configs stay focused
- Cross-package changes still need discipline because type safety does not span TypeScript and Python automatically
