# ADR-0008: Cloudscape Details Page as Hub Pattern

**Status**: 🟢 Accepted  
**Date**: 2025-01-19  
**Deciders**: Development Team

## Context and Problem Statement

We need to design detail pages that serve as central hubs for accessing related resources and performing contextual actions, rather than simple information displays. Traditional detail pages show information in isolation, but our users need to navigate efficiently between related resources and complete tasks without losing context.

## Decision Drivers

* Need for efficient navigation between related resources (projects, templates, team members)
* User workflow optimization to complete tasks without context switching
* AWS-native design patterns that align with Cloudscape Design System
* Improved user experience for complex resource management
* Clear information hierarchy and actionable interface design
* Integration with existing Cloudscape components and patterns

## Considered Options

* **Option 1**: Traditional tabbed detail pages with isolated information
* **Option 2**: Simple card-based layout with basic navigation
* **Option 3**: Cloudscape Details Page as Hub Pattern
* **Option 4**: Custom navigation pattern outside Cloudscape guidelines

## Decision Outcome

Chosen option: **"Cloudscape Details Page as Hub Pattern"**, because it provides optimal user experience for resource management, follows AWS design patterns, enables efficient task completion, and creates intuitive relationships between system components.

### Implementation Details

**Hub Pattern Architecture**:

```typescript
// Project Detail Hub Structure
export const ProjectDetailHub: React.FC = () => {
  const { projectId } = useParams();
  const { data: project } = useGetProjectQuery(projectId);
  
  return (
    <SpaceBetween direction="vertical" size="l">
      {/* Hero Section - Central Resource Overview */}
      <ProjectHeroSection project={project} />
      
      {/* Quick Actions Bar */}
      <ProjectQuickActions project={project} />
      
      {/* Related Resources Grid */}
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
};
```

**Hero Section Pattern**:
```typescript
// Central resource overview with key information
const ProjectHeroSection: React.FC<{ project: Project }> = ({ project }) => {
  return (
    <Container
      header={
        <Header
          variant="h1"
          description={project.description}
          actions={<ProjectStatusBadge status={project.status} />}
        >
          {project.name}
        </Header>
      }
    >
      <ColumnLayout columns={4} borders="vertical">
        <KeyMetric 
          label="Template Used" 
          value={project.template.name}
          link={`/templates/${project.template.id}`}
        />
        <KeyMetric 
          label="Team Members" 
          value={project.members.length}
          link={`/projects/${project.id}/team`}
        />
        <KeyMetric 
          label="Last Deployed" 
          value={project.lastDeployedAt}
          link={`/projects/${project.id}/deployments`}
        />
        <KeyMetric 
          label="Status" 
          value={project.status}
          statusIndicator={true}
        />
      </ColumnLayout>
    </Container>
  );
};
```

**Quick Actions Pattern**:
```typescript
// Prominent contextual actions
const ProjectQuickActions: React.FC<{ project: Project }> = ({ project }) => {
  return (
    <Container>
      <SpaceBetween direction="horizontal" size="s">
        <Button 
          variant="primary" 
          iconName="upload"
          onClick={() => deployProject(project.id)}
        >
          Deploy
        </Button>
        <Button 
          iconName="copy"
          onClick={() => cloneProject(project.id)}
        >
          Clone Project
        </Button>
        <Button 
          iconName="share"
          onClick={() => shareProject(project.id)}
        >
          Share
        </Button>
        <Button 
          iconName="edit"
          onClick={() => navigate(`/projects/${project.id}/edit`)}
        >
          Edit Settings
        </Button>
      </SpaceBetween>
    </Container>
  );
};
```

**Related Resources Cards**:
```typescript
// Related Templates Card
const RelatedTemplatesCard: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: relatedTemplates } = useGetRelatedTemplatesQuery(projectId);
  
  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <Button 
              variant="link"
              onClick={() => navigate('/templates')}
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
        {relatedTemplates?.map(template => (
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
        ))}
      </SpaceBetween>
    </Container>
  );
};

// Team Members Card
const TeamMembersCard: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: teamMembers } = useGetProjectMembersQuery(projectId);
  
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
        {teamMembers?.map(member => (
          <Box key={member.id}>
            <Link 
              href={`/users/${member.id}`}
              fontSize="body-s"
            >
              {member.name}
            </Link>
            <Box fontSize="body-xs" color="text-status-inactive">
              {member.role} • Last active {member.lastActiveAt}
            </Box>
          </Box>
        ))}
      </SpaceBetween>
    </Container>
  );
};

// Recent Deployments Card
const RecentDeploymentsCard: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: deployments } = useGetRecentDeploymentsQuery(projectId);
  
  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <Button 
              variant="link"
              onClick={() => navigate(`/projects/${projectId}/deployments`)}
            >
              View All
            </Button>
          }
        >
          Recent Deployments
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="s">
        {deployments?.map(deployment => (
          <Box key={deployment.id}>
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <StatusIndicator type={getDeploymentStatus(deployment.status)}>
                {deployment.environment}
              </StatusIndicator>
              <Box fontSize="body-xs" color="text-status-inactive">
                {deployment.deployedAt}
              </Box>
            </SpaceBetween>
          </Box>
        ))}
      </SpaceBetween>
    </Container>
  );
};
```

**Contextual Navigation Pattern**:
```typescript
// Breadcrumb navigation with relationship context
const ContextualNavigation: React.FC<{ project: Project }> = ({ project }) => {
  return (
    <Container>
      <BreadcrumbGroup
        items={[
          { text: 'Projects', href: '/projects' },
          { text: project.template.name, href: `/templates/${project.template.id}` },
          { text: project.name, href: `/projects/${project.id}` }
        ]}
      />
      
      <SpaceBetween direction="horizontal" size="m">
        <Button 
          variant="link"
          iconName="arrow-left"
          onClick={() => navigate(`/templates/${project.template.id}`)}
        >
          View Template: {project.template.name}
        </Button>
        <Button 
          variant="link"
          iconName="external"
          onClick={() => navigate(`/projects?template=${project.template.id}`)}
        >
          Other projects using this template
        </Button>
      </SpaceBetween>
    </Container>
  );
};
```

### Hub Pattern Benefits

**User Experience Benefits**:
- **Reduced Context Switching**: Users can access related resources without navigating away
- **Task-Oriented Design**: Quick actions are prominently displayed for common workflows
- **Relationship Visibility**: Clear connections between projects, templates, and team members
- **Efficient Navigation**: Multiple pathways to related resources based on user intent

**Information Architecture Benefits**:
- **Resource Centricity**: Each detail page becomes a hub for its domain
- **Hierarchical Navigation**: Clear parent-child relationships through contextual breadcrumbs
- **Cross-Domain Links**: Seamless navigation between projects, templates, and users
- **Contextual Actions**: Actions are relevant to the current resource and user permissions

**Development Benefits**:
- **Component Reusability**: Related resource cards can be reused across different hubs
- **Consistent Patterns**: Standardized hub layout across all resource types
- **Maintainable Structure**: Clear separation between hero, actions, and related resources
- **Testing Strategy**: Isolated components for each hub section

### Integration with Cloudscape Components

**Primary Components Used**:
- `Container` with headers for each hub section
- `Grid` for responsive related resources layout
- `SpaceBetween` for consistent spacing
- `Button` with icons for quick actions
- `Link` for contextual navigation
- `StatusIndicator` for status visualization
- `BreadcrumbGroup` for hierarchical navigation

**Responsive Design**:
```typescript
// Mobile-first responsive grid
<Grid gridDefinition={[
  { colspan: { default: 12, xs: 12, s: 6, m: 4 } }, // Full width on mobile, 1/3 on desktop
  { colspan: { default: 12, xs: 12, s: 6, m: 4 } },
  { colspan: { default: 12, xs: 12, s: 12, m: 4 } }
]}>
```

**Accessibility Integration**:
- Semantic HTML structure with proper headings
- ARIA labels for quick action buttons
- Keyboard navigation support
- Screen reader friendly relationship descriptions
- Focus management for modal interactions

### Implementation Guidelines

**Hub Page Structure**:
1. **Hero Section**: Core resource information with key metrics
2. **Quick Actions**: Primary actions users perform on this resource
3. **Related Resources**: Cards showing connected resources with navigation links
4. **Contextual Navigation**: Breadcrumbs and cross-references

**Navigation Patterns**:
1. **Direct Links**: Click on related resource names to navigate to their hubs
2. **View All Links**: Access complete lists from summary cards
3. **Contextual Actions**: Perform actions without leaving the hub context
4. **Breadcrumb Navigation**: Understand and navigate resource hierarchies

**Data Loading Strategy**:
1. **Hero Section**: Load immediately with the main resource
2. **Related Resources**: Load in parallel with the main resource
3. **Quick Actions**: Enable based on user permissions and resource state
4. **Progressive Enhancement**: Load additional context as needed

### Consequences

**Good**:
* **Enhanced User Experience**: Efficient task completion without context switching
* **Clear Information Architecture**: Logical relationships between resources
* **AWS-Native Design**: Consistent with Cloudscape patterns and AWS console experience
* **Improved Discoverability**: Users find related resources through contextual navigation
* **Action-Oriented Interface**: Common tasks are prominently accessible
* **Responsive Design**: Works well across different screen sizes

**Bad**:
* **Increased Complexity**: More complex component structure than simple detail pages
* **Data Loading Overhead**: Multiple API calls to populate related resource sections
* **Maintenance Overhead**: More components to maintain and test
* **Navigation Complexity**: Users might get lost in the interconnected navigation
* **Performance Considerations**: Potential for slower initial page loads

## Related Resources

**Cloudscape Pattern References**:
- [Details Page as Hub Pattern](https://cloudscape.design/patterns/resource-management/details/details-page-as-hub/)
- [Container Component](https://cloudscape.design/components/container/)
- [Grid Component](https://cloudscape.design/components/grid/)
- [Breadcrumb Navigation](https://cloudscape.design/components/breadcrumb-group/)

## More Information

* [Cloudscape Design System](https://cloudscape.design/)
* [AWS Console Design Patterns](https://cloudscape.design/patterns/)
* Related ADRs: ADR-0006 (Frontend Architecture), ADR-0007 (Cloudscape Design System), ADR-0009 (Next.js Integration)