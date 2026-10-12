import * as React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Header } from '@/components/Header';

interface AppShellProps {
  currentPath?: string;
  children: React.ReactNode;
}

export function AppShell({ currentPath = '/', children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar currentPath={currentPath} />
      <SidebarInset className="min-h-full flex flex-col">
        <Header currentPath={currentPath} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
