# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records documenting significant architectural choices for the Skafu system.

## ADR Template

We use the [MADR (Markdown Architectural Decision Records)](https://adr.github.io/madr/) template:

```markdown
# {Short Title}

## Context and Problem Statement
{Describe the context and problem}

## Decision Drivers
* {Decision driver 1}
* {Decision driver 2}

## Considered Options
* Option 1
* Option 2
* Option 3

## Decision Outcome
Chosen option: "{Option Title}", because {justification}

### Consequences
* Good, because {positive outcome}
* Bad, because {negative outcome}

## More Information
{Additional context, references}
```

## ADR Index

### Core Architecture
- [ADR-0001: AWS Serverless Architecture](./0001-aws-serverless-architecture.md)
- [ADR-0002: Event-Driven Architecture with EventBridge](./0002-event-driven-eventbridge.md)
- [ADR-0003: CQRS with Event Sourcing](./0003-cqrs-event-sourcing-dynamodb.md)
- [ADR-0004: Amplify Gen2 for GraphQL Query Model](./0004-amplify-gen2-graphql-query-model.md)
- [ADR-0005: Shared Application Resources](./0005-shared-application-resources.md)

### Frontend & Backend Patterns
- [ADR-0006: Frontend Architecture with Redux Toolkit](./0006-frontend-architecture-redux-amplify.md)
- [ADR-0007: Step Functions Over Lambda Code](./0007-step-functions-over-lambda.md)
- [ADR-0008: Cloudscape Design System](./0008-cloudscape-design-system.md)

### Development & Operations
- [ADR-0009: GitHub Actions CI/CD](./0009-github-actions-cicd.md)
- [ADR-0010: Error Bus for Observability](./0010-error-bus-observability.md)
- [ADR-0011: Embedded Claude SDK](./0011-embedded-claude-sdk.md)
- [ADR-0012: No Template Versioning](./0012-no-template-versioning.md)
- [ADR-0013: Observability API Layer](./0013-observability-api-layer.md)

### Security
- [ADR-0014: API Security with Validation and WAF](./0014-api-security-validation-waf.md)
- [ADR-0015: Event Security with Validation and Idempotency](./0015-event-security-validation-idempotency.md)
- [ADR-0016: Secrets Manager Integration](./0016-secrets-manager-integration.md)
- [ADR-0017: Comprehensive Security Monitoring](./0017-security-monitoring-comprehensive.md)
- [ADR-0018: Code Security Scanning](./0018-code-security-scanning.md)

## Status Legend
- 🟢 **Accepted**: Decision is final and implemented
- 🟡 **Proposed**: Decision is proposed but not yet final
- 🔴 **Superseded**: Decision has been replaced by a newer ADR
- ⚫ **Deprecated**: Decision is no longer relevant