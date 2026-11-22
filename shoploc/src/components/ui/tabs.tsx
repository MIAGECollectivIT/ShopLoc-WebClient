import * as React from 'react';
import { Tabs as BaseTabs } from '@base-ui/react';
import { cn } from 'cn';

function Tabs({ className, ...props }: React.ComponentProps<typeof BaseTabs.Root>) {
  return (
    <BaseTabs.Root data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props} />
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-11 items-center justify-start rounded-xl bg-muted p-1 text-muted-foreground w-full sm:w-auto overflow-x-auto',
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground hover:text-foreground cursor-pointer',
        'data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm data-[active]:font-semibold',
        'data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm data-[selected]:font-semibold',
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold',
        'aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm aria-selected:font-semibold',
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
