# ADR 0002: Keep server code organized as routes → services → db

## Status

Accepted

## Context

The API needs to evolve without collapsing HTTP concerns, business logic, and persistence details into the same files. Contributors need a predictable place to add validation, orchestration, and database access.

## Decision

Organize server code in three layers:

- `routes/` owns HTTP handlers, request parsing, and Zod validation
- `services/` owns business logic, aggregation, and orchestration
- `db/` owns Drizzle schema and database connection details

Routes call services. Services call the database layer. Database access should not be embedded directly in route modules except for trivial wiring.

## Consequences

- New endpoints have a predictable implementation path for contributors and agents
- Validation remains close to the HTTP boundary, which reduces accidental trust of request payloads
- Business logic becomes easier to test without involving route registration
- Some features will require small amounts of boilerplate when moving data across layers, but that cost is acceptable for legibility
