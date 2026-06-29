import React from "react";
import { FiSearch } from "react-icons/fi";

const GudangProdukBaseShell = ({
  title,
  subtitle,
  icon: Icon,
  moduleLabel = "Gudang Produk",
  statusLabel = "Mock Data Live",
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Cari cepat...",
  headerActions = [],
  children,
}) => {
  return (
    <div className="ks-page pl-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {Icon && <Icon style={{ color: "#2458ce" }} />}
            <h1>{title}</h1>
          </div>
          <span className="ks-header-sub">{subtitle}</span>
        </div>

        <div className="ks-header-actions">
          {typeof onSearchChange === "function" ? (
            <label className="ks-search" style={{ width: "250px", margin: 0 }}>
              <FiSearch className="ks-search-icon" size={14} style={{ position: "absolute", left: "12px", color: "#94a3b8" }} />
              <input
                className="ks-search-input"
                style={{ width: "100%", paddingLeft: "36px" }}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </label>
          ) : null}

          {moduleLabel && (
            <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 8px", background: "#f1f5f9", borderRadius: "6px", color: "#64748b" }}>
              {moduleLabel}
            </span>
          )}

          {statusLabel && (
            <span style={{ fontSize: "11px", fontWeight: "700", padding: "4px 8px", background: "#ecfccb", borderRadius: "6px", color: "#3f6212" }}>
              {statusLabel}
            </span>
          )}

          {headerActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.key || action.label}
                type="button"
                className={`ks-btn ${action.variant === "primary" ? "is-primary" : "is-secondary"}`}
                onClick={action.onClick}
                disabled={Boolean(action.disabled)}
                title={action.label}
              >
                {ActionIcon && <ActionIcon />}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", background: "var(--ks-bg)", display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
};

export default GudangProdukBaseShell;
