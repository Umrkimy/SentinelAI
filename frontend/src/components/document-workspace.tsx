"use client";

import { BookOpen, LockKeyhole } from "lucide-react";
import { DocumentAdminPanel } from "@/components/document-admin-panel";
import { DocumentSearchPanel } from "@/components/document-search-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DocumentWorkspace() {
  return (
    <section className="document-workspace">
      <div className="mx-auto mb-6 flex max-w-5xl flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Knowledge base</p>
        <h1 className="text-3xl font-semibold tracking-tight">Maintenance documents</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Search evidence from approved reference material or manage the private document library.</p>
      </div>
      <Tabs className="mx-auto max-w-5xl" defaultValue="search">
        <TabsList variant="line" className="mb-6 border-b">
          <TabsTrigger value="search"><BookOpen /> Search references</TabsTrigger>
          <TabsTrigger value="admin"><LockKeyhole /> Administration</TabsTrigger>
        </TabsList>
        <TabsContent value="search"><DocumentSearchPanel /></TabsContent>
        <TabsContent value="admin"><DocumentAdminPanel /></TabsContent>
      </Tabs>
    </section>
  );
}
