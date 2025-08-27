// components/navigation/AppSidebar.tsx (Clean Minimal)
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ImageIcon,
  UserIcon,
  Settings2Icon,
  LayoutTemplate,
  Sparkles,
  ShoppingCart,
  FolderOpen,
  CameraIcon,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar';

import useEventStore from '@/stores/useEventStore';

// Navigation items
const getNavItems = (selectedEventId: string | null) => {
  const baseRoute = selectedEventId ? `/events/${selectedEventId}` : '';

  return [
    {
      icon: <HomeIcon size={20} />,
      label: 'Home',
      href: `${baseRoute}`,
      requiresEvent: false,
    },
    {
      icon: <ImageIcon size={20} />,
      label: 'Media',
      href: `${baseRoute}/media`,
      requiresEvent: true,
    },
    {
      icon: <Settings2Icon size={20} />,
      label: 'Event Settings',
      href: `${baseRoute}/settings`,
      requiresEvent: true,
    },
    {
      icon: <Sparkles size={20} />,
      label: 'AI Highlights',
      href: `${baseRoute}/highlights`,
      requiresEvent: true,
    },
    {
      icon: <LayoutTemplate size={20} />,
      label: 'Templates',
      href: `/templates`,
      requiresEvent: true,
    },
    {
      icon: <ShoppingCart size={20} />,
      label: 'Memory Shop',
      href: `/shop`,
      requiresEvent: true,
    },
    {
      icon: <FolderOpen size={20} />,
      label: 'All Events',
      href: '/events',
      requiresEvent: false,
    },
  ];
};

export function AppSidebar() {
  const pathname = usePathname();
  const { selectedEvent } = useEventStore();

  // Get navigation items based on selected event
  const navItems = getNavItems(selectedEvent?._id || null);

  // Group items by category
  const mainItems = navItems.filter(item => !item.requiresEvent);
  const eventItems = navItems.filter(item => item.requiresEvent && selectedEvent);
  const disabledItems = navItems.filter(item => item.requiresEvent && !selectedEvent);

  return (
    <Sidebar className="w-64 border-r bg-sidebar h-full flex flex-col">
      {/* Logo Header */}
      <SidebarHeader className="bg-sidebar border-b border-border p-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2">
            <CameraIcon size={24} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rose Click</h2>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 bg-sidebar overflow-y-auto py-4">
        {/* Main Navigation */}
        <SidebarGroup className="px-3">
          <SidebarMenu className="space-y-1">
            {mainItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={`
                      transition-colors duration-200 w-full h-10
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent text-accent-foreground'
                      }
                    `}
                  >
                    <Link href={item.href} className="flex items-center gap-3 px-3 py-2 w-full h-full">
                      <div className={`transition-colors ${
                        isActive 
                          ? 'text-primary' 
                          : 'text-foreground'
                      }`}>
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Collections Section */}
        <SidebarGroup className="px-3 mt-6">
          <SidebarGroupLabel className="text-xs font-semibold text-card-foreground px-3 py-2 mb-2 uppercase tracking-wide">
            Collections
          </SidebarGroupLabel>
          <SidebarMenu className="space-y-1">
            {/* Event-specific Navigation */}
            {eventItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={`
                      transition-colors duration-200 w-full h-10
                      ${isActive 
                        ? 'bg-primary text-primary' 
                        : 'hover:bg-accent text-accent-foreground'
                      }
                    `}
                  >
                    <Link href={item.href} className="flex items-center gap-3 px-3 py-2 w-full h-full">
                      <div className={`transition-colors ${
                        isActive 
                          ? 'text-primary' 
                          : 'text-accent-foreground'
                      }`}>
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}

            {/* Disabled items when no event selected */}
            {disabledItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <div className="opacity-50 cursor-not-allowed h-10">
                  <div className="flex items-center gap-3 px-3 py-2 h-full">
                    <div className="text-gray-400 dark:text-gray-500">
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-400 dark:text-gray-500 flex-1">{item.label}</span>
                  </div>
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="flex-shrink-0 bg-sidebar p-3 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="hover:bg-accent transition-colors duration-200 w-full h-10"
            >
              <Link href="/profile" className="flex items-center gap-3 px-3 py-2 w-full h-full">
                <UserIcon size={20} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
