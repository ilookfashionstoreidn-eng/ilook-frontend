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
    <div className="gudang-ui-page">
      <div className="gudang-ui-shell">
        <header className="gudang-ui-topbar">
          <div className="gudang-ui-title-group">
            <div className="gudang-ui-brand-icon">{Icon ? <Icon /> : null}</div>
            <div className="gudang-ui-title-wrap">
              <span className="gudang-ui-module-pill">{moduleLabel}</span>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>

          <div className="gudang-ui-topbar-right">
            {typeof onSearchChange === "function" ? (
              <label className="gudang-ui-search-wrap">
                <FiSearch className="gudang-ui-search-icon" />
                <input
                  className="gudang-ui-search-input"
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                />
              </label>
            ) : null}

            <span className="gudang-ui-status-pill">{statusLabel}</span>

            {headerActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.key || action.label}
                  type="button"
                  className={`gudang-ui-header-action ${action.variant || "secondary"}`}
                  onClick={action.onClick}
                  title={action.label}
                >
                  {ActionIcon ? <ActionIcon /> : null}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        <main className="gudang-ui-main">{children}</main>
      </div>
    </div>
  );
};

export default GudangProdukBaseShell;
