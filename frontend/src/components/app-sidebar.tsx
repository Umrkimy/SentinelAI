"use client";

import Link from "next/link";
import { Activity, Box, LayoutDashboard } from "lucide-react";

export type DashboardView = "overview" | "equipment" | "assessments";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "equipment", label: "Equipment", icon: Box },
  { id: "assessments", label: "Assessments", icon: Activity },
] as const;

export function AppSidebar({
  activeView,
  equipmentCount,
  onViewChange,
}: {
  activeView: DashboardView;
  equipmentCount: number;
  onViewChange: (view: DashboardView) => void;
}) {
  return (
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="SentinelAI home">
        <span className="brand-symbol">
          <Activity size={23} />
        </span>
        Sentinel<span className="brand-ai">AI</span>
      </Link>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${activeView === id ? "active" : ""}`}
            aria-current={activeView === id ? "page" : undefined}
            onClick={() => onViewChange(id)}
          >
            <Icon size={18} />
            {label}
            {id === "equipment" && (
              <span className="nav-count">{equipmentCount}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
