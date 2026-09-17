"use client";

import { type FormEvent, useEffect, useState } from "react";
import { FileUp, LockKeyhole, LogOut, ShieldCheck, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getUploadedDocuments, loginAdmin, uploadDocument, type UploadedDocument } from "@/lib/api";

const TOKEN_KEY = "sentinelai-admin-token";

export function DocumentAdminPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const savedToken = window.sessionStorage.getItem(TOKEN_KEY); if (savedToken) setToken(savedToken); }, []);
  useEffect(() => { if (!token) return; getUploadedDocuments(token).then(setDocuments).catch((requestError: Error) => { window.sessionStorage.removeItem(TOKEN_KEY); setToken(null); setError(requestError.message); }); }, [token]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError(null);
    try { const response = await loginAdmin(String(form.get("username") ?? ""), String(form.get("password") ?? "")); window.sessionStorage.setItem(TOKEN_KEY, response.access_token); setToken(response.access_token); event.currentTarget.reset(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!token) return; const form = new FormData(event.currentTarget); const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) { setError("Choose a PDF to upload."); return; }
    setBusy(true); setError(null); setMessage(null);
    try { const uploaded = await uploadDocument(token, { file, sourceId: String(form.get("sourceId") ?? ""), title: String(form.get("title") ?? ""), publisher: String(form.get("publisher") ?? ""), purpose: String(form.get("purpose") ?? "") }); setDocuments((current) => [uploaded, ...current]); setMessage(`${uploaded.title} is ready for search.`); event.currentTarget.reset(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Upload failed."); }
    finally { setBusy(false); }
  }
  function signOut() { window.sessionStorage.removeItem(TOKEN_KEY); setToken(null); setDocuments([]); setError(null); setMessage(null); }

  if (!token) return <Card className="mx-auto max-w-md border-border/80 shadow-sm"><CardHeader className="items-center border-b text-center"><div className="flex size-11 items-center justify-center rounded-full bg-muted"><LockKeyhole className="size-5" /></div><CardTitle className="mt-2 text-xl">Administrator sign in</CardTitle><CardDescription>Sign in to add a private, approved maintenance reference.</CardDescription></CardHeader><CardContent className="pt-6"><form className="grid gap-4" onSubmit={handleLogin}><div className="grid gap-2"><Label htmlFor="admin-username">Username</Label><Input id="admin-username" name="username" autoComplete="username" required /></div><div className="grid gap-2"><Label htmlFor="admin-password">Password</Label><Input id="admin-password" name="password" type="password" autoComplete="current-password" required /></div><Button className="mt-2 h-10" disabled={busy} type="submit"><LockKeyhole /> {busy ? "Signing in…" : "Sign in"}</Button></form>{error && <Alert className="mt-4" variant="destructive"><AlertTitle>Sign-in failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}</CardContent></Card>;

  return <div className="mx-auto grid max-w-5xl gap-5"><div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800"><ShieldCheck className="size-5" /></div><div><p className="text-sm font-medium">Administrator session active</p><p className="text-xs text-muted-foreground">Uploads remain private and are validated before storage.</p></div></div><Button variant="outline" onClick={signOut}><LogOut /> Sign out</Button></div><div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><Card className="border-border/80 shadow-sm"><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Upload className="size-5" /> Add an approved PDF</CardTitle><CardDescription>PDF only. Maximum 10 MB and 300 pages. Duplicate content is rejected.</CardDescription></CardHeader><CardContent className="pt-6"><form className="grid gap-4" onSubmit={handleUpload}><div className="grid gap-2"><Label htmlFor="document-file">Reference PDF</Label><Input id="document-file" name="file" type="file" accept="application/pdf,.pdf" required /></div><div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="source-id">Source ID</Label><Input id="source-id" name="sourceId" placeholder="site-maintenance-guide" pattern="[a-z0-9][a-z0-9-]*" required /></div><div className="grid gap-2"><Label htmlFor="publisher">Publisher <span className="font-normal text-muted-foreground">optional</span></Label><Input id="publisher" name="publisher" placeholder="Operations team" /></div></div><div className="grid gap-2"><Label htmlFor="document-title">Document title</Label><Input id="document-title" name="title" placeholder="Motor inspection procedure" required /></div><div className="grid gap-2"><Label htmlFor="purpose">Purpose</Label><Input id="purpose" name="purpose" placeholder="Safe maintenance planning reference" required /></div><Button className="mt-1 h-10 w-full" disabled={busy} type="submit"><FileUp /> {busy ? "Validating upload…" : "Validate and upload"}</Button></form>{error && <Alert className="mt-4" variant="destructive"><AlertTitle>Upload failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}{message && <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-950"><ShieldCheck /><AlertTitle>Upload complete</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}</CardContent></Card><Card className="border-border/80 shadow-sm"><CardHeader className="border-b"><CardTitle>Private library</CardTitle><CardDescription>{documents.length} approved document{documents.length === 1 ? "" : "s"} available to search.</CardDescription></CardHeader><CardContent className="pt-2">{documents.length === 0 ? <div className="py-12 text-center"><FileUp className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No private documents yet</p><p className="mt-1 text-xs text-muted-foreground">Upload an approved PDF to add it here.</p></div> : <div className="divide-y">{documents.map((document) => <div key={document.id} className="py-4 first:pt-2"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{document.title}</p><p className="mt-1 text-xs text-muted-foreground">{document.original_filename}</p></div><Badge variant="secondary">{document.status}</Badge></div><Separator className="my-3" /><p className="text-xs text-muted-foreground">{document.source_id} · {document.purpose}</p></div>)}</div>}</CardContent></Card></div></div>;
}
