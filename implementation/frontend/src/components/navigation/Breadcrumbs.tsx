'use client';

import { BreadcrumbGroup } from '@cloudscape-design/components';
import { useAppSelector } from '@/store/hooks';
import { selectBreadcrumbs } from '@/store/slices/uiSlice';
import { useRouter } from 'next/navigation';

export function Breadcrumbs() {
  const breadcrumbs = useAppSelector(selectBreadcrumbs);
  const router = useRouter();

  const handleFollow = (event: CustomEvent) => {
    const href = event.detail.href;
    if (href) {
      router.push(href);
    }
  };

  return (
    <BreadcrumbGroup
      items={breadcrumbs}
      onFollow={handleFollow}
      ariaLabel="Breadcrumbs"
    />
  );
}