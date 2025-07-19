# Page Specifications

## Overview

This document defines the page-level specifications for the Skafu platform using Next.js app directory routing, including user flows, page layouts, hub pattern implementation, and user experience patterns. Each page is designed to provide an intuitive and efficient user experience while maintaining consistency across the platform.

## Next.js App Directory Structure

### File-based Routing Configuration

```
app/
├── layout.tsx                    # Root layout with Amplify Authenticator
├── page.tsx                      # Dashboard homepage (/)
├── not-found.tsx                 # 404 page
├── loading.tsx                   # Global loading UI
├── error.tsx                     # Global error boundary
├── projects/
│   ├── page.tsx                 # Projects list (/projects)
│   ├── loading.tsx              # Projects loading UI
│   ├── create/
│   │   └── page.tsx            # Create project (/projects/create)
│   └── [projectId]/
│       ├── page.tsx            # Project detail hub (/projects/[id])
│       ├── loading.tsx         # Project loading UI
│       ├── edit/
│       │   └── page.tsx        # Edit project (/projects/[id]/edit)
│       └── deployments/
│           └── page.tsx        # Project deployments (/projects/[id]/deployments)
├── templates/
│   ├── page.tsx                # Templates list (/templates)
│   ├── my/
│   │   └── page.tsx           # My templates (/templates/my)
│   └── [templateId]/
│       └── page.tsx           # Template detail hub (/templates/[id])
├── observability/
│   ├── page.tsx               # Observability hub (/observability)
│   ├── metrics/
│   │   └── page.tsx          # Metrics dashboard (/observability/metrics)
│   ├── logs/
│   │   └── page.tsx          # Logs viewer (/observability/logs)
│   ├── traces/
│   │   └── page.tsx          # Distributed tracing (/observability/traces)
│   └── alerts/
│       └── page.tsx          # Alert management (/observability/alerts)
├── settings/
│   └── page.tsx              # Settings (/settings)
└── profile/
    └── page.tsx              # User profile (/profile)
```

### Root Layout with Authentication

```typescript
// app/layout.tsx
'use client';

import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import '@cloudscape-design/global-styles/index.css';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import { Provider } from 'react-redux';
import { store } from './lib/store';
import { AmplifyClientProvider } from './lib/amplify/client';
import amplifyConfig from './lib/amplify/auth';
import './globals.css';

Amplify.configure(amplifyConfig);
applyMode(Mode.Light);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Authenticator.Provider>
          <Authenticator 
            hideSignUp={false}
            components={{
              Header: () => (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <h1>Skafu</h1>
                  <p>Software Development Platform</p>
                </div>
              ),
            }}
          >
            <Provider store={store}>
              <AmplifyClientProvider>
                <main>{children}</main>
              </AmplifyClientProvider>
            </Provider>
          </Authenticator>
        </Authenticator.Provider>
      </body>
    </html>
  );
}
```

## Authentication with @aws-amplify/ui-react

### Automatic Authentication Flow

Authentication is now handled entirely by the Amplify Authenticator component in the root layout. No custom authentication pages are needed.

```typescript
// Authentication is handled automatically by Authenticator component
// Custom theming can be applied if needed:

const theme = {
  name: 'skafu-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: '#003d82',
          80: '#0073bb',
          90: '#99d8ff',
          100: '#ffffff',
        },
      },
    },
    fonts: {
      default: {
        variable: { value: 'Inter, sans-serif' },
        static: { value: 'Inter, sans-serif' },
      },
    },
  },
};

// app/layout.tsx with custom theming
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Authenticator.Provider>
          <ThemeProvider theme={theme}>
            <Authenticator 
              hideSignUp={false}
              socialProviders={['google', 'github']}
              components={{
                Header: () => (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h1>Skafu</h1>
                    <p>Software Development Platform</p>
                  </div>
                ),
                Footer: () => (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <p>© 2025 Skafu. All rights reserved.</p>
                  </div>
                ),
              }}
            >
              <Provider store={store}>
                <AmplifyClientProvider>
                  <main>{children}</main>
                </AmplifyClientProvider>
              </Provider>
            </Authenticator>
          </ThemeProvider>
        </Authenticator.Provider>
      </body>
    </html>
  );
}
```

### Benefits of @aws-amplify/ui-react

- **Zero Configuration**: Automatic form validation, error handling, and state management
- **Built-in Features**: Sign-up, sign-in, forgot password, account verification
- **Social Providers**: Google, GitHub, and other OAuth providers out of the box
- **Responsive Design**: Mobile-first responsive components
- **Accessibility**: WCAG 2.1 AA compliant by default
- **Theming**: Customizable design tokens and component styling
- **Security**: Automatic CSRF protection and secure token handling

## Main Application Pages

### Dashboard Page

```typescript
// app/page.tsx
import React from 'react';
import { 
  SpaceBetween,
  Header,
  Button,
  Grid,
  Box,
  ColumnLayout,
  Container
} from '@cloudscape-design/components';
import { Card } from '../../components/ui/Card';
import { DataTable } from '../../components/data-display/DataTable';
import { MetricsWidget } from '../../components/data-display/MetricsWidget';
import { QuickActions } from '../../components/domain/dashboard/QuickActions';
import { RecentActivity } from '../../components/domain/dashboard/RecentActivity';
import { ProjectSummary } from '../../components/domain/dashboard/ProjectSummary';
import { useProjects } from '../../hooks/useProjects';
import { useMetrics } from '../../hooks/useMetrics';
import { useActivities } from '../../hooks/useActivities';

export const Dashboard: React.FC = () => {
  const { projects, loading: projectsLoading } = useProjects({ limit: 5 });
  const { metrics, loading: metricsLoading } = useMetrics();
  const { activities, loading: activitiesLoading } = useActivities({ limit: 10 });
  
  const quickStats = [
    {
      title: 'Active Projects',
      value: metrics?.activeProjects || 0,
      change: '+12%',
      trend: 'up' as const,
      color: 'blue',
    },
    {
      title: 'Templates Used',
      value: metrics?.templatesUsed || 0,
      change: '+8%',
      trend: 'up' as const,
      color: 'green',
    },
    {
      title: 'AI Analyses',
      value: metrics?.aiAnalyses || 0,
      change: '+24%',
      trend: 'up' as const,
      color: 'purple',
    },
    {
      title: 'Deploy Success',
      value: `${metrics?.deploySuccessRate || 0}%`,
      change: '+2%',
      trend: 'up' as const,
      color: 'orange',
    },
  ];
  
  return (
    <SpaceBetween direction="vertical" size="l">
      <Header
        variant="h1"
        description="Welcome back! Here's what's happening with your projects."
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button>View All Projects</Button>
            <Button variant="primary">Create Project</Button>
          </SpaceBetween>
        }
      >
        Dashboard
      </Header>
      
      {/* Quick Stats */}
      <ColumnLayout columns={4} borders="vertical">
        {quickStats.map((stat, index) => (
          <MetricsWidget
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            color={stat.color}
            loading={metricsLoading}
          />
        ))}
      </ColumnLayout>
      
      {/* Main Content Grid */}
      <Grid
        gridDefinition={[
          { colspan: { default: 12, xs: 12, s: 8 } },
          { colspan: { default: 12, xs: 12, s: 4 } },
        ]}
      >
        <SpaceBetween direction="vertical" size="l">
          {/* Recent Projects */}
          <Container
            header={
              <Header
                variant="h2"
                counter={`(${projects?.length || 0})`}
                actions={
                  <Button>View All</Button>
                }
              >
                Recent Projects
              </Header>
            }
          >
            <ProjectSummary
              projects={projects || []}
              loading={projectsLoading}
            />
          </Container>
          
          {/* Project Performance Chart */}
          <Container
            header={
              <Header
                variant="h2"
                description="Track your project performance over time"
              >
                Project Performance
              </Header>
            }
          >
            <MetricsWidget
              title="Performance Metrics"
              chartData={metrics?.performanceData}
              loading={metricsLoading}
            />
          </Container>
        </SpaceBetween>
        
        <SpaceBetween direction="vertical" size="l">
          {/* Quick Actions */}
          <Container
            header={
              <Header variant="h2">
                Quick Actions
              </Header>
            }
          >
            <QuickActions />
          </Container>
          
          {/* Recent Activity */}
          <Container
            header={
              <Header
                variant="h2"
                counter={`(${activities?.length || 0})`}
              >
                Recent Activity
              </Header>
            }
          >
            <RecentActivity
              activities={activities || []}
              loading={activitiesLoading}
            />
          </Container>
        </SpaceBetween>
      </Grid>
    </SpaceBetween>
  );
};
```

### Projects Page

```typescript
// app/projects/page.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SpaceBetween,
  Header,
  Button,
  Grid,
  Cards,
  CollectionPreferences,
  Pagination,
  TextFilter,
  Select,
  Toggle
} from '@cloudscape-design/components';
import { ProjectCard } from '../../components/domain/project/ProjectCard';
import { ProjectFilters } from '../../components/domain/project/ProjectFilters';
import { CreateProjectModal } from '../../components/domain/project/CreateProjectModal';
import { useProjects } from '../../hooks/useProjects';
import { useDebounce } from '../../hooks/useDebounce';
import { Project } from '../../types/project';

interface ProjectsProps {
  filter?: 'all' | 'my' | 'shared' | 'archived';
}

export const Projects: React.FC<ProjectsProps> = ({ filter = 'all' }) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<string>('updated');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  
  const debouncedSearchText = useDebounce(searchText, 300);
  
  const {
    projects,
    loading,
    error,
    pagination,
    refetch
  } = useProjects({
    search: debouncedSearchText,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    template: selectedTemplate !== 'all' ? selectedTemplate : undefined,
    sortBy,
    sortOrder,
    page: currentPage,
    limit: pageSize,
    filter,
  });
  
  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };
  
  const handleCreateProject = () => {
    setShowCreateModal(true);
  };
  
  const handleProjectCreated = (project: Project) => {
    setShowCreateModal(false);
    refetch();
    navigate(`/projects/${project.id}`);
  };
  
  const statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
    { label: 'Archived', value: 'archived' },
  ];
  
  const templateOptions = [
    { label: 'All Templates', value: 'all' },
    { label: 'React App', value: 'react' },
    { label: 'Node.js API', value: 'nodejs' },
    { label: 'Python Flask', value: 'flask' },
    { label: 'Next.js', value: 'nextjs' },
  ];
  
  const sortOptions = [
    { label: 'Last Updated', value: 'updated' },
    { label: 'Created Date', value: 'created' },
    { label: 'Name', value: 'name' },
    { label: 'Status', value: 'status' },
  ];
  
  const getPageTitle = () => {
    switch (filter) {
      case 'my': return 'My Projects';
      case 'shared': return 'Shared Projects';
      case 'archived': return 'Archived Projects';
      default: return 'Projects';
    }
  };
  
  return (
    <>
      <SpaceBetween direction="vertical" size="l">
        <Header
          variant="h1"
          description={`Manage and organize your ${filter === 'all' ? '' : filter + ' '}projects`}
          counter={`(${pagination?.total || 0})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button>Import Project</Button>
              <Button variant="primary" onClick={handleCreateProject}>
                Create Project
              </Button>
            </SpaceBetween>
          }
        >
          {getPageTitle()}
        </Header>
        
        {/* Filters and Search */}
        <Grid
          gridDefinition={[
            { colspan: { default: 12, xs: 12, s: 6 } },
            { colspan: { default: 12, xs: 12, s: 6 } },
          ]}
        >
          <SpaceBetween direction="vertical" size="s">
            <TextFilter
              filteringText={searchText}
              onChange={({ detail }) => setSearchText(detail.filteringText)}
              placeholder="Search projects..."
              countText={`${pagination?.total || 0} matches`}
            />
          </SpaceBetween>
          
          <SpaceBetween direction="horizontal" size="s">
            <Select
              selectedOption={statusOptions.find(opt => opt.value === selectedStatus)}
              onChange={({ detail }) => setSelectedStatus(detail.selectedOption.value || 'all')}
              options={statusOptions}
              placeholder="Filter by status"
            />
            
            <Select
              selectedOption={templateOptions.find(opt => opt.value === selectedTemplate)}
              onChange={({ detail }) => setSelectedTemplate(detail.selectedOption.value || 'all')}
              options={templateOptions}
              placeholder="Filter by template"
            />
            
            <Select
              selectedOption={sortOptions.find(opt => opt.value === sortBy)}
              onChange={({ detail }) => setSortBy(detail.selectedOption.value || 'updated')}
              options={sortOptions}
              placeholder="Sort by"
            />
            
            <Toggle
              checked={viewMode === 'grid'}
              onChange={({ detail }) => setViewMode(detail.checked ? 'grid' : 'list')}
            >
              Grid View
            </Toggle>
          </SpaceBetween>
        </Grid>
        
        {/* Projects Grid/List */}
        {viewMode === 'grid' ? (
          <Cards
            items={projects || []}
            loading={loading}
            loadingText="Loading projects..."
            empty="No projects found. Create your first project to get started."
            header={
              <Header
                counter={`(${projects?.length || 0})`}
                actions={
                  <CollectionPreferences
                    title="Preferences"
                    confirmLabel="Confirm"
                    cancelLabel="Cancel"
                    preferences={{
                      pageSize,
                      wrapLines: true,
                    }}
                    onConfirm={({ detail }) => {
                      setPageSize(detail.pageSize || 20);
                    }}
                    pageSizePreference={{
                      title: 'Page size',
                      options: [
                        { value: 10, label: '10 projects' },
                        { value: 20, label: '20 projects' },
                        { value: 50, label: '50 projects' },
                      ],
                    }}
                  />
                }
              >
                Projects
              </Header>
            }
            cardDefinition={{
              header: (project: Project) => (
                <Link onFollow={() => handleProjectClick(project)}>
                  {project.name}
                </Link>
              ),
              sections: [
                {
                  id: 'description',
                  content: (project: Project) => project.description || 'No description',
                },
                {
                  id: 'details',
                  content: (project: Project) => (
                    <SpaceBetween direction="vertical" size="xs">
                      <div>
                        <strong>Status:</strong> {project.status}
                      </div>
                      <div>
                        <strong>Template:</strong> {project.template}
                      </div>
                      <div>
                        <strong>Last Updated:</strong> {project.updatedAt}
                      </div>
                    </SpaceBetween>
                  ),
                },
              ],
            }}
            trackBy="id"
            visibleSections={['description', 'details']}
          />
        ) : (
          <ProjectList
            projects={projects || []}
            loading={loading}
            onProjectClick={handleProjectClick}
          />
        )}
        
        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={pagination.pages}
            onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)}
          />
        )}
      </SpaceBetween>
      
      {/* Create Project Modal */}
      <CreateProjectModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
};
```

### Project Detail Hub Page

```typescript
// app/projects/[projectId]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { 
  SpaceBetween,
  Header,
  Button,
  Grid,
  Container,
  StatusIndicator,
  Badge,
  Alert,
  Box,
  ColumnLayout,
  Link,
  BreadcrumbGroup
} from '@cloudscape-design/components';
import { useGetProjectQuery } from '../../lib/store/amplifyApi';
import { ProjectHeroSection } from '../components/ProjectHeroSection';
import { RelatedTemplatesCard } from '../components/RelatedTemplatesCard';
import { TeamMembersCard } from '../components/TeamMembersCard';
import { RecentDeploymentsCard } from '../components/RecentDeploymentsCard';
import { ContextualNavigation } from '../components/ContextualNavigation';

export default function ProjectDetailHub() {
  const { projectId } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const { 
    data: project, 
    isLoading, 
    error 
  } = useGetProjectQuery(projectId);
  
  // Setup real-time subscriptions for this project
  useEffect(() => {
    dispatch({ 
      type: 'subscriptions/setup', 
      payload: { model: 'Project', operation: 'onUpdate' } 
    });
    dispatch({ 
      type: 'subscriptions/setup', 
      payload: { model: 'ProjectMember', operation: 'onCreate' } 
    });
    dispatch({ 
      type: 'subscriptions/setup', 
      payload: { model: 'Deployment', operation: 'onCreate' } 
    });

    return () => {
      dispatch({ type: 'subscriptions/cleanupAll' });
    };
  }, [dispatch, projectId]);
  
  if (isLoading) {
    return <div>Loading project...</div>;
  }
  
  if (error) {
    return (
      <Alert type="error" header="Error loading project">
        {error.message}
      </Alert>
    );
  }
  
  if (!project) {
    return (
      <Alert type="warning" header="Project not found">
        The project you're looking for doesn't exist or you don't have access to it.
      </Alert>
    );
  }
  
  const handleDeploy = () => {
    // Trigger deployment via observability API
    router.push(`/projects/${projectId}/deployments`);
  };
  
  const handleClone = () => {
    router.push(`/projects/create?template=${project.templateId}&clone=${projectId}`);
  };
  
  const handleShare = () => {
    // Open share modal
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'pending';
      case 'archived': return 'stopped';
      case 'error': return 'error';
      default: return 'info';
    }
  };
  
  return (
    <SpaceBetween direction="vertical" size="l">
      {/* Breadcrumb Navigation */}
      <BreadcrumbGroup
        items={[
          { text: 'Projects', href: '/projects' },
          { text: project.template?.name || 'Template', href: `/templates/${project.templateId}` },
          { text: project.name, href: `/projects/${projectId}` }
        ]}
      />
      
      {/* Hero Section - Central Resource Overview */}
      <Container
        header={
          <Header
            variant="h1"
            description={project.description}
            actions={
              <StatusIndicator type={getStatusColor(project.status)}>
                {project.status.toUpperCase()}
              </StatusIndicator>
            }
          >
            {project.name}
          </Header>
        }
      >
        <ColumnLayout columns={4} borders="vertical">
          <div>
            <Box variant="awsui-key-label">Template Used</Box>
            <Link href={`/templates/${project.templateId}`}>
              {project.template?.name || 'Unknown Template'}
            </Link>
          </div>
          <div>
            <Box variant="awsui-key-label">Team Members</Box>
            <Link href={`/projects/${projectId}/team`}>
              {project.members?.length || 0} members
            </Link>
          </div>
          <div>
            <Box variant="awsui-key-label">Last Deployed</Box>
            <Link href={`/projects/${projectId}/deployments`}>
              {project.lastDeployedAt || 'Never'}
            </Link>
          </div>
          <div>
            <Box variant="awsui-key-label">Created</Box>
            <div>{new Date(project.createdAt).toLocaleDateString()}</div>
          </div>
        </ColumnLayout>
      </Container>
      
      {/* Quick Actions Bar */}
      <Container>
        <SpaceBetween direction="horizontal" size="s">
          <Button 
            variant="primary" 
            iconName="upload"
            onClick={handleDeploy}
            disabled={project.status !== 'active'}
          >
            Deploy
          </Button>
          <Button 
            iconName="copy"
            onClick={handleClone}
          >
            Clone Project
          </Button>
          <Button 
            iconName="share"
            onClick={handleShare}
          >
            Share
          </Button>
          <Button 
            iconName="edit"
            onClick={() => router.push(`/projects/${projectId}/edit`)}
          >
            Edit Settings
          </Button>
        </SpaceBetween>
      </Container>
      
      {/* Related Resources Grid - Hub Pattern */}
      <Grid gridDefinition={[
        { colspan: { default: 12, s: 6, m: 4 } },
        { colspan: { default: 12, s: 6, m: 4 } },
        { colspan: { default: 12, s: 12, m: 4 } }
      ]}>
        <RelatedTemplatesCard projectId={projectId} />
        <TeamMembersCard projectId={projectId} />
        <RecentDeploymentsCard projectId={projectId} />
      </Grid>
      
      {/* Contextual Navigation */}
      <ContextualNavigation project={project} />
    </SpaceBetween>
  );
}
```

### Hub Pattern Components

```typescript
// app/projects/components/RelatedTemplatesCard.tsx
'use client';

import { Container, Header, Button, SpaceBetween, Box, Link } from '@cloudscape-design/components';
import { useGetRelatedTemplatesQuery } from '../../lib/store/amplifyApi';
import { useRouter } from 'next/navigation';

interface RelatedTemplatesCardProps {
  projectId: string;
}

export const RelatedTemplatesCard: React.FC<RelatedTemplatesCardProps> = ({ projectId }) => {
  const router = useRouter();
  const { data: relatedTemplates, isLoading } = useGetRelatedTemplatesQuery(projectId);
  
  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <Button 
              variant="link"
              onClick={() => router.push('/templates')}
            >
              View All Templates
            </Button>
          }
        >
          Related Templates
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="s">
        {isLoading ? (
          <Box>Loading templates...</Box>
        ) : (
          relatedTemplates?.map(template => (
            <Box key={template.id}>
              <Link 
                href={`/templates/${template.id}`}
                fontSize="body-s"
              >
                {template.name}
              </Link>
              <Box fontSize="body-xs" color="text-status-inactive">
                Used by {template.projectCount} projects
              </Box>
            </Box>
          ))
        )}
      </SpaceBetween>
    </Container>
  );
};

// app/projects/components/TeamMembersCard.tsx
'use client';

import { Container, Header, Button, SpaceBetween, Box, Link } from '@cloudscape-design/components';
import { useGetProjectMembersQuery } from '../../lib/store/amplifyApi';

interface TeamMembersCardProps {
  projectId: string;
}

export const TeamMembersCard: React.FC<TeamMembersCardProps> = ({ projectId }) => {
  const { data: teamMembers, isLoading } = useGetProjectMembersQuery(projectId);
  
  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <Button 
              iconName="add-plus"
              onClick={() => setShowInviteModal(true)}
            >
              Invite Member
            </Button>
          }
        >
          Team Members ({teamMembers?.length || 0})
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="s">
        {isLoading ? (
          <Box>Loading team members...</Box>
        ) : (
          teamMembers?.map(member => (
            <Box key={member.id}>
              <Link 
                href={`/profile/${member.userId}`}
                fontSize="body-s"
              >
                {member.user.name}
              </Link>
              <Box fontSize="body-xs" color="text-status-inactive">
                {member.role} • Last active {member.user.lastActiveAt}
              </Box>
            </Box>
          ))
        )}
      </SpaceBetween>
    </Container>
  );
};

// app/projects/components/ContextualNavigation.tsx
'use client';

import { Container, SpaceBetween, Button } from '@cloudscape-design/components';
import { useRouter } from 'next/navigation';

interface ContextualNavigationProps {
  project: any;
}

export const ContextualNavigation: React.FC<ContextualNavigationProps> = ({ project }) => {
  const router = useRouter();
  
  return (
    <Container>
      <SpaceBetween direction="horizontal" size="m">
        <Button 
          variant="link"
          iconName="arrow-left"
          onClick={() => router.push(`/templates/${project.templateId}`)}
        >
          View Template: {project.template?.name}
        </Button>
        <Button 
          variant="link"
          iconName="external"
          onClick={() => router.push(`/projects?template=${project.templateId}`)}
        >
          Other projects using this template
        </Button>
        <Button 
          variant="link"
          iconName="user-profile"
          onClick={() => router.push(`/profile/${project.ownerId}`)}
        >
          View project owner
        </Button>
      </SpaceBetween>
    </Container>
  );
};
```

This comprehensive Next.js page specification provides the foundation for all major pages in the Skafu platform. Each page is designed with:

1. **Hub Pattern Navigation**: Central resource hubs with contextual navigation to related resources
2. **Amplify Authentication**: Zero-configuration authentication with @aws-amplify/ui-react
3. **File-based Routing**: Intuitive Next.js app directory structure
4. **Real-time Updates**: Automatic subscription management for live data
5. **Responsive Design**: Mobile-first approach with Cloudscape responsive grids
6. **Accessibility**: WCAG 2.1 AA compliance through Cloudscape and Amplify components
7. **Error Handling**: Automatic error boundaries and loading states
8. **Performance**: Automatic code splitting and optimized data fetching
9. **Type Safety**: End-to-end TypeScript with Amplify-generated types
10. **SEO Ready**: Next.js optimizations for search engine visibility

The pages work together to create a cohesive user experience with seamless navigation between related resources, automatic authentication, and real-time collaborative features.