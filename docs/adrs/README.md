# Architecture Decision Records

These ADRs capture repository-level decisions that shape how Prosperus is organized and how contributors are expected to extend it.

- [0001: Keep the repository split into sdk-python, server, and web packages](0001-monorepo-package-boundaries.md)
- [0002: Keep server code organized as routes → services → db](0002-server-layer-boundaries.md)
- [0003: Enforce bearer-token auth in a Fastify onRequest hook for /v1 routes](0003-auth-onrequest-hook.md)

New ADRs should be short, concrete, and focused on decisions that future contributors would otherwise have to rediscover from code history.
