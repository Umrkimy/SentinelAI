"use client";

import { type FormEvent, useState } from "react";
import { ArrowUpRight, FileText, Search, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { searchDocuments, type DocumentSearchResult } from "@/lib/api";

export function DocumentSearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocumentSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 3) {
      setError("Enter a question with at least 3 characters.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const response = await searchDocuments(query.trim());
      setResults(response.results);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Search could not be completed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="gap-3 border-b">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Search className="size-5" /></div>
            <div><CardTitle className="text-lg">Search maintenance knowledge</CardTitle><CardDescription className="mt-1 max-w-2xl">Ask a focused question across approved maintenance and safety references.</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
            <Input aria-label="Search maintenance references" className="h-11 bg-background text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="How should energy be controlled before maintenance?" />
            <Button className="h-11 px-5" disabled={searching} type="submit"><Search /> {searching ? "Searching…" : "Search"}</Button>
          </form>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-emerald-700" />Results are cited evidence for qualified engineers, not autonomous instructions.</div>
        </CardContent>
      </Card>
      {error && <Alert variant="destructive"><AlertTitle>Search unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {results.length > 0 && <section aria-live="polite" className="grid gap-3"><div className="flex items-center justify-between px-1"><p className="text-sm font-medium">Evidence matches</p><Badge variant="secondary">{results.length} results</Badge></div>{results.map((result) => <Card key={`${result.source_id}-${result.page_number}-${result.chunk_number}`} className="border-border/80 shadow-sm"><CardHeader className="gap-3 pb-0 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><FileText className="mt-0.5 size-5 text-muted-foreground" /><div><CardTitle>{result.title}</CardTitle><CardDescription className="mt-1">Page {result.page_number} · Source: {result.source_id}</CardDescription></div></div><Badge variant="outline">{Math.round(result.similarity_score * 100)}% match</Badge></CardHeader><CardContent className="pt-4"><Separator /><p className="py-4 text-sm leading-6 text-foreground/80">{result.text}</p>{result.source_url ? <a className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href={result.source_url} target="_blank" rel="noreferrer">Open official source <ArrowUpRight className="size-4" /></a> : <span className="text-sm text-muted-foreground">Private uploaded reference</span>}</CardContent></Card>)}</section>}
    </div>
  );
}
