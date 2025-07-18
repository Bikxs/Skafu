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

### 🏗️ Core Architecture (Foundation)
- [ADR-0001: Core Serverless Event-Driven Architecture](./0001-core-serverless-event-architecture.md) - **Consolidated** ✨
  - Combines serverless infrastructure, event-driven patterns, and shared resources
  - Supersedes: Old ADR-0001, ADR-0002, ADR-0005

### 📊 Data Architecture
- [ADR-0002: CQRS with Event Sourcing Implementation](./0002-cqrs-event-sourcing-implementation.md) - **Consolidated** ✨
  - Complete CQRS pattern with DynamoDB event store and Amplify Gen2 query models
  - Supersedes: Old ADR-0003, ADR-0004

### 🔍 Observability & Monitoring
- [ADR-0003: Observability and Error Management Architecture](./0003-observability-error-management.md) - **Consolidated** ✨
  - Centralized error handling and comprehensive observability API layer
  - Supersedes: Old ADR-0010, ADR-0013

### 🔒 Security Architecture
- [ADR-0004: Comprehensive Security Architecture](./0004-comprehensive-security-architecture.md) - **Consolidated** ✨
  - Complete security strategy including API protection, event security, secrets management, monitoring, and code scanning
  - Supersedes: Old ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018

### 🎯 Implementation Patterns
- [ADR-0005: Step Functions Over Lambda Code](./0005-step-functions-over-lambda.md)
  - Configuration-driven orchestration approach

### 🎨 Frontend Architecture
- [ADR-0006: Frontend Architecture with Redux Toolkit](./0006-frontend-architecture-redux-amplify.md)
  - React, Redux Toolkit, RTK Query, and Amplify integration
- [ADR-0007: Cloudscape Design System](./0007-cloudscape-design-system.md)
  - AWS UI component library for consistent design

### 🚀 Development & Operations
- [ADR-0008: GitHub Actions CI/CD](./0008-github-actions-cicd.md)
  - Continuous integration and deployment pipeline
- [ADR-0009: Embedded Claude SDK Integration](./0009-embedded-claude-sdk.md)
  - AI-powered scaffolding capabilities
- [ADR-0010: No Template Versioning](./0010-no-template-versioning.md)
  - Template management strategy

## Superseded ADRs

The following ADRs have been superseded by consolidated ADRs above:

<details>
<summary>Click to expand superseded ADRs</summary>

### Original Core Architecture
- 🔄 [Old ADR-0001: AWS Serverless Architecture](./0001-aws-serverless-architecture.md) → See new ADR-0001
- 🔄 [Old ADR-0002: Event-Driven Architecture with EventBridge](./0002-event-driven-eventbridge.md) → See new ADR-0001
- 🔄 [Old ADR-0005: Shared Application Resources](./0005-shared-application-resources.md) → See new ADR-0001

### Original Data Architecture
- 🔄 [Old ADR-0003: CQRS with Event Sourcing](./0003-cqrs-event-sourcing-dynamodb.md) → See new ADR-0002
- 🔄 [Old ADR-0004: Amplify Gen2 for GraphQL Query Model](./0004-amplify-gen2-graphql-query-model.md) → See new ADR-0002

### Original Observability
- 🔄 [Old ADR-0010: Error Bus for Observability](./0010-error-bus-observability.md) → See new ADR-0003
- 🔄 [Old ADR-0013: Observability API Layer](./0013-observability-api-layer.md) → See new ADR-0003

### Original Security
- 🔄 [Old ADR-0014: API Security with Validation and WAF](./0014-api-security-validation-waf.md) → See new ADR-0004
- 🔄 [Old ADR-0015: Event Security with Validation and Idempotency](./0015-event-security-validation-idempotency.md) → See new ADR-0004
- 🔄 [Old ADR-0016: Secrets Manager Integration](./0016-secrets-manager-integration.md) → See new ADR-0004
- 🔄 [Old ADR-0017: Comprehensive Security Monitoring](./0017-comprehensive-security-monitoring.md) → See new ADR-0004
- 🔄 [Old ADR-0018: Code Security Scanning](./0018-code-security-scanning.md) → See new ADR-0004

</details>

## Status Legend
- 🟢 **Accepted**: Decision is final and implemented
- 🟡 **Proposed**: Decision is proposed but not yet final
- 🔄 **Superseded**: Decision has been replaced by a newer ADR
- ⚫ **Deprecated**: Decision is no longer relevant
- ✨ **Consolidated**: Combines multiple related ADRs into one comprehensive document

## Reading Order for New Team Members

1. Start with **ADR-0001** (Core Architecture) to understand the foundation
2. Read **ADR-0002** (CQRS) to understand data flow
3. Review **ADR-0003** (Observability) for monitoring and debugging
4. Study **ADR-0004** (Security) for security requirements
5. Then read specific ADRs based on your area of focus

## Quick Reference

| Area | Primary ADR | Related ADRs |
|------|-------------|--------------|
| Infrastructure | ADR-0001 | ADR-0005, ADR-0008 |
| Data Management | ADR-0002 | ADR-0001 |
| API Development | ADR-0001, ADR-0004 | ADR-0002, ADR-0005 |
| Frontend | ADR-0006 | ADR-0002, ADR-0007 |
| Security | ADR-0004 | All ADRs |
| Monitoring | ADR-0003 | ADR-0001, ADR-0004 |
| AI Integration | ADR-0009 | ADR-0001 |