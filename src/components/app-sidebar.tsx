'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CameraIcon, HomeIcon, ImageIcon, UserIcon, LifeBuoyIcon, Settings2Icon } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const navItems = [
  { icon: <HomeIcon size={20} />, label: 'Home', href: '/' },
  { icon: <ImageIcon size={20} />, label: 'Events', href: '/events' },
  { icon: <CameraIcon size={20} />, label: 'Capture', href: '/capture' },
  { icon: <UserIcon size={20} />, label: 'Profile', href: '/profile' },
];

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = React.useState(false);
  
  // Track mobile screen size
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on initial render
    checkIsMobile();
    
    // Add event listener
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  
  // Hide sidebar on login pages
  if (pathname.startsWith('/login')) {
    return <>{children}</>;
  }
  
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <Sidebar collapsible="icon" variant="inset" className="hidden md:flex">
        <SidebarHeader>
          <div className="flex items-center px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1 rounded-md">
                <CameraIcon size={24} className="text-primary" />
              </div>
              {/* <h2 className="text-lg font-semibold">RC Photo</h2> */}
            </div>
            <div className="flex-1" />
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings">
                    <Settings2Icon size={20} />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>
      
      {/* Main content area with proper inset styling */}
      <SidebarInset className="bg-background">
        <main className="flex-1 sm:px-4 sm:py-4 md:px-6 md:py-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
