"use client";
import * as React from "react";
import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;

export function TabsList({ className, ...p }: React.ComponentProps<typeof T.List>) {
  return <T.List className={cn("mb-5 flex gap-1 overflow-x-auto border-b border-line", className)} {...p} />;
}

export function TabsTrigger({ className, ...p }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "press min-h-11 shrink-0 cursor-pointer px-4 text-ink-2 border-b-2 border-transparent -mb-px data-[state=active]:border-accent data-[state=active]:text-ink data-[state=active]:font-medium hover:text-ink",
        className
      )}
      {...p}
    />
  );
}

export const TabsContent = T.Content;
