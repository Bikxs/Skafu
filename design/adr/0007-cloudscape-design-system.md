# ADR-0007: Cloudscape Design System

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need a comprehensive UI component library and design system for our React frontend that provides consistency, accessibility, and professional appearance while integrating well with our AWS-focused architecture and reducing custom component development time.

## Decision Drivers

* Need for consistent, professional UI across all application features
* AWS-native application requiring AWS-consistent design patterns
* Accessibility requirements (WCAG 2.1 AA compliance)
* Rapid development without extensive custom component creation
* Team familiarity with AWS services and patterns
* Integration with existing React and TypeScript architecture
* Responsive design for multiple screen sizes

## Considered Options

* **Option 1**: Custom component library built from scratch
* **Option 2**: Material-UI (MUI) for React
* **Option 3**: Ant Design for React
* **Option 4**: Chakra UI for flexibility
* **Option 5**: AWS Cloudscape Design System

## Decision Outcome

Chosen option: **"AWS Cloudscape Design System"**, because it provides AWS-native design patterns, excellent accessibility, comprehensive component library, and aligns perfectly with our AWS-focused architecture while reducing development time.

### Implementation Details

**Cloudscape Integration**:
```typescript
// App.tsx - Root component setup
import { AppLayout, BreadcrumbGroup, SideNavigation } from '@cloudscape-design/components';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import '@cloudscape-design/global-styles/index.css';

function App() {
  // Apply theme mode
  applyMode(Mode.Light);

  return (
    <AppLayout
      navigation={<Navigation />}
      breadcrumbs={<Breadcrumbs />}
      content={<MainContent />}
      tools={<Tools />}
      notifications={<Notifications />}
    />
  );
}
```

**Component Usage Patterns**:
```typescript
// Project list component
import { 
  Table, 
  Header, 
  Button, 
  SpaceBetween,
  StatusIndicator,
  Badge
} from '@cloudscape-design/components';

export const ProjectList: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const columnDefinitions = [
    {
      id: 'name',
      header: 'Project Name',
      cell: (item) => (
        <Link href={`/projects/${item.id}`}>{item.name}</Link>
      ),
      sortingField: 'name'
    },
    {
      id: 'status',
      header: 'Status',
      cell: (item) => (
        <StatusIndicator type={getStatusType(item.status)}>
          {item.status}
        </StatusIndicator>
      )
    },
    {
      id: 'serviceCount',
      header: 'Services',
      cell: (item) => (
        <Badge color="blue">{item.serviceCount}</Badge>
      )
    },
    {
      id: 'updatedAt',
      header: 'Last Updated',
      cell: (item) => formatDateTime(item.updatedAt),
      sortingField: 'updatedAt'
    }
  ];

  return (
    <Table
      columnDefinitions={columnDefinitions}
      items={projects}
      loading={loading}
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) => setSelectedItems(detail.selectedItems)}
      header={
        <Header
          counter={`(${projects.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                disabled={selectedItems.length === 0}
                onClick={handleArchiveProjects}
              >
                Archive
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateProject}
              >
                Create Project
              </Button>
            </SpaceBetween>
          }
        >
          Projects
        </Header>
      }
      pagination={<Pagination />}
      filter={<TextFilter />}
    />
  );
};
```

**Form Components**:
```typescript
// Project creation form
import {
  Form,
  FormField,
  Input,
  Textarea,
  Select,
  RadioGroup,
  Button,
  SpaceBetween,
  Container,
  Header
} from '@cloudscape-design/components';

export const ProjectForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    framework: 'sam',
    runtime: 'python3.9',
    region: 'us-east-1'
  });

  const [errors, setErrors] = useState({});

  return (
    <Container
      header={
        <Header variant="h2">
          Create New Project
        </Header>
      }
    >
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              onClick={handleSubmit}
            >
              Create Project
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween direction="vertical" size="l">
          <FormField
            label="Project Name"
            errorText={errors.name}
            description="Enter a unique name for your project"
          >
            <Input
              value={formData.name}
              onChange={({ detail }) => 
                setFormData({ ...formData, name: detail.value })
              }
              placeholder="e.g., E-commerce Platform"
            />
          </FormField>

          <FormField
            label="Description"
            errorText={errors.description}
            description="Describe the purpose of your project"
          >
            <Textarea
              value={formData.description}
              onChange={({ detail }) => 
                setFormData({ ...formData, description: detail.value })
              }
              placeholder="Enter project description..."
              rows={3}
            />
          </FormField>

          <FormField
            label="Framework"
            errorText={errors.framework}
          >
            <RadioGroup
              value={formData.framework}
              onChange={({ detail }) => 
                setFormData({ ...formData, framework: detail.value })
              }
              items={[
                { value: 'sam', label: 'AWS SAM' },
                { value: 'cdk', label: 'AWS CDK' },
                { value: 'terraform', label: 'Terraform' }
              ]}
            />
          </FormField>

          <FormField
            label="Runtime"
            errorText={errors.runtime}
          >
            <Select
              selectedOption={{
                label: getRuntimeLabel(formData.runtime),
                value: formData.runtime
              }}
              onChange={({ detail }) => 
                setFormData({ ...formData, runtime: detail.selectedOption.value })
              }
              options={[
                { label: 'Python 3.9', value: 'python3.9' },
                { label: 'Python 3.10', value: 'python3.10' },
                { label: 'Node.js 18', value: 'nodejs18' },
                { label: 'Node.js 20', value: 'nodejs20' }
              ]}
            />
          </FormField>
        </SpaceBetween>
      </Form>
    </Container>
  );
};
```

**Navigation Structure**:
```typescript
// Navigation component
import { SideNavigation } from '@cloudscape-design/components';

const navigationItems = [
  {
    type: 'section',
    text: 'Projects',
    items: [
      {
        type: 'link',
        text: 'All Projects',
        href: '/projects'
      },
      {
        type: 'link',
        text: 'Create Project',
        href: '/projects/create'
      }
    ]
  },
  {
    type: 'section',
    text: 'Templates',
    items: [
      {
        type: 'link',
        text: 'Template Library',
        href: '/templates'
      },
      {
        type: 'link',
        text: 'Custom Templates',
        href: '/templates/custom'
      }
    ]
  },
  {
    type: 'section',
    text: 'Monitoring',
    items: [
      {
        type: 'link',
        text: 'System Overview',
        href: '/monitoring/overview'
      },
      {
        type: 'link',
        text: 'Logs',
        href: '/monitoring/logs'
      },
      {
        type: 'link',
        text: 'Metrics',
        href: '/monitoring/metrics'
      }
    ]
  }
];

export const Navigation: React.FC = () => {
  return (
    <SideNavigation
      activeHref={location.pathname}
      header={{
        href: '/',
        text: 'Skafu'
      }}
      items={navigationItems}
    />
  );
};
```

### Theme and Styling Integration

**Custom Theme Configuration**:
```typescript
// theme.ts
import { applyMode, Mode } from '@cloudscape-design/global-styles';

export const themes = {
  light: {
    mode: Mode.Light,
    customProperties: {
      '--custom-primary-color': '#0073bb',
      '--custom-secondary-color': '#ff9900'
    }
  },
  dark: {
    mode: Mode.Dark,
    customProperties: {
      '--custom-primary-color': '#0099ff',
      '--custom-secondary-color': '#ffad33'
    }
  }
};

export const applyTheme = (themeName: keyof typeof themes) => {
  const theme = themes[themeName];
  applyMode(theme.mode);
  
  // Apply custom properties
  Object.entries(theme.customProperties).forEach(([property, value]) => {
    document.documentElement.style.setProperty(property, value);
  });
};
```

**Responsive Design Patterns**:
```typescript
// Responsive layout component
import { 
  Grid, 
  Box, 
  Container,
  SpaceBetween 
} from '@cloudscape-design/components';

export const ResponsiveLayout: React.FC = ({ children }) => {
  return (
    <Container>
      <Grid
        gridDefinition={[
          { colspan: { default: 12, xs: 6 } },
          { colspan: { default: 12, xs: 6 } }
        ]}
      >
        <Box>
          <SpaceBetween direction="vertical" size="l">
            {children}
          </SpaceBetween>
        </Box>
      </Grid>
    </Container>
  );
};
```

### Accessibility Features

**Built-in Accessibility**:
- ARIA labels and roles automatically applied
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management

**Custom Accessibility Enhancements**:
```typescript
// Enhanced form with accessibility
import { 
  Live,
  Alert,
  FormField,
  Input 
} from '@cloudscape-design/components';

export const AccessibleForm: React.FC = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [errors, setErrors] = useState({});

  const handleValidation = (field: string, value: string) => {
    const error = validateField(field, value);
    if (error) {
      setErrors({ ...errors, [field]: error });
      setAnnouncements([...announcements, `Error in ${field}: ${error}`]);
    }
  };

  return (
    <>
      <Live politeness="polite">
        {announcements.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </Live>
      
      <FormField
        label="Project Name"
        errorText={errors.name}
        description="Enter a unique name for your project"
      >
        <Input
          value={formData.name}
          onChange={({ detail }) => handleInputChange('name', detail.value)}
          onBlur={() => handleValidation('name', formData.name)}
          ariaLabel="Project name input"
        />
      </FormField>
    </>
  );
};
```

### Performance Optimization

**Component Lazy Loading**:
```typescript
// Lazy load heavy components
import { lazy, Suspense } from 'react';
import { Spinner } from '@cloudscape-design/components';

const ProjectDashboard = lazy(() => import('./ProjectDashboard'));
const ServiceTopology = lazy(() => import('./ServiceTopology'));

export const ProjectDetail: React.FC = () => {
  return (
    <Suspense fallback={<Spinner />}>
      <ProjectDashboard />
      <ServiceTopology />
    </Suspense>
  );
};
```

**Bundle Optimization**:
```typescript
// webpack.config.js - Tree shaking configuration
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: false
  },
  resolve: {
    alias: {
      '@cloudscape-design/components': '@cloudscape-design/components/lib'
    }
  }
};
```

### Consequences

**Good**:
* **AWS Native**: Consistent with AWS console design patterns
* **Accessibility**: WCAG 2.1 AA compliance out of the box
* **Comprehensive**: Complete set of components for enterprise applications
* **Documentation**: Excellent documentation and examples
* **TypeScript**: Full TypeScript support with type definitions
* **Performance**: Optimized for production use
* **Responsive**: Mobile-first responsive design
* **Maintenance**: Regular updates and AWS support

**Bad**:
* **AWS Specific**: Limited to AWS-style design patterns
* **Customization**: Limited customization options for unique designs
* **Bundle Size**: Larger bundle size compared to minimal libraries
* **Learning Curve**: Team needs to learn Cloudscape-specific patterns
* **Vendor Lock**: Tied to AWS ecosystem and design decisions
* **Limited Themes**: Fewer theming options compared to other libraries

## Integration with Redux

**State Management Integration**:
```typescript
// Redux integration with Cloudscape components
import { useSelector, useDispatch } from 'react-redux';
import { Table, Header, Button } from '@cloudscape-design/components';

export const ProjectTable: React.FC = () => {
  const dispatch = useDispatch();
  const { projects, loading, error } = useSelector(state => state.projects);

  const handleRefresh = () => {
    dispatch(fetchProjects());
  };

  const handleCreateProject = () => {
    dispatch(showCreateProjectModal());
  };

  return (
    <Table
      columnDefinitions={columnDefinitions}
      items={projects}
      loading={loading}
      empty={
        <Box textAlign="center" color="inherit">
          <b>No projects</b>
          <Box padding={{ bottom: 's' }} variant="p" color="inherit">
            No projects found. Create your first project to get started.
          </Box>
          <Button onClick={handleCreateProject}>Create Project</Button>
        </Box>
      }
      header={
        <Header
          actions={
            <Button
              iconName="refresh"
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          }
        >
          Projects
        </Header>
      }
    />
  );
};
```

## Implementation Guidelines

1. **Component Selection**: Use Cloudscape components for all UI elements
2. **Custom Components**: Only create custom components when Cloudscape doesn't provide needed functionality
3. **Accessibility**: Leverage built-in accessibility features, enhance where needed
4. **Performance**: Use lazy loading and code splitting for large components
5. **Consistency**: Follow Cloudscape design patterns and conventions

## Design Patterns

**Page Layout Pattern**:
```typescript
export const ProjectDetailPage: React.FC = () => {
  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={<Button variant="primary">Edit Project</Button>}
        >
          Project Details
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        <ProjectOverview />
        <ServiceList />
        <DeploymentHistory />
      </SpaceBetween>
    </ContentLayout>
  );
};
```

**Error Handling Pattern**:
```typescript
export const ErrorBoundary: React.FC = ({ children }) => {
  return (
    <Alert
      type="error"
      header="Something went wrong"
      action={
        <Button onClick={handleRetry}>
          Retry
        </Button>
      }
    >
      An unexpected error occurred. Please try again.
    </Alert>
  );
};
```

## More Information

* [AWS Cloudscape Design System](https://cloudscape.design/)
* [Cloudscape Components](https://cloudscape.design/components/)
* [Accessibility Guidelines](https://cloudscape.design/foundation/accessibility/)
* [Details Page as Hub Pattern](https://cloudscape.design/patterns/resource-management/details/details-page-as-hub/)
* Related ADRs: ADR-0006 (Frontend Architecture with Next.js), ADR-0004 (Amplify Gen2), ADR-0008 (Hub Pattern), ADR-0009 (Next.js Integration)