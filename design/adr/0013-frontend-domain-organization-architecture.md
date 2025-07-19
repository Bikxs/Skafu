# ADR-0013: Frontend Domain Organization Architecture

**Status**: 🟢 Accepted  
**Date**: 2025-01-19  
**Deciders**: Development Team

## Context and Problem Statement

We need a scalable frontend architecture that supports multiple business domains (Project Management, Template Management, AI Integration, GitHub Integration, Observability) while maintaining clear separation of concerns, preventing coupling between domains, and enabling independent development teams to work on different domains simultaneously.

The frontend must integrate with the existing Next.js 14 + Amplify Gen2 + Redux Toolkit stack while providing clear guidelines for folder structure, interdependency management, and development patterns that can scale to enterprise-level complexity.

## Decision Drivers

* **Domain Independence**: Each business domain should be developable independently
* **Clear Boundaries**: Prevent coupling and circular dependencies between domains
* **Scalability**: Architecture should support growth to 10+ domains and multiple teams
* **Next.js Integration**: Must work seamlessly with Next.js app directory routing
* **Redux Organization**: Clear state management patterns per domain
* **Code Reusability**: Shared components and utilities accessible across domains
* **Maintainability**: Consistent patterns and clear development guidelines
* **Team Autonomy**: Different teams can own different domains

## Considered Options

* **Option 1**: Flat structure with all code in main app directory
* **Option 2**: Hybrid approach with src/domains/ separate from app/
* **Option 3**: Domain-first with separate repositories per domain
* **Option 4**: Root app + Domain apps architecture (current pattern)

## Decision Outcome

Chosen option: **"Root App + Domain Apps Architecture"**, because it provides clear domain boundaries, enables independent development, maintains Next.js compatibility, and follows the established pattern already implemented in the codebase.

### Implementation Details

## 🏗️ **Overall Architecture Pattern**

**Root App + Domain Apps Architecture**:
```
implementation/
├── frontend/                    # Root App (Main Next.js Application)
│   ├── src/app/                # Next.js app directory routing
│   ├── src/store/              # Root Redux store + shared slices
│   ├── src/components/         # Shared/reusable components
│   ├── src/hooks/              # Shared React hooks
│   ├── src/utils/              # Shared utilities
│   └── src/types/              # Shared TypeScript types
└── domains/                    # Domain Apps (Business Logic)
    ├── observability/frontend/ # Observability domain
    ├── projects/frontend/      # Project Management domain
    ├── templates/frontend/     # Template Management domain
    ├── ai/frontend/           # AI Integration domain
    └── github/frontend/       # GitHub Integration domain
```

## 📁 **Root App Structure** (`/implementation/frontend/`)

**Purpose**: Main Next.js application that orchestrates domains, provides shared infrastructure, and handles routing.

```typescript
implementation/frontend/
├── amplify/                     # Amplify Gen2 configuration
│   ├── auth/
│   ├── data/
│   └── backend.ts
├── public/                      # Static assets
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Dashboard homepage
│   │   ├── globals.css         # Global styles
│   │   ├── (authenticated)/    # Route group for logged-in users
│   │   │   ├── dashboard/      # Cross-domain dashboard
│   │   │   ├── settings/       # User settings
│   │   │   ├── observability/  # Observability pages (imports domain)
│   │   │   ├── projects/       # Project pages (imports domain)
│   │   │   ├── templates/      # Template pages (imports domain)
│   │   │   ├── ai/            # AI pages (imports domain)
│   │   │   └── github/        # GitHub pages (imports domain)
│   │   └── (marketing)/        # Route group for public pages
│   │       ├── page.tsx        # Landing page
│   │       └── pricing/        # Pricing page
│   ├── components/             # Shared/reusable UI components
│   │   ├── ui/                # Basic UI components (Button, Input, Modal)
│   │   ├── layout/            # Layout components (Header, Sidebar, Footer)
│   │   ├── navigation/        # Navigation components
│   │   └── feedback/          # Feedback components (Toast, Alert)
│   ├── store/                 # Root Redux store configuration
│   │   ├── index.ts           # Store configuration
│   │   ├── StoreProvider.tsx  # Redux provider component
│   │   ├── hooks.ts           # Typed Redux hooks
│   │   ├── slices/            # Shared Redux slices
│   │   │   ├── authSlice.ts   # Authentication state
│   │   │   └── uiSlice.ts     # UI state (theme, sidebar, modals)
│   │   └── apis/              # Shared API slices
│   │       └── amplifyDataApi.ts # Amplify Data integration
│   ├── hooks/                 # Shared React hooks
│   │   ├── useAuth.ts
│   │   ├── useNotifications.ts
│   │   └── useLocalStorage.ts
│   ├── utils/                 # Shared utilities
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   ├── types/                 # Shared TypeScript types
│   │   ├── auth.types.ts
│   │   ├── api.types.ts
│   │   └── ui.types.ts
│   ├── config/                # Configuration files
│   │   └── amplify.ts
│   └── providers/             # React providers
│       └── providers.tsx      # Combined providers
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

**Root App Responsibilities**:
- **Routing**: Next.js app directory routing and navigation
- **Authentication**: Amplify authentication setup and management
- **Store Management**: Root Redux store configuration and provider
- **Shared Infrastructure**: Common components, hooks, utilities
- **Layout**: Root layout, navigation, and global UI state
- **Domain Orchestration**: Import and integrate domain components/pages

## 🎯 **Domain App Structure** (`/implementation/domains/{domain}/frontend/`)

**Purpose**: Self-contained business domain with domain-specific components, pages, and state management.

```typescript
implementation/domains/observability/frontend/
├── components/                 # Domain-specific components
│   ├── MetricsDashboard/      # Component folders with co-location
│   │   ├── MetricsDashboard.tsx
│   │   ├── MetricsDashboard.test.tsx
│   │   ├── MetricsDashboard.stories.tsx
│   │   └── index.ts           # Public exports
│   ├── LogsViewer/
│   │   ├── LogsViewer.tsx
│   │   ├── LogsViewer.test.tsx
│   │   └── index.ts
│   ├── TracesViewer/
│   └── AlertsPanel/
├── pages/                     # Domain page components
│   ├── ObservabilityDashboard.tsx
│   ├── MetricsPage.tsx
│   ├── LogsPage.tsx
│   ├── TracesPage.tsx
│   └── AlertsPage.tsx
├── store/                     # Domain-specific state management
│   ├── observabilityApi.ts   # RTK Query API slice
│   ├── observabilitySlice.ts # Redux slice for local state
│   ├── selectors.ts          # Memoized selectors
│   └── types.ts              # Store-related types
├── hooks/                     # Domain-specific React hooks
│   ├── useMetrics.ts
│   ├── useLogs.ts
│   ├── useTraces.ts
│   └── useAlerts.ts
├── utils/                     # Domain-specific utilities
│   ├── metricsFormatting.ts
│   ├── logParsing.ts
│   └── constants.ts
├── types/                     # Domain-specific TypeScript types
│   ├── metrics.types.ts
│   ├── logs.types.ts
│   ├── traces.types.ts
│   └── alerts.types.ts
├── __tests__/                 # Domain-specific tests
│   ├── components/
│   ├── hooks/
│   └── utils/
└── index.ts                   # Public API exports for the domain
```

**Domain App Responsibilities**:
- **Business Logic**: Domain-specific functionality and rules
- **UI Components**: Components specific to the domain's needs
- **State Management**: Domain-specific Redux slices and API integration
- **Data Types**: TypeScript types specific to the domain
- **Testing**: Domain-specific unit and integration tests
- **Public API**: Clean interface for root app integration

## 🔗 **Integration Patterns**

### 1. **Root App Imports Domain Pages**

```typescript
// Root App: app/(authenticated)/observability/page.tsx
'use client';

import { ObservabilityDashboard } from '../../../../domains/observability/frontend/pages/ObservabilityDashboard';
import { PageLayout } from '@/components/layout/PageLayout';

export default function ObservabilityPage() {
  return (
    <PageLayout
      title="Observability"
      description="Monitor your applications and infrastructure"
    >
      <ObservabilityDashboard />
    </PageLayout>
  );
}
```

### 2. **Root App Integrates Domain Store**

```typescript
// Root App: src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';

// Shared slices
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';

// Domain store imports
import { observabilityApi } from '../../domains/observability/frontend/store/observabilityApi';
import observabilitySlice from '../../domains/observability/frontend/store/observabilitySlice';
import { projectsApi } from '../../domains/projects/frontend/store/projectsApi';
import projectsSlice from '../../domains/projects/frontend/store/projectsSlice';

export const store = configureStore({
  reducer: {
    // Shared state
    auth: authSlice,
    ui: uiSlice,
    
    // Domain-specific state
    observability: observabilitySlice,
    projects: projectsSlice,
    
    // API slices
    [observabilityApi.reducerPath]: observabilityApi.reducer,
    [projectsApi.reducerPath]: projectsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(observabilityApi.middleware)
      .concat(projectsApi.middleware),
});
```

### 3. **Domain Public API Pattern**

```typescript
// Domain App: index.ts (Public API)
// Components
export { MetricsDashboard } from './components/MetricsDashboard';
export { LogsViewer } from './components/LogsViewer';
export { TracesViewer } from './components/TracesViewer';

// Pages
export { ObservabilityDashboard } from './pages/ObservabilityDashboard';
export { MetricsPage } from './pages/MetricsPage';

// Store
export { observabilityApi } from './store/observabilityApi';
export { default as observabilitySlice } from './store/observabilitySlice';

// Hooks
export { useMetrics } from './hooks/useMetrics';
export { useLogs } from './hooks/useLogs';

// Types
export type { MetricData, LogEntry, TraceData } from './types';
```

### 4. **Cross-Domain Communication**

**❌ Prohibited: Direct Domain-to-Domain Imports**
```typescript
// NEVER DO THIS - Direct import between domains
import { ProjectCard } from '../../projects/frontend/components/ProjectCard';
```

**✅ Allowed: Communication via Redux Store**
```typescript
// Domain observability uses project data via Redux
import { useAppSelector } from '../../../frontend/src/store/hooks';
import { selectActiveProject } from '../../../projects/frontend/store/selectors';

export const MetricsDashboard = () => {
  const activeProject = useAppSelector(selectActiveProject);
  // Use project data for metrics filtering
};
```

**✅ Allowed: Events via EventBridge Pattern**
```typescript
// Domain publishes events that other domains can subscribe to
dispatch(publishDomainEvent({
  type: 'PROJECT_SELECTED',
  payload: { projectId: 'project-123' }
}));
```

## 📋 **Development Guidelines**

### File Naming Conventions
- **Components**: PascalCase (`MetricsDashboard.tsx`)
- **Pages**: PascalCase (`ObservabilityDashboard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useMetrics.ts`)
- **Utilities**: camelCase (`metricsFormatting.ts`)
- **Types**: camelCase with `.types.ts` suffix (`metrics.types.ts`)
- **Tests**: Match source file with `.test.tsx` suffix

### Component Organization
- **Co-location**: Components with tests, stories, and exports in same folder
- **Public API**: Each component folder exports via `index.ts`
- **Composition**: Prefer composition over inheritance
- **Props Interface**: Export props interface for each component

### State Management Patterns
- **Domain Isolation**: Each domain manages its own state
- **RTK Query**: One API slice per domain for server state
- **Redux Slice**: One slice per domain for client state
- **Selectors**: Memoized selectors for performance
- **Types**: Strong typing for all state and actions

### Testing Organization
- **Domain Tests**: Tests within each domain's `__tests__/` folder
- **Shared Tests**: Root app tests in main `__tests__/` folder
- **Coverage**: Aim for 80%+ coverage per domain
- **Integration**: Cross-domain integration tests in root app

### Import Rules
1. **Domains CANNOT import from other domains**
2. **Domains CAN import from root app shared code**
3. **Root app CAN import from domain public APIs**
4. **Use absolute imports for clarity**
5. **Public API exports only via domain `index.ts`**

### Domain Boundaries
```typescript
// ✅ Allowed imports
import { Button } from '../../../frontend/src/components/ui/Button';
import { useAuth } from '../../../frontend/src/hooks/useAuth';
import { observabilityApi } from './store/observabilityApi';

// ❌ Prohibited imports  
import { ProjectCard } from '../../projects/frontend/components/ProjectCard';
import { createProject } from '../../projects/frontend/store/projectsSlice';
```

## 🚀 **Scalability Benefits**

### Team Independence
- **Domain Ownership**: Teams can own entire domains end-to-end
- **Independent Development**: No cross-domain dependencies block development
- **Parallel Work**: Multiple teams can work simultaneously without conflicts
- **Clear Boundaries**: Well-defined interfaces prevent integration issues

### Code Organization
- **Single Responsibility**: Each domain handles one business concern
- **Loose Coupling**: Domains communicate via well-defined contracts
- **High Cohesion**: Related functionality is grouped together
- **Easy Navigation**: Developers can find domain-specific code quickly

### Maintenance & Evolution
- **Incremental Updates**: Domains can be updated independently
- **Feature Flags**: New domain features can be rolled out gradually
- **Refactoring**: Domain-specific refactoring doesn't affect others
- **Migration**: Domains can potentially be extracted to micro-frontends

### Performance Optimization
- **Code Splitting**: Automatic code splitting per domain
- **Lazy Loading**: Domain pages can be lazy-loaded
- **Bundle Optimization**: Unused domains don't affect bundle size
- **Caching**: Domain-specific caching strategies

## 📊 **Implementation Plan**

### Phase 1: Foundation (Week 1)
- ✅ **Root App Setup**: Next.js 14 + Amplify Gen2 + Redux (Complete)
- ✅ **Shared Infrastructure**: Components, hooks, utilities (Complete)
- ✅ **Store Configuration**: Root store with domain integration (Complete)

### Phase 2: Domain Implementation (Weeks 2-6)
- 🔄 **Observability Domain**: Metrics, logs, traces, alerts (In Progress)
- ⏳ **Projects Domain**: Project management functionality
- ⏳ **Templates Domain**: Template management functionality
- ⏳ **AI Domain**: Claude integration and analysis
- ⏳ **GitHub Domain**: Repository and workflow management

### Phase 3: Integration & Polish (Week 7)
- ⏳ **Cross-Domain Features**: Dashboard with multi-domain data
- ⏳ **Performance Optimization**: Code splitting and lazy loading
- ⏳ **Testing**: Comprehensive test coverage
- ⏳ **Documentation**: Developer guides and API documentation

## 🔧 **Tooling & Automation**

### Development Tools
- **ESLint Rules**: Enforce import restrictions between domains
- **Path Mapping**: TypeScript path mapping for clean imports
- **Bundle Analysis**: Monitor domain bundle sizes
- **Testing**: Jest + React Testing Library per domain

### Build Optimization
- **Next.js**: Automatic code splitting per domain
- **Dynamic Imports**: Lazy loading for domain pages
- **Tree Shaking**: Remove unused domain code
- **Bundle Analysis**: Webpack Bundle Analyzer integration

### Quality Gates
- **Pre-commit Hooks**: Lint, type-check, test before commits
- **CI/CD Pipeline**: Automated testing and deployment
- **Code Coverage**: Domain-specific coverage reporting
- **Import Validation**: Automated checking of domain boundaries

## ⚠️ **Constraints & Trade-offs**

### Constraints
- **Next.js App Directory**: Must work within Next.js routing constraints
- **Redux Integration**: All domains must integrate with single store
- **Import Restrictions**: Strict enforcement of domain boundaries
- **Public API**: Domains must expose clean public interfaces

### Trade-offs

**Benefits**:
- **Scalability**: Supports large teams and complex applications
- **Maintainability**: Clear organization and boundaries
- **Team Autonomy**: Independent development workflows
- **Code Quality**: Enforced separation of concerns
- **Performance**: Automatic optimization opportunities

**Costs**:
- **Initial Complexity**: More setup than monolithic structure
- **Learning Curve**: Teams need to understand domain patterns
- **Integration Overhead**: Cross-domain features require more planning
- **Tooling Requirements**: Need automation to enforce boundaries

## 🔗 **Related ADRs**

- **ADR-0006**: Frontend Architecture with Redux Toolkit and Amplify
- **ADR-0008**: Cloudscape Details Page as Hub Pattern
- **ADR-0009**: Next.js with Amplify Gen2 Integration

## 📚 **References**

- [Domain-Driven Design](https://domainlanguage.com/ddd/)
- [Next.js App Directory](https://nextjs.org/docs/app)
- [Redux Toolkit Best Practices](https://redux-toolkit.js.org/usage/usage-guide)
- [Micro-Frontend Architecture](https://martinfowler.com/articles/micro-frontends.html)

---

This architecture provides a scalable, maintainable foundation for building complex frontend applications with clear domain boundaries, team autonomy, and excellent developer experience while maintaining compatibility with modern React and Next.js patterns.