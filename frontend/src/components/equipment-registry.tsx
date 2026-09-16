"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Box,
  ChevronLeft,
  ChevronRight,
  Factory,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Equipment } from "@/lib/api";

const PAGE_SIZE = 6;

export function EquipmentRegistry({
  equipment,
  selectedId,
  loading,
  error,
  onSelect,
  onRegister,
}: {
  equipment: Equipment[];
  selectedId: number | null;
  loading: boolean;
  error: string | null;
  onSelect: (id: number) => void;
  onRegister: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(0);
  const filtered = useMemo(
    () =>
      equipment
        .filter(
          (item) =>
            `${item.asset_tag} ${item.machine_type} ${item.location ?? ""}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (status === "all" || item.is_active === (status === "active")),
        )
        .sort(
          (a, b) =>
            (ascending ? 1 : -1) *
            a.asset_tag.localeCompare(b.asset_tag, undefined, { numeric: true }),
        ),
    [ascending, equipment, query, status],
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1),
  );
  const visibleEquipment = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  return (
    <section className="panel equipment-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Equipment registry <span className="count">{equipment.length}</span>
          </h2>
          <p>Select an asset to inspect its readings and risk history.</p>
        </div>
      </div>
      <div className="table-toolbar">
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Search equipment"
            placeholder="Search assets, types, or locations…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
          {query && (
            <button
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setPage(0);
              }}
            >
              <X size={15} />
            </button>
          )}
        </label>
        <label className="filter">
          <SlidersHorizontal size={15} />
          <select
            aria-label="Filter equipment status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th aria-sort={ascending ? "ascending" : "descending"}>
                <button className="sort-button" onClick={() => setAscending(!ascending)}>
                  Asset name
                  <ArrowDown
                    size={13}
                    style={{ transform: ascending ? undefined : "rotate(180deg)" }}
                  />
                </button>
              </th>
              <th>Machine type</th>
              <th>Location</th>
              <th>Registration status</th>
              <th><span className="sr-only">Selection</span></th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              visibleEquipment.map((item) => (
                <tr key={item.id} className={selectedId === item.id ? "selected-row" : ""}>
                  <td>
                    <button
                      className="asset-button"
                      aria-pressed={selectedId === item.id}
                      onClick={() => onSelect(item.id)}
                    >
                      <span className="asset-icon"><Factory size={18} /></span>
                      <span>{item.asset_tag}<small>Asset #{String(item.id).padStart(4, "0")}</small></span>
                    </button>
                  </td>
                  <td>{item.machine_type}</td>
                  <td><span className="location"><MapPin size={14} />{item.location || "Not specified"}</span></td>
                  <td>
                    <span className={`badge ${item.is_active ? "positive" : "neutral"}`}>
                      <i />{item.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`row-action ${selectedId === item.id ? "chosen" : ""}`}
                      aria-label={`Select ${item.asset_tag}`}
                      onClick={() => onSelect(item.id)}
                    >
                      {selectedId === item.id ? "Selected" : "Inspect"}<ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            {(loading || filtered.length === 0) && (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <Box size={27} />
                  <strong>
                    {loading
                      ? "Loading equipment…"
                      : error && !equipment.length
                        ? "Your equipment is unavailable"
                        : equipment.length
                          ? "No matching equipment"
                          : "No equipment registered"}
                  </strong>
                  <p>
                    {loading
                      ? "Connecting to SentinelAI."
                      : equipment.length
                        ? "Try another search or change the status filter."
                        : "Register equipment before recording sensor readings."}
                  </p>
                  {!loading && !error && !equipment.length && (
                    <button className="button secondary" onClick={onRegister}>
                      <Plus size={16} />Register equipment
                    </button>
                  )}
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>
          {filtered.length
            ? `${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} assets`
            : "0 assets"}
        </span>
        <div className="pagination">
          <button aria-label="Previous equipment page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>
          <span>Page {currentPage + 1} of {Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}</span>
          <button aria-label="Next equipment page" disabled={(currentPage + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button>
        </div>
      </div>
    </section>
  );
}
