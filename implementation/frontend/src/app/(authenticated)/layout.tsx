'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import { AppLayout } from '@cloudscape-design/components';
import { Navigation } from '@/components/navigation/Navigation';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Header } from '@/components/layout/Header';
import { useAppSelector } from '@/store/hooks';
import { selectSidebarCollapsed } from '@/store/slices/uiSlice';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);

  return (
    <Authenticator>
      <AppLayout
        navigation={<Navigation />}
        breadcrumbs={<Breadcrumbs />}
        content={children}
        contentType="default"
        disableContentPaddings={false}
        navigationWidth={sidebarCollapsed ? 40 : 280}
        navigationHide={false}
        toolsHide={true}
        notifications={null}
        splitPanelOpen={false}
        splitPanel={null}
      />
    </Authenticator>
  );
}