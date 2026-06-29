import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import Select from "react-select";
import {
  FaBarcode,
  FaChevronLeft,
  FaChevronRight,
  FaInfoCircle,
  FaSearch,
  FaSync,
  FaTimes,
} from "react-icons/fa";
import Swal from "sweetalert2";
import "./GudangProdukWorkspace.css";
import {
  buildGudangWorkspaceErrorMessage,
  fetchGudangProdukWorkspaceStockList,
  fetchStokSeriDetail,
} from "./GudangProdukWorkspaceApi";

const formatDateOnly = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const EMPTY_SUMMARY = {
  total_rows: 0,
  total_qty_awal: 0,
  total_qty_masuk: 0,
  total_qty_keluar: 0,
  total_qty_sisa: 0,
  total_locations: 0,
};

const EMPTY_PAGINATION = {
  current_page: 1,
  per_page: 50,
  total: 0,
  last_page: 1,
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const formatNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString("id-ID") : "0";
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightText = (value, keyword) => {
  const text = String(value || "");
  const cleanKeyword = String(keyword || "").trim();

  if (!cleanKeyword || !text) {
    return text || "-";
  }

  const matcher = new RegExp(`(${escapeRegExp(cleanKeyword)})`, "ig");
  return text.split(matcher).map((part, index) =>
    part.toLowerCase() === cleanKeyword.toLowerCase() ? (
      <mark key={`${part}_${index}`}>{part}</mark>
    ) : (
      <React.Fragment key={`${part}_${index}`}>{part}</React.Fragment>
    )
  );
};

// ─── Modal Kode Seri ─────────────────────────────────────────────────────────

const SeriDetailModal = ({ row, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [seriData, setSeriData] = useState(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!row) return;
    let ignore = false;
    setSearchQuery("");

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await fetchStokSeriDetail({
          skuId: row.skuId,
          slotId: row.slotId,
        });
        if (!ignore) setSeriData(data);
      } catch (err) {
        if (!ignore)
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Gagal memuat detail kode seri."
          );
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [row]);

  // Filter seri berdasarkan search query
  const filteredSeri = useMemo(() => {
    if (!seriData?.seri) return [];
    if (!searchQuery.trim()) return seriData.seri;
    const q = searchQuery.trim().toLowerCase();
    return seriData.seri.filter((kode) =>
      String(kode).toLowerCase().includes(q)
    );
  }, [seriData, searchQuery]);

  if (!row) return null;

  return (
    <div className="liststok-modal-overlay" onClick={onClose}>
      <div
        className="liststok-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="liststok-modal-header">
          <div className="liststok-modal-header-icon">
            <FaBarcode />
          </div>
          <div className="liststok-modal-header-copy">
            <h3>Kode Seri Tersisa</h3>
            <p>
              <strong>{row.sku}</strong>&nbsp;·&nbsp;{row.namaGudang}
            </p>
          </div>
          <button
            type="button"
            className="liststok-modal-close"
            onClick={onClose}
            aria-label="Tutup modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="liststok-modal-body">
          {isLoading ? (
            <div className="liststok-modal-loading">
              <span className="liststok-modal-spinner" />
              Memuat kode seri...
            </div>
          ) : error ? (
            <div className="liststok-modal-error">{error}</div>
          ) : (
            <>
              {/* Summary chips */}
              <div className="liststok-modal-summary">
                <span className="liststok-modal-summary-chip liststok-chip-sisa">
                  <FaBarcode style={{ marginRight: 6 }} />
                  {seriData?.total_seri ?? 0} seri tersisa
                </span>
                <span className="liststok-modal-summary-chip">
                  Qty sisa: <strong>{seriData?.qty_sisa ?? 0}</strong>
                </span>
                {seriData?.total_scanned != null &&
                  seriData.total_scanned > (seriData?.total_seri ?? 0) && (
                    <span className="liststok-modal-summary-chip liststok-chip-muted">
                      Total pernah masuk: {seriData.total_scanned}
                    </span>
                  )}
              </div>

              {/* Search bar */}
              {seriData?.seri?.length > 0 && (
                <div className="liststok-modal-search-wrap">
                  <span className="liststok-modal-search-icon">
                    <FaBarcode />
                  </span>
                  <input
                    type="text"
                    className="liststok-modal-search"
                    placeholder="Cari kode seri..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      className="liststok-modal-search-clear"
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Hapus pencarian"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              )}

              {/* Result count saat searching */}
              {searchQuery.trim() && (
                <div className="liststok-modal-search-result">
                  Menampilkan{" "}
                  <strong>{filteredSeri.length}</strong> dari{" "}
                  {seriData?.total_seri ?? 0} kode seri
                </div>
              )}

              {/* Seri list */}
              {seriData?.seri?.length > 0 ? (
                filteredSeri.length > 0 ? (
                  <div className="liststok-modal-seri-grid">
                    {filteredSeri.map((kode, idx) => {
                      const q = searchQuery.trim().toLowerCase();
                      const lower = String(kode).toLowerCase();
                      const matchIdx = q ? lower.indexOf(q) : -1;
                      return (
                        <div key={`${kode}_${idx}`} className="liststok-modal-seri-item">
                          <FaBarcode className="liststok-modal-seri-icon" />
                          <span className="liststok-modal-seri-code">
                            {matchIdx >= 0 ? (
                              <>
                                {kode.slice(0, matchIdx)}
                                <mark className="liststok-seri-highlight">
                                  {kode.slice(matchIdx, matchIdx + q.length)}
                                </mark>
                                {kode.slice(matchIdx + q.length)}
                              </>
                            ) : (
                              kode
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="liststok-modal-empty">
                    <FaInfoCircle style={{ fontSize: 24, marginBottom: 8 }} />
                    <span>Tidak ada kode seri yang cocok dengan "{searchQuery}"</span>
                  </div>
                )
              ) : (
                <div className="liststok-modal-empty">
                  <FaInfoCircle style={{ fontSize: 24, marginBottom: 8 }} />
                  <span>
                    Tidak ada kode seri yang tersisa di lokasi ini.
                  </span>
                  <small>
                    Kode seri hanya tersedia jika stok masuk melalui scan barcode
                    atau proses stok opname dengan seri.
                  </small>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ListStokProductGudang = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [query, setQuery] = useState({
    page: 1,
    perPage: 50,
    search: "",
    startDate: today,
    endDate: today,
    layoutId: "",
    location: "",
    opnameStatus: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState("");
  const [seriModalRow, setSeriModalRow] = useState(null);
  const [layouts, setLayouts] = useState([]);
  const [locations, setLocations] = useState([]);

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? '#2458ce' : '#d7e4f2',
      borderRadius: '12px',
      minHeight: '43px',
      backgroundColor: '#fbfdff',
      boxShadow: state.isFocused ? '0 0 0 4px rgba(36, 88, 206, 0.1)' : 'none',
      fontFamily: 'inherit',
      fontSize: '13px',
      color: '#16324f',
      minWidth: '220px',
      '&:hover': {
        borderColor: '#b6c2d6'
      }
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '13px',
      fontFamily: 'inherit',
      backgroundColor: state.isSelected 
        ? '#2458ce' 
        : state.isFocused 
        ? 'rgba(2, 132, 199, 0.08)' 
        : '#ffffff',
      color: state.isSelected ? '#ffffff' : '#16324f',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: '#2458ce'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: '#16324f',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#94a3b8',
    })
  };

  // Compact, consistent style shared by every toolbar dropdown
  const selectStyles = {
    ...customSelectStyles,
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    control: (base, state) => ({
      ...base,
      minHeight: '38px',
      height: '38px',
      borderRadius: '8px',
      borderColor: state.isFocused ? '#2458ce' : '#e0e0e4',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(36, 88, 206, 0.12)' : 'none',
      fontSize: '13px',
      minWidth: 0,
      backgroundColor: '#fff',
      '&:hover': { borderColor: state.isFocused ? '#2458ce' : '#cfcfd6' },
    }),
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = deferredSearchInput.trim();

      startTransition(() => {
        setQuery((current) => {
          if (current.search === nextSearch && current.page === 1) {
            return current;
          }

          return {
            ...current,
            search: nextSearch,
            page: 1,
          };
        });
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [deferredSearchInput]);

  useEffect(() => {
    let ignore = false;

    const loadRows = async () => {
      setIsLoading(true);

      try {
        const result = await fetchGudangProdukWorkspaceStockList({
          page: query.page,
          per_page: query.perPage,
          search: query.search,
          start_date: query.startDate,
          end_date: query.endDate,
          layout_id: query.layoutId,
          location: query.location,
          opname_status: query.opnameStatus,
        });

        if (ignore) {
          return;
        }

        setRows(result.data);
        setLocations(result.locations || []);
        if (Array.isArray(result.layouts) && result.layouts.length > 0) {
          setLayouts(result.layouts);
        }
        setSummary(result.summary);
        setPagination(result.pagination);
        setError("");
        setHasLoadedOnce(true);
      } catch (fetchError) {
        if (ignore) {
          return;
        }

        if (!hasLoadedOnce) {
          setRows([]);
          setSummary(EMPTY_SUMMARY);
          setPagination({
            ...EMPTY_PAGINATION,
            current_page: query.page,
            per_page: query.perPage,
          });
        }

        setError(
          buildGudangWorkspaceErrorMessage(
            fetchError,
            "Gagal memuat list stok product."
          )
        );
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadRows();

    return () => {
      ignore = true;
    };
  }, [query]);

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  const applyFilter = () => {
    startTransition(() => {
      setQuery((current) => ({
        ...current,
        startDate,
        endDate,
        page: 1,
      }));
    });
  };

  const refreshRows = () => {
    startTransition(() => {
      setQuery((current) => ({
        ...current,
      }));
    });
  };

  const goToPage = (page) => {
    startTransition(() => {
      setQuery((current) => ({
        ...current,
        page,
      }));
    });
  };

  const handlePerPageChange = (event) => {
    const nextPerPage = Number(event.target.value) || 50;

    startTransition(() => {
      setQuery((current) => ({
        ...current,
        perPage: nextPerPage,
        page: 1,
      }));
    });
  };

  const handleLayoutChange = (event) => {
    const nextLayoutId = event.target.value || "";

    startTransition(() => {
      setQuery((current) => ({
        ...current,
        layoutId: nextLayoutId,
        location: "", // Reset location filter if layout changes
        page: 1,
      }));
    });
  };

  const handleLocationChange = (event) => {
    const nextLocation = event.target.value || "";

    startTransition(() => {
      setQuery((current) => ({
        ...current,
        location: nextLocation,
        page: 1,
      }));
    });
  };

  const handleOpnameStatusChange = (event) => {
    const val = event.target.value || "";
    startTransition(() => {
      setQuery((current) => ({
        ...current,
        opnameStatus: val,
        page: 1,
      }));
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    setStartDate(today);
    setEndDate(today);

    startTransition(() => {
      setQuery((current) => ({
        ...current,
        search: "",
        startDate: today,
        endDate: today,
        layoutId: "",
        location: "",
        opnameStatus: "",
        page: 1,
      }));
    });
  };

  const isInitialLoading = isLoading && !hasLoadedOnce;
  const isRefreshing = isLoading && hasLoadedOnce;
  const hasRows = rows.length > 0;
  const activeSearch = query.search;
  const isSearchDirty = searchInput.trim() !== query.search;
  const hasActiveFilters =
    activeSearch ||
    query.layoutId ||
    query.location ||
    query.startDate !== today ||
    query.endDate !== today;
  const resultFrom = hasRows
    ? (pagination.current_page - 1) * pagination.per_page + 1
    : 0;
  const resultTo = hasRows
    ? Math.min(pagination.current_page * pagination.per_page, pagination.total)
    : 0;

  const visibleRows = useMemo(
    () =>
      rows.map((row, index) => ({
        ...row,
        rowNumber: resultFrom + index,
      })),
    [resultFrom, rows]
  );

  return (
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h2>Running Stok Harian</h2>
          <span className="ks-header-sub">
            Riwayat kuantitas awal, masuk, keluar, sisa harian beserta lokasi rak dan detail kode seri produk.
          </span>
        </div>
        <div className="ks-header-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            type="button"
            className="ks-btn"
            onClick={refreshRows}
            disabled={isRefreshing}
          >
            <FaSync className={isRefreshing ? "is-spinning" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Baris Stok</span>
          <span className="ks-stat-value">{formatNumber(summary.total_rows)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Qty Masuk</span>
          <span className="ks-stat-value">{formatNumber(summary.total_qty_masuk)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Qty Keluar</span>
          <span className="ks-stat-value">{formatNumber(summary.total_qty_keluar)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Qty Sisa</span>
          <span className="ks-stat-value">{formatNumber(summary.total_qty_sisa)}</span>
        </div>
      </div>

      <section className="ks-board">
        <div className="lsp-toolbar">
          <div className="lsp-filters">
            <label className="lsp-search">
              <FaSearch className="lsp-search-icon" size={14} />
              <input
                type="text"
                placeholder="Cari SKU, produk..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </label>

            <div className="lsp-date">
              <span>Mulai:</span>
              <input type="date" value={startDate} onChange={handleStartDateChange} />
            </div>

            <div className="lsp-date">
              <span>Sampai:</span>
              <input type="date" value={endDate} onChange={handleEndDateChange} />
            </div>

            <div className="lsp-field">
              <Select
                options={[
                  { value: "", label: "Semua Gudang" },
                  ...layouts.map((layout) => ({ value: layout.id, label: layout.name })),
                ]}
                value={
                  [
                    { value: "", label: "Semua Gudang" },
                    ...layouts.map((layout) => ({ value: layout.id, label: layout.name })),
                  ].find((opt) => opt.value === query.layoutId) || { value: "", label: "Semua Gudang" }
                }
                onChange={(selected) => handleLayoutChange({ target: { value: selected ? selected.value : "" } })}
                isLoading={isInitialLoading}
                placeholder="Semua Gudang"
                isSearchable
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            </div>

            <div className="lsp-field">
              <Select
                options={[
                  { value: "", label: "Semua Lokasi" },
                  ...locations.map((loc) => ({ value: loc, label: loc })),
                ]}
                value={
                  [
                    { value: "", label: "Semua Lokasi" },
                    ...locations.map((loc) => ({ value: loc, label: loc })),
                  ].find((opt) => opt.value === query.location) || { value: "", label: "Semua Lokasi" }
                }
                onChange={(selected) => handleLocationChange({ target: { value: selected ? selected.value : "" } })}
                placeholder="Semua Lokasi"
                isSearchable
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            </div>

            <div className="lsp-field">
              <Select
                options={[
                  { value: "", label: "Semua Status" },
                  { value: "sudah", label: "Sudah Opname" },
                  { value: "belum", label: "Belum Opname" },
                ]}
                value={
                  [
                    { value: "", label: "Semua Status" },
                    { value: "sudah", label: "Sudah Opname" },
                    { value: "belum", label: "Belum Opname" },
                  ].find((opt) => opt.value === query.opnameStatus) || { value: "", label: "Semua Status" }
                }
                onChange={(selected) => handleOpnameStatusChange({ target: { value: selected ? selected.value : "" } })}
                placeholder="Semua Status"
                isSearchable={false}
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            </div>

          </div>

          <div className="lsp-actions">
            <select className="lsp-perpage" value={query.perPage} onChange={handlePerPageChange}>
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
                <option key={pageSize} value={pageSize}>{pageSize} baris</option>
              ))}
            </select>

            <button type="button" className="lsp-btn lsp-btn-apply" onClick={applyFilter}>
              Tampilkan
            </button>

            {(activeSearch || query.layoutId || query.location || startDate !== today || endDate !== today) && (
              <button type="button" className="lsp-btn lsp-btn-reset" onClick={clearFilters}>
                Reset
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="ks-empty" style={{ color: '#ef4444', padding: '10px' }}>
            {error}
          </div>
        )}

        <div className="ks-grid-scroll">
          {isInitialLoading ? (
            <div className="ks-empty">
              <FaSync className="is-spinning" size={20} />
              <p>Memuat running stok harian...</p>
            </div>
          ) : hasRows ? (
            <>
              <table className="ks-grid" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>Gambar</th>
                    <th style={{ width: '40px' }}>No</th>
                    <th>Tanggal</th>
                    <th>SKU</th>
                    <th className="align-right">Qty Awal</th>
                    <th className="align-right">Qty Masuk</th>
                    <th className="align-right">Qty Keluar</th>
                    <th className="align-right">Qty Sisa</th>
                    <th>Gudang</th>
                    <th>Lokasi</th>
                    <th>Status Opname</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(
                    visibleRows.reduce((acc, row) => {
                      let baseName = row.productName;
                      if (!baseName) {
                        if (row.sku && row.sku.includes(' - ')) {
                          baseName = row.sku.split(' - ')[0].trim();
                        } else if (row.sku && row.sku.includes('-')) {
                          const parts = row.sku.split('-');
                          if (parts.length >= 3) {
                            baseName = parts.slice(0, parts.length - 2).join('-').trim();
                          } else {
                            baseName = parts[0].trim();
                          }
                        } else {
                          baseName = row.skuId;
                        }
                      }
                      
                      const groupKey = `${baseName}_${row.ukuran || 'no-size'}`;
                      
                      if (!acc[groupKey]) {
                        acc[groupKey] = {
                          gambarProduk: row.gambarProduk,
                          rows: [],
                        };
                      }
                      acc[groupKey].rows.push(row);
                      return acc;
                    }, {})
                  ).map((group, groupIdx) => (
                    <React.Fragment key={`group-${groupIdx}`}>
                      {group.rows.map((row, rowIndex) => (
                        <tr key={row.id}>
                          {rowIndex === 0 && (
                            <td rowSpan={group.rows.length} style={{ verticalAlign: 'top', padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                              {group.gambarProduk ? (
                                <img 
                                  src={group.gambarProduk} 
                                  alt="Produk" 
                                  onClick={() => {
                                    Swal.fire({
                                      imageUrl: group.gambarProduk,
                                      imageAlt: "Gambar Produk",
                                      showConfirmButton: false,
                                      width: "auto",
                                      background: "transparent",
                                      backdrop: "rgba(0,0,0,0.8)"
                                    });
                                  }}
                                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'block', margin: '0 auto', cursor: 'pointer' }}
                                />
                              ) : (
                                <div style={{ width: '48px', height: '48px', backgroundColor: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>No Img</span>
                                </div>
                              )}
                            </td>
                          )}
                          <td style={{ borderBottom: '1px solid #e2e8f0' }}>{formatNumber(row.rowNumber)}</td>
                          <td style={{ borderBottom: '1px solid #e2e8f0' }}><strong>{formatDateOnly(row.tanggal)}</strong></td>
                          <td style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <strong>{highlightText(row.sku, activeSearch)}</strong>
                          </td>
                          <td className="align-right" style={{ borderBottom: '1px solid #e2e8f0' }}>{formatNumber(row.qtyAwal)}</td>
                          <td className="align-right" style={{ color: '#10b981', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>{row.qtyMasuk > 0 ? '+' : ''}{formatNumber(row.qtyMasuk)}</td>
                          <td className="align-right" style={{ color: '#ef4444', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>{row.qtyKeluar > 0 ? '-' : ''}{formatNumber(row.qtyKeluar)}</td>
                          <td className="align-right" style={{ fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>{formatNumber(row.qtySisa)}</td>
                          <td style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <strong>{highlightText(row.layoutName || '', activeSearch)}</strong>
                          </td>
                          <td style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <span className="ks-badge">{highlightText(row.namaGudang, activeSearch)}</span>
                          </td>
                          <td style={{ borderBottom: '1px solid #e2e8f0', verticalAlign: 'top', padding: '12px 8px' }}>
                            {row.isOpnamed ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className="ks-badge" style={{ background: '#ecfdf5', color: '#10b981', borderColor: '#a7f3d0', width: 'fit-content' }}>Sudah Opname</span>
                                {row.lastOpnameDate && (
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    Terakhir: {formatDate(row.lastOpnameDate)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="ks-badge" style={{ background: '#fffbeb', color: '#f59e0b', borderColor: '#fde68a', width: 'fit-content' }}>Belum Opname</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                            <button
                              type="button"
                              className="ks-btn"
                              style={{ padding: '4px 8px', fontSize: '12px', margin: '0 auto' }}
                              onClick={() => setSeriModalRow(row)}
                            >
                              <FaBarcode style={{ marginRight: 4 }} />
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="ks-empty">
              <p>Tidak ada stok product yang cocok dengan filter pencarian.</p>
              {hasActiveFilters ? (
                <button type="button" className="ks-btn" onClick={clearFilters} style={{ marginTop: '12px' }}>
                  Reset Filter
                </button>
              ) : null}
            </div>
          )}
        </div>

        {hasRows && pagination.last_page > 1 ? (
          <div className="ks-footer">
            <div className="ks-footer-info">
              Menampilkan <strong>{formatNumber((pagination.current_page - 1) * pagination.per_page + 1)}</strong> - <strong>{formatNumber(Math.min(pagination.current_page * pagination.per_page, pagination.total))}</strong> dari <strong>{formatNumber(pagination.total)}</strong> baris
            </div>
            <div className="ks-pagination">
              <button
                className="ks-page-btn"
                onClick={() => goToPage(pagination.current_page - 1)}
                disabled={pagination.current_page <= 1}
              >
                <FaChevronLeft size={12} />
              </button>
              <span className="ks-page-info">
                Halaman {formatNumber(pagination.current_page)} dari {formatNumber(pagination.last_page)}
              </span>
              <button
                className="ks-page-btn"
                onClick={() => goToPage(pagination.current_page + 1)}
                disabled={pagination.current_page >= pagination.last_page}
              >
                <FaChevronRight size={12} />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {seriModalRow ? (
        <SeriDetailModal
          row={seriModalRow}
          onClose={() => setSeriModalRow(null)}
        />
      ) : null}
    </div>
  );
};

export default ListStokProductGudang;
