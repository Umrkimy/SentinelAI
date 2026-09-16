"use client";

import { Plus, RefreshCw } from "lucide-react";

export function DashboardHeader({
  loading,
  hasError,
  refreshDisabled,
  onRefresh,
  onRegister,
}: {
  loading: boolean;
  hasError: boolean;
  refreshDisabled: boolean;
  onRefresh: () => void;
  onRegister: () => void;
}) {
  return (
    <header className="topbar">
      <span
        className={`connection ${loading ? "pending" : hasError ? "offline" : ""}`}
      >
        <i />
        {loading
          ? "Connecting"
          : hasError
            ? "Connection unavailable"
            : "API connected"}
      </span>
      <div className="heading-actions">
        <button
          className="button secondary icon-button"
          aria-label="Refresh data"
          onClick={onRefresh}
          disabled={refreshDisabled}
        >
          <RefreshCw size={17} className={loading ? "spinning" : ""} />
        </button>
        <button className="button primary" onClick={onRegister}>
          <Plus size={17} />
          Register equipment
        </button>
      </div>
    </header>
  );
}
