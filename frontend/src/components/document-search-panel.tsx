"use client";

import { type FormEvent, useState } from "react";
import { BookOpen, ExternalLink, Search } from "lucide-react";
import {
  searchDocuments,
  type DocumentSearchResult,
} from "@/lib/api";

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
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Document search could not be completed.",
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <BookOpen size={20} />
        <div>
          <p className="eyebrow">Maintenance references</p>
          <h2>Document search</h2>
          <p>Search approved reference documents. Results are evidence, not maintenance instructions.</p>
        </div>
      </div>

      <form className="search" onSubmit={handleSearch}>
        <input
          aria-label="Search maintenance references"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Example: How does condition monitoring support maintenance planning?"
        />
        <button className="button primary" disabled={searching}>
          <Search size={16} />
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="document-results">
          {results.map((result) => (
            <article
              key={`${result.source_id}-${result.page_number}-${result.chunk_number}`}
              className="document-result"
            >
              <div className="document-result-meta">
                <strong>{result.title}</strong>
                <span>Page {result.page_number}</span>
                <span>Match {Math.round(result.similarity_score * 100)}%</span>
              </div>

              <p>{result.text}</p>

              {result.source_url ? (
                <a href={result.source_url} target="_blank" rel="noreferrer">
                  View official source <ExternalLink size={14} />
                </a>
              ) : (
                <span className="private-document-label">Private uploaded reference</span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
