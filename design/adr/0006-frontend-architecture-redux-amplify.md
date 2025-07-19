# ADR-0006: Frontend Architecture with Redux Toolkit, Amplify Data, and Next.js

**Status**: 🟢 Accepted  
**Date**: 2025-01-19  
**Deciders**: Development Team

## Context and Problem Statement

We need a frontend state management solution that can handle both real-time data subscriptions (for queries) and command execution (for state-changing operations) while maintaining a clear separation between read and write operations in alignment with our CQRS architecture. Additionally, we need a React framework that provides seamless AWS Amplify Gen2 integration and optimal developer experience.

## Decision Drivers

* CQRS architecture requires separation of queries and commands
* Need real-time UI updates from backend state changes
* Complex state management for project configuration and templates
* Integration with Amplify Gen2 Data client (not traditional GraphQL API)
* Seamless authentication integration with AWS Cognito
* File-based routing for intuitive navigation structure
* Support for client-side rendering with real-time capabilities
* Zero-configuration build system and deployment
* Clear data flow patterns for maintainability
* Type safety and developer experience

## Considered Options

* **Option 1**: React + Vite + React Router with Redux Toolkit
* **Option 2**: Next.js + Redux Toolkit with Amplify Data + API Gateway
* **Option 3**: Next.js with built-in state management only
* **Option 4**: Remix + Redux Toolkit with Amplify integration
* **Option 5**: Create React App with Apollo Client

## Decision Outcome

Chosen option: **"Next.js + Redux Toolkit with Amplify Data + API Gateway"**, because it provides excellent developer experience, zero-configuration setup, seamless Amplify Gen2 integration, type safety, and cleanly separates our query (Amplify Data) and command (API Gateway) responsibilities while maintaining unified state management.

### Implementation Details

**Next.js + Redux Architecture**:
- **Next.js 14**: React framework with app directory routing
- **Client-side Rendering**: All pages use CSR for real-time capabilities
- **Redux Toolkit**: Core state management with createSlice
- **Dual API Pattern**: Custom RTK Query for Amplify Data + standard RTK Query for API Gateway
- **Domain Organization**: App directory structure aligned with business domains
- **Subscription Middleware**: Real-time updates via Amplify Data subscriptions

**Data Flow Patterns**:

**Query Pattern (Read Operations via Amplify Data)**:
```
Next.js Page → RTK Query Hook → Custom Amplify BaseQuery → Amplify Data Client → AppSync → DynamoDB
                                                                      ↓
Real-time Updates: Amplify Subscriptions → Subscription Middleware → RTK Cache Invalidation → Component Re-render
```

**Command Pattern (Write Operations via API Gateway)**:
```
Next.js Page → RTK Query Mutation → Standard BaseQuery → API Gateway → Lambda → EventBridge
                                                                    ↓
Optimistic Update → Redux State → Component Re-render → Real-time Confirmation via Amplify Subscription
```

**Authentication Flow**:
```
Next.js Root Layout → @aws-amplify/ui-react Authenticator → Automatic Context → Amplify Data Client + API Gateway
```

**Dual API Store Structure**:
```typescript
store: {
  // Amplify Data APIs (Read Models)
  [projectApi.reducerPath]: projectApi.reducer,      // Projects, ProjectMembers
  [templateApi.reducerPath]: templateApi.reducer,    // Templates, Categories
  [userApi.reducerPath]: userApi.reducer,           // Users, Profiles
  
  // API Gateway APIs (Commands/Observability)
  [observabilityApi.reducerPath]: observabilityApi.reducer, // Metrics, Logs, Traces
  
  // UI State (traditional slices)
  ui: {
    theme: 'light',
    navigation: {},
    modals: {},
    notifications: []
  }
}
```

### Custom RTK Query Integration with Amplify Data

```typescript
// app/lib/store/amplifyApi.ts - Custom RTK Query for Amplify Data
import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/schema';

const client = generateClient<Schema>();

// Custom baseQuery that uses Amplify Data client instead of fetch
const amplifyBaseQuery: BaseQueryFn<
  {
    model: keyof Schema;
    operation: 'list' | 'get' | 'create' | 'update' | 'delete';
    data?: any;
    id?: string;
    filter?: any;
  },
  unknown,
  unknown
> = async ({ model, operation, data, id, filter }) => {
  try {
    switch (operation) {
      case 'list':
        const listResult = await client.models[model].list(filter ? { filter } : undefined);
        return { data: listResult.data };
        
      case 'get':
        if (!id) throw new Error('ID required for get operation');
        const getResult = await client.models[model].get({ id });
        return { data: getResult.data };
        
      case 'create':
        const createResult = await client.models[model].create(data);
        return { data: createResult.data };
        
      // ... other operations
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  } catch (error) {
    return { error: { status: 'FETCH_ERROR', error: error.message } };
  }
};

// Project API using Amplify Data
export const projectApi = createApi({
  reducerPath: 'projectApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['Project', 'ProjectMember'],
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: (filter) => ({ model: 'Project', operation: 'list', filter }),
      providesTags: ['Project'],
    }),
    createProject: builder.mutation({
      query: (data) => ({ model: 'Project', operation: 'create', data }),
      invalidatesTags: ['Project'],
    }),
  }),
});

// Subscription middleware for real-time updates
export const subscriptionMiddleware = (store) => (next) => (action) => {
  if (action.type === 'subscriptions/setup') {
    const { model, operation } = action.payload;
    const subscription = client.models[model][operation]().subscribe({
      next: (data) => {
        // Invalidate RTK Query cache to trigger refetch
        store.dispatch(projectApi.util.invalidateTags(['Project']));
      }
    });
  }
  return next(action);
};
```

### Consequences

**Good**:
* **Zero Configuration**: Next.js eliminates build configuration overhead
* **Seamless Amplify Integration**: Built-in support for Amplify Gen2 with minimal setup
* **File-based Routing**: Intuitive navigation structure with app directory
* **Clear separation**: Queries via Amplify Data, commands via API Gateway
* **Real-time updates**: Automatic UI updates via Amplify Data subscriptions
* **Type safety**: Full TypeScript integration with Amplify-generated types
* **Authentication**: Zero-config auth with @aws-amplify/ui-react
* **Developer experience**: Next.js DevTools + Redux DevTools
* **Performance**: Automatic code splitting and optimization
* **Deployment**: Native Amplify Hosting integration

**Bad**:
* **Framework lock-in**: Tied to Next.js conventions and patterns
* **Complexity**: Dual API patterns require team understanding
* **Learning curve**: Team needs to understand Next.js + Amplify Data + Redux
* **Bundle size**: Next.js + Redux Toolkit + Amplify increases JavaScript bundle
* **Migration effort**: Requires updating existing React Router code

## Integration Guidelines

### Next.js App Directory Structure
```typescript
app/
├── layout.tsx                    # Root layout with Amplify Authenticator
├── page.tsx                      # Dashboard homepage
├── lib/
│   ├── amplify/
│   │   ├── schema.ts            # Amplify Data models
│   │   └── client.ts            # Data client setup
│   └── store/
│       ├── amplifyApi.ts        # Custom RTK Query for Amplify Data
│       └── observabilityApi.ts  # Standard RTK Query for API Gateway
├── projects/
│   ├── page.tsx                 # Projects list
│   └── [projectId]/
│       └── page.tsx            # Project detail hub
└── observability/
    ├── page.tsx                # Observability hub
    └── metrics/
        └── page.tsx           # Metrics dashboard
```

### Amplify Data Client Setup
```typescript
// app/lib/amplify/client.tsx
import { generateClient } from 'aws-amplify/data';
import type { Schema } from './schema';

const client = generateClient<Schema>();

// Provider for client context
export const AmplifyClientProvider = ({ children }) => {
  return (
    <AmplifyClientContext.Provider value={client}>
      {children}
    </AmplifyClientContext.Provider>
  );
};
```

### API Gateway Integration for Observability
```typescript
// app/lib/store/observabilityApi.ts
export const observabilityApi = createApi({
  reducerPath: 'observabilityApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_GATEWAY_ENDPOINT,
    prepareHeaders: (headers, { getState }) => {
      // Amplify automatically provides auth headers
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getMetrics: builder.query({
      query: (params) => `/api/v1/observability/metrics?${params}`,
    }),
    getLogs: builder.query({
      query: (params) => `/api/v1/observability/logs?${params}`,
    }),
  }),
});
```

### Error Handling
- API Gateway errors: Handled in thunk rejected cases
- Amplify errors: Handled in subscription error callbacks
- Optimistic update rollbacks: Automatic when command fails
- Network errors: Retry logic with exponential backoff

## Implementation Guidelines

1. **One Slice Per Domain**: Align with backend domain boundaries
2. **Optimistic Updates**: For all commands with user feedback
3. **Subscription Management**: Proper cleanup on component unmount
4. **Error Boundaries**: React error boundaries for GraphQL errors
5. **Loading States**: Clear loading indicators for all async operations

## More Information

* [Next.js App Directory Documentation](https://nextjs.org/docs/app)
* [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
* [AWS Amplify Data Documentation](https://docs.amplify.aws/nextjs/build-a-backend/data/)
* [@aws-amplify/ui-react Documentation](https://ui.docs.amplify.aws/)
* Related ADRs: ADR-0003 (CQRS), ADR-0004 (Amplify Gen2), ADR-0007 (Cloudscape Design), ADR-0008 (Hub Pattern), ADR-0009 (Next.js Integration)