"use client";

import { type FormEvent, useEffect, useState } from "react";
import { LockKeyhole, LogOut, Upload } from "lucide-react";
import {
  getUploadedDocuments,
  loginAdmin,
  uploadDocument,
  type UploadedDocument,
} from "@/lib/api";

const TOKEN_KEY = "sentinelai-admin-token";

export function DocumentAdminPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem(TOKEN_KEY);
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (!token) return;
    getUploadedDocuments(token)
      .then(setDocuments)
      .catch((requestError: Error) => {
        window.sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setError(requestError.message);
      });
  }, [token]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await loginAdmin(
        String(form.get("username") ?? ""),
        String(form.get("password") ?? ""),
      );
      window.sessionStorage.setItem(TOKEN_KEY, response.access_token);
      setToken(response.access_token);
      event.currentTarget.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a PDF to upload.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const uploaded = await uploadDocument(token, {
        file,
        sourceId: String(form.get("sourceId") ?? ""),
        title: String(form.get("title") ?? ""),
        publisher: String(form.get("publisher") ?? ""),
        purpose: String(form.get("purpose") ?? ""),
      });
      setDocuments((current) => [uploaded, ...current]);
      setMessage(`${uploaded.title} is ready for document search.`);
      event.currentTarget.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setDocuments([]);
    setMessage(null);
    setError(null);
  }

  return (
    <section className="panel document-admin">
      <div className="panel-heading">
        <LockKeyhole size={20} />
        <div>
          <p className="eyebrow">Restricted area</p>
          <h2>Reference document administration</h2>
          <p>Only an authenticated admin can add PDFs. Uploaded files remain private.</p>
        </div>
        {token && (
          <button className="button secondary" onClick={signOut}>
            <LogOut size={16} /> Sign out
          </button>
        )}
      </div>

      {!token ? (
        <form className="document-admin-form" onSubmit={handleLogin}>
          <label>Username<input name="username" required autoComplete="username" /></label>
          <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
          <button className="button primary" disabled={busy}>{busy ? "Signing in…" : "Admin sign in"}</button>
        </form>
      ) : (
        <>
          <form className="document-admin-form" onSubmit={handleUpload}>
            <label>PDF file<input name="file" type="file" accept="application/pdf,.pdf" required /></label>
            <label>Source ID<input name="sourceId" placeholder="site-maintenance-procedure" pattern="[a-z0-9][a-z0-9-]*" required /></label>
            <label>Title<input name="title" required /></label>
            <label>Publisher<input name="publisher" placeholder="Optional" /></label>
            <label className="full-width">Purpose<input name="purpose" placeholder="What safe maintenance context does it provide?" required /></label>
            <button className="button primary" disabled={busy}><Upload size={16} />{busy ? "Uploading…" : "Validate and upload"}</button>
          </form>
          {message && <p className="result-message" role="status">{message}</p>}
          {documents.length > 0 && <div className="uploaded-document-list">{documents.map((document) => <div key={document.id}><strong>{document.title}</strong><span>{document.status} · {document.original_filename}</span></div>)}</div>}
        </>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
