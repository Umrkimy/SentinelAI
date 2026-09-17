"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { ArrowRight, Box, ChevronLeft, ChevronRight, Factory, MapPin, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import type { Equipment } from "@/lib/api";

const PAGE_SIZE = 6;

export function EquipmentRegistry({ equipment, selectedId, loading, error, onSelect, onRegister }: {
  equipment: Equipment[]; selectedId: number | null; loading: boolean; error: string | null;
  onSelect: (id: number) => void; onRegister: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "asset_tag", desc: false }]);
  const filtered = useMemo(() => equipment.filter((item) =>
    `${item.asset_tag} ${item.machine_type} ${item.location ?? ""}`.toLowerCase().includes(query.toLowerCase()) &&
    (status === "all" || item.is_active === (status === "active")),
  ), [equipment, query, status]);
  const columns = useMemo<ColumnDef<Equipment>[]>(() => [
    {
      accessorKey: "asset_tag", header: "Asset name",
      cell: ({ row }) => {
        const item = row.original;
        return <button className="asset-button" aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id)}>
          <span className="asset-icon"><Factory size={18} /></span>
          <span>{item.asset_tag}<small>Asset #{String(item.id).padStart(4, "0")}</small></span>
        </button>;
      },
    },
    { accessorKey: "machine_type", header: "Machine type" },
    { accessorKey: "location", header: "Location", cell: ({ row }) => <span className="location"><MapPin size={14} />{row.original.location || "Not specified"}</span> },
    {
      id: "status", header: "Registration status", accessorFn: (item) => item.is_active ? "Active" : "Inactive",
      cell: ({ row }) => <span className={`badge ${row.original.is_active ? "positive" : "neutral"}`}><i />{row.original.is_active ? "Active" : "Inactive"}</span>,
    },
    {
      id: "selection", header: () => <span className="sr-only">Selection</span>, enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        return <button className={`row-action ${selectedId === item.id ? "chosen" : ""}`} aria-label={`Select ${item.asset_tag}`} onClick={() => onSelect(item.id)}>
          {selectedId === item.id ? "Selected" : "Inspect"}<ArrowRight size={14} />
        </button>;
      },
    },
  ], [onSelect, selectedId]);
  const table = useReactTable({
    data: filtered, columns, state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });
  const pageIndex = table.getState().pagination.pageIndex;

  return <section className="panel equipment-panel">
    <div className="panel-heading"><div><h2>Equipment registry <span className="count">{equipment.length}</span></h2><p>Select an asset to inspect its readings and risk history.</p></div></div>
    <div className="table-toolbar">
      <label className="search"><Search size={17} /><input aria-label="Search equipment" placeholder="Search assets, types, or locations…" value={query} onChange={(event) => { setQuery(event.target.value); table.setPageIndex(0); }} />
        {query && <button aria-label="Clear search" onClick={() => { setQuery(""); table.setPageIndex(0); }}><X size={15} /></button>}
      </label>
      <label className="filter"><SlidersHorizontal size={15} /><select aria-label="Filter equipment status" value={status} onChange={(event) => { setStatus(event.target.value); table.setPageIndex(0); }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
    </div>
    <div className="table-scroll"><table className="data-table"><thead>
      {table.getHeaderGroups().map((headerGroup) => <tr key={headerGroup.id}>{headerGroup.headers.map((header) => <th key={header.id} aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : undefined}>
        {header.isPlaceholder ? null : header.column.getCanSort() ? <button className="sort-button" onClick={header.column.getToggleSortingHandler()}>
          {flexRender(header.column.columnDef.header, header.getContext())}<span aria-hidden="true">{header.column.getIsSorted() === "desc" ? "↓" : header.column.getIsSorted() === "asc" ? "↑" : "↕"}</span>
        </button> : flexRender(header.column.columnDef.header, header.getContext())}
      </th>)}</tr>)}
    </thead><tbody>
      {!loading && table.getRowModel().rows.map((row) => <tr key={row.id} className={selectedId === row.original.id ? "selected-row" : ""}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
      {(loading || filtered.length === 0) && <tr><td colSpan={5}><div className="empty-state"><Box size={27} />
        <strong>{loading ? "Loading equipment…" : error && !equipment.length ? "Your equipment is unavailable" : equipment.length ? "No matching equipment" : "No equipment registered"}</strong>
        <p>{loading ? "Connecting to SentinelAI." : equipment.length ? "Try another search or change the status filter." : "Register equipment before recording sensor readings."}</p>
        {!loading && !error && !equipment.length && <button className="button secondary" onClick={onRegister}><Plus size={16} />Register equipment</button>}
      </div></td></tr>}
    </tbody></table></div>
    <div className="table-footer"><span>{filtered.length ? `${pageIndex * PAGE_SIZE + 1}–${Math.min((pageIndex + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} assets` : "0 assets"}</span>
      <div className="pagination"><button aria-label="Previous equipment page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ChevronLeft size={16} /></button><span>Page {pageIndex + 1} of {Math.max(1, table.getPageCount())}</span><button aria-label="Next equipment page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><ChevronRight size={16} /></button></div>
    </div>
  </section>;
}
