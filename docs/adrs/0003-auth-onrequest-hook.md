# ADR 0003: Enforce bearer-token auth in a Fastify onRequest hook for /v1 routes

## Status

Accepted

## Context

Most API routes require the same bearer-token check. Repeating auth logic in every handler would create drift, make omissions more likely, and force contributors to remember security rules at each endpoint.

## Decision

Apply bearer-token authentication centrally in a Fastify `onRequest` hook for all `/v1/` routes. Leave `/health` unauthenticated for readiness checks.

## Consequences

- Authentication behavior stays consistent across protected endpoints
- New `/v1/` routes inherit auth automatically, which reduces the chance of unsecured additions
- Route handlers can focus on validation and business logic rather than request gating
- Any future auth exceptions must be explicit, because bypassing the hook should be rare and documented
