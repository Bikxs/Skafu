# ADR-0006: Frontend Architecture with Redux Toolkit and Amplify

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need a frontend state management solution that can handle both real-time data subscriptions (for queries) and command execution (for state-changing operations) while maintaining a clear separation between read and write operations in alignment with our CQRS architecture.

## Decision Drivers

* CQRS architecture requires separation of queries and commands
* Need real-time UI updates from backend state changes
* Complex state management for project configuration and templates
* Integration with Amplify Gen2 auto-generated GraphQL API
* Support for offline capabilities and optimistic updates
* Clear data flow patterns for maintainability
* Type safety and developer experience

## Considered Options

* **Option 1**: React Context API only
* **Option 2**: Redux Toolkit with RTK Query
* **Option 3**: Redux Toolkit with Amplify Data + API Gateway
* **Option 4**: Zustand with separate API layers
* **Option 5**: Apollo Client for GraphQL with REST API calls

## Decision Outcome

Chosen option: **"Redux Toolkit with Amplify Data + API Gateway"**, because it provides excellent developer experience, type safety, and cleanly separates our query (Amplify) and command (API Gateway) responsibilities while maintaining unified state management.

### Implementation Details

**State Management Architecture**:
- **Redux Toolkit**: Core state management with createSlice
- **Domain Slices**: One slice per business domain
- **Unified Store**: Single source of truth for all application state
- **Middleware**: Custom middleware for command/query routing

**Data Flow Patterns**:

**Query Pattern (Read Operations)**:
```
Component → useSelector → Redux State → Amplify Data API → AppSync → DynamoDB Read Models
                                                        ↓
Real-time Updates: GraphQL Subscriptions → Redux Actions → Component Re-render
```

**Command Pattern (Write Operations)**:
```
Component → Dispatch Action → Redux Thunk → API Gateway → Step Functions → EventBridge
                           ↓
Optimistic Update → Redux State → Component Re-render
                           ↓
Real-time Confirmation ← GraphQL Subscription ← Read Model Update
```

**Store Structure**:
```javascript
store: {
  // Business Domain Slices
  projects: {
    list: [],
    selected: null,
    loading: false,
    error: null,
    filters: {},
    subscriptions: {}
  },
  templates: {
    catalog: [],
    selected: null,
    parameters: {},
    validation: {}
  },
  
  // Observability Slice  
  observability: {
    logs: [],
    metrics: {},
    alarms: [],
    // ... all monitoring data
  },
  
  // UI State
  ui: {
    theme: 'light',
    navigation: {},
    modals: {},
    notifications: []
  }
}
```

### Slice Implementation Pattern

Each domain slice implements both patterns:

```javascript
// Example: projectSlice.js
const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    // Query operations (Amplify Data)
    setProjects: (state, action) => {
      state.list = action.payload;
    },
    updateProject: (state, action) => {
      // Real-time update from subscription
    },
    
    // Command operations (optimistic updates)
    createProjectPending: (state, action) => {
      // Optimistic update
    },
    createProjectFulfilled: (state, action) => {
      // Confirmed via subscription
    },
    createProjectRejected: (state, action) => {
      // Rollback optimistic update
    }
  },
  extraReducers: (builder) => {
    // Handle async thunks for API Gateway commands
  }
});

// Thunks for commands
export const createProject = createAsyncThunk(
  'projects/create',
  async (projectData, { dispatch }) => {
    // Optimistic update
    dispatch(createProjectPending(projectData));
    
    // API Gateway command
    const response = await apiGateway.post('/projects', projectData);
    
    // Real confirmation comes via GraphQL subscription
    return response.data;
  }
);

// Amplify Data integration
export const subscribeToProjects = () => (dispatch) => {
  const subscription = client.graphql({
    query: subscriptions.onProjectUpdated
  }).subscribe({
    next: (data) => {
      dispatch(updateProject(data.onProjectUpdated));
    }
  });
  return subscription;
};
```

### Consequences

**Good**:
* **Clear separation**: Queries via Amplify, commands via API Gateway
* **Real-time updates**: Automatic UI updates via GraphQL subscriptions
* **Type safety**: Full TypeScript integration with generated types
* **Developer experience**: Redux DevTools, time-travel debugging
* **Optimistic updates**: Immediate UI feedback for better UX
* **Unified state**: Single source of truth for all application state
* **Testability**: Predictable state changes and clear data flow

**Bad**:
* **Complexity**: Dual data flow patterns require team understanding
* **Boilerplate**: More setup code compared to simpler solutions
* **Bundle size**: Redux Toolkit + Amplify increases JavaScript bundle
* **Learning curve**: Team needs to understand both patterns
* **State synchronization**: Ensuring consistency between optimistic and real updates

## Integration Guidelines

### Amplify Data Integration
```javascript
// Configure Amplify client
import { generateClient } from 'aws-amplify/data';
const client = generateClient();

// Use in Redux middleware
const amplifyMiddleware = (store) => (next) => (action) => {
  if (action.type.endsWith('/subscribeToChanges')) {
    // Setup GraphQL subscription
  }
  return next(action);
};
```

### API Gateway Integration
```javascript
// API client configuration
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_GATEWAY_URL,
  headers: {
    'Authorization': `Bearer ${getAuthToken()}`
  }
});

// Use in async thunks
export const executeCommand = createAsyncThunk(
  'domain/command',
  async (payload) => {
    return await apiClient.post('/api/commands/endpoint', payload);
  }
);
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

* [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
* [AWS Amplify Data Documentation](https://docs.amplify.aws/react/build-a-backend/data/)
* [CQRS Frontend Patterns](https://www.eventstore.com/blog/what-is-event-sourcing)
* Related ADRs: ADR-0003 (CQRS), ADR-0004 (Amplify Gen2), ADR-0008 (Cloudscape Design)