'use client';

import { TopNavigation } from '@cloudscape-design/components';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar, setTheme, selectTheme } from '@/store/slices/uiSlice';
import { useAuthenticator } from '@aws-amplify/ui-react';

export function Header() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const { signOut, user } = useAuthenticator();

  const utilities = [
    {
      type: 'button' as const,
      text: theme === 'dark' ? 'Light mode' : 'Dark mode',
      iconName: theme === 'dark' ? 'sun' : 'moon',
      onClick: () => {
        dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'));
      },
    },
    {
      type: 'menu-dropdown' as const,
      text: user?.signInDetails?.loginId || 'User',
      iconName: 'user-profile',
      items: [
        {
          id: 'profile',
          text: 'Profile',
          href: '/dashboard/settings/profile',
        },
        {
          id: 'preferences',
          text: 'Preferences',
          href: '/dashboard/settings/preferences',
        },
        {
          id: 'signout',
          text: 'Sign out',
        },
      ],
      onItemClick: ({ detail }) => {
        if (detail.id === 'signout') {
          signOut();
        }
      },
    },
  ];

  return (
    <TopNavigation
      identity={{
        href: '/dashboard',
        title: 'Skafu',
        logo: {
          src: '/logo.svg',
          alt: 'Skafu',
        },
      }}
      utilities={utilities}
      i18nStrings={{
        searchIconAriaLabel: 'Search',
        searchDismissIconAriaLabel: 'Close search',
        overflowMenuTriggerText: 'More',
        overflowMenuTitleText: 'All',
        overflowMenuBackIconAriaLabel: 'Back',
        overflowMenuDismissIconAriaLabel: 'Close menu',
      }}
    />
  );
}