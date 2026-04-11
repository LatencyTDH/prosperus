# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Email security@prosperus.dev with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive a response within 48 hours

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |

## Security Practices

- All API endpoints under `/v1/` require Bearer token authentication
- Request bodies are validated with Zod schemas before processing
- Database queries use parameterized queries via Drizzle ORM (no raw string interpolation)
- `.gitignore` excludes `.env` files, secrets, and credentials
- Dependencies are monitored via Dependabot
