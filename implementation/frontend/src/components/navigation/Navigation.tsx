'use client';

import { SideNavigation } from '@cloudscape-design/components';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveSection, selectActiveSection } from '@/store/slices/uiSlice';
import { useRouter } from 'next/navigation';

export function Navigation() {
  const dispatch = useAppDispatch();
  const activeSection = useAppSelector(selectActiveSection);
  const router = useRouter();

  const navigationItems = [
    {
      type: 'link' as const,
      text: 'Dashboard',
      href: '/dashboard',
    },
    {
      type: 'section' as const,
      text: 'Observability',
      items: [
        {
          type: 'link' as const,
          text: 'Overview',
          href: '/dashboard/observability',
        },
        {
          type: 'link' as const,
          text: 'Metrics',
          href: '/dashboard/observability/metrics',
        },
        {
          type: 'link' as const,
          text: 'Logs',
          href: '/dashboard/observability/logs',
        },
        {
          type: 'link' as const,
          text: 'Traces',
          href: '/dashboard/observability/traces',
        },
        {
          type: 'link' as const,
          text: 'Alerts',
          href: '/dashboard/observability/alerts',
        },
        {
          type: 'link' as const,
          text: 'Costs',
          href: '/dashboard/observability/costs',
        },
      ],
    },
    {
      type: 'section' as const,
      text: 'Project Management',
      items: [
        {
          type: 'link' as const,
          text: 'Projects',
          href: '/dashboard/projects',
        },
        {
          type: 'link' as const,
          text: 'Templates',
          href: '/dashboard/templates',
        },
      ],
    },
    {
      type: 'section' as const,
      text: 'AI Assistant',
      items: [
        {
          type: 'link' as const,
          text: 'Code Analysis',
          href: '/dashboard/ai/analysis',
        },
        {
          type: 'link' as const,
          text: 'Recommendations',
          href: '/dashboard/ai/recommendations',
        },
      ],
    },
    {
      type: 'section' as const,
      text: 'GitHub Integration',
      items: [
        {
          type: 'link' as const,
          text: 'Repositories',
          href: '/dashboard/github/repositories',
        },
        {
          type: 'link' as const,
          text: 'Workflows',
          href: '/dashboard/github/workflows',
        },
      ],
    },
    {
      type: 'divider' as const,
    },
    {
      type: 'link' as const,
      text: 'Settings',
      href: '/dashboard/settings',
    },
  ];

  const handleFollow = (event: CustomEvent) => {
    const href = event.detail.href;
    if (href) {
      router.push(href);
      
      // Update active section based on route
      if (href.includes('/observability/metrics')) {
        dispatch(setActiveSection('metrics'));
      } else if (href.includes('/observability/logs')) {
        dispatch(setActiveSection('logs'));
      } else if (href.includes('/observability/traces')) {
        dispatch(setActiveSection('traces'));
      } else if (href.includes('/observability/alerts')) {
        dispatch(setActiveSection('alerts'));
      } else if (href.includes('/observability/costs')) {
        dispatch(setActiveSection('costs'));
      } else if (href.includes('/observability')) {
        dispatch(setActiveSection('dashboard'));
      } else if (href.includes('/projects')) {
        dispatch(setActiveSection('projects'));
      } else if (href.includes('/templates')) {
        dispatch(setActiveSection('templates'));
      } else if (href.includes('/settings')) {
        dispatch(setActiveSection('settings'));
      } else if (href.includes('/dashboard')) {
        dispatch(setActiveSection('dashboard'));
      }
    }
  };

  return (
    <SideNavigation
      header={{
        href: '/dashboard',
        text: 'Skafu Platform',
      }}
      items={navigationItems}
      activeHref={`/${activeSection}`}
      onFollow={handleFollow}
    />
  );
}