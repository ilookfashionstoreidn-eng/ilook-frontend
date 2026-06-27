import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiRefreshCw,
  FiX,
  FiFilter,
  FiCheckCircle,
  FiAlertCircle
} from "react-icons/fi";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import {
  buildGudangWorkspaceErrorMessage,
  fetchGudangProdukHistoryOutCheck,
} from "./GudangProdukWorkspaceApi";

const EMPTY_SUMMARY = {
  total_rows: 0,
  total_qty: 0,
  total_sku: 0,
  total_seri: 0,
  total_entered: 0,
  total_not_entered: 0,
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

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

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
    second: "2-digit",
  });
};

const getToday = () => new Date().toISOString().slice(0, 10);

const parseEnteredSource = (notes) => {
  if (!notes) return "-";
  if (notes.toLowerCase().includes("scan produk masuk")) return "Scan Masuk";
  if (notes.toLowerCase().includes("stok opname")) return "Stok Opname";
  if (notes.toLowerCase().includes("import excel")) return "Import Excel";
  return "Placement Gudang";
};

const HistoryOutCheckGudang = () => {
  const today = getToday();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [singleDate, setSingleDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "entered", "not_entered"
  const [query, setQuery] = useState({
    page: 1,
    perPage: 50,
    search: "",
    startDate: today,
    endDate: today,
    status: "all",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState("");

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

  const loadRows = async () => {
    setIsLoading(true);

    try {
      const result = await fetchGudangProdukHistoryOutCheck({
        page: query.page,
        per_page: query.perPage,
        search: query.search,
        start_date: query.startDate,
        end_date: query.endDate,
        status: query.status,
      });

      setRows(result.data || []);
      setSummary(result.summary || EMPTY_SUMMARY);
      setPagination(result.pagination || EMPTY_PAGINATION);
      setError("");
      setHasLoadedOnce(true);
    } catch (fetchError) {
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
          "Gagal memuat history data barang keluar."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [query]);

  const openDatePicker = (event) => {
    const input = event.currentTarget;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch (pickerError) {
        // Browser can block repeated picker calls.
      }
    }
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
    setSingleDate("");
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
    setSingleDate("");
  };

  const handleSingleDateChange = (event) => {
    const selectedDate = event.target.value;

    setSingleDate(selectedDate);
    if (selectedDate) {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    }
  };

  const applyFilter = () => {
    startTransition(() => {
      setQuery((current) => ({
        ...current,
        startDate,
        endDate,
        status: statusFilter,
        page: 1,
      }));
    });
  };

  const refreshRows = () => {
    startTransition(() => {
      setQuery((current) => ({ ...current }));
    });
  };

  const clearSearch = () => {
    setSearchInput("");

    startTransition(() => {
      setQuery((current) => ({
        ...current,
        search: "",
        page: 1,
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

  const goToPage = (page) => {
    startTransition(() => {
      setQuery((current) => ({
        ...current,
        page,
      }));
    });
  };

  const isInitialLoading = isLoading && !hasLoadedOnce;
  const isRefreshing = isLoading && hasLoadedOnce;
  const activeSearch = query.search;
  const isSearchDirty = searchInput.trim() !== query.search;
  const hasRows = rows.length > 0;
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
          <h1>History Keluar - Cek Masuk</h1>
          <span className="ks-header-sub">Cek apakah produk/seri yang keluar sudah pernah di-scan masuk ke gudang sebelumnya.</span>
        </div>
        <div className="ks-header-actions">
          <button type="button" className="ks-btn is-primary" onClick={refreshRows} disabled={isLoading}>
            <FiRefreshCw size={13} className={isRefreshing ? "is-spinning" : ""} />
            {isLoading ? "Memuat" : "Muat Ulang"}
          </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Total Barang Keluar</span>
          <span className="ks-stat-value">{formatNumber(summary.total_qty || summary.total_rows)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Sudah Pernah Masuk</span>
          <span className="ks-stat-value" style={{ color: '#10b981' }}>{formatNumber(summary.total_entered)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Belum Pernah Masuk</span>
          <span className="ks-stat-value" style={{ color: '#ef4444' }}>{formatNumber(summary.total_not_entered)}</span>
        </div>
      </div>

      <section className="ks-board">
        <div className="ks-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="ks-search" style={{ flex: '1 1 300px' }}>
            <FiSearch className="ks-search-icon" size={14} />
            <input
              type="text"
              placeholder="Cari SKU atau kode seri..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}
            >
              <option value="all">Semua Status</option>
              <option value="entered">Sudah Pernah Masuk</option>
              <option value="not_entered">Belum Pernah Masuk</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             <button type="button" className="ks-btn is-primary" onClick={applyFilter}>
               <FiFilter size={13} /> Tampilkan
             </button>
             {(activeSearch || startDate || endDate || statusFilter !== 'all') && (
               <button type="button" className="ks-btn" onClick={clearSearch}>
                 <FiX size={13} /> Reset
               </button>
             )}
          </div>
        </div>

        {error ? (
          <div className="ks-empty" style={{ color: '#ef4444' }}>
             {error}
          </div>
        ) : null}

        <div className="ks-grid-scroll">

        {isInitialLoading ? (
          <div className="ks-empty">
            <FiRefreshCw className="is-spinning" size={20} />
            <p>Memuat data histori...</p>
          </div>
        ) : hasRows ? (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="ks-grid">
                <thead>
                    <tr>
                      <th style={{ width: "170px" }}>Status Masuk</th>
                      <th>SKU</th>
                      <th>Qty</th>
                      <th>Nomor Seri / Catatan</th>
                      <th>Sumber Keluar</th>
                      <th>Tanggal Keluar</th>
                      <th>Info Masuk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {row.hasEntered ? (
                            <span className="ks-badge tone-safe">
                              <FiCheckCircle size={12} /> Sudah Masuk
                            </span>
                          ) : (
                            <span className="ks-badge tone-danger">
                              <FiAlertCircle size={12} /> Belum Masuk
                            </span>
                          )}
                        </td>
                        <td>
                          <strong>{row.sku || "-"}</strong>
                        </td>
                        <td>{formatNumber(row.qty || 0)}</td>
                        <td>{row.kodeSeri || "-"}</td>
                        <td>{row.sourceLabel || "-"}</td>
                        <td>{formatDateTime(row.happenedAt || row.keluarPada)}</td>
                        <td>
                          {row.hasEntered ? (
                            <div style={{ fontSize: "11px", lineHeight: "1.3" }}>
                              <div style={{ fontWeight: "600", color: "#10b981" }}>
                                {parseEnteredSource(row.enteredNotes)}
                              </div>
                              <div style={{ color: "#64748b" }}>
                                {formatDateTime(row.enteredAt)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "11px", fontStyle: "italic" }}>
                              Tidak ada data masuk
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            {pagination.last_page > 1 ? (
              <div className="ks-footer">
                <div className="ks-footer-info">
                  <span>Hal. {formatNumber(pagination.current_page)}/{formatNumber(pagination.last_page)} · {formatNumber(pagination.total)} baris</span>
                  <label className="ks-pagesize">
                    Tampil
                    <select value={query.perPage} onChange={handlePerPageChange}>
                      {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
                <div className="ks-pager">
                  <button type="button" className="ks-pg-btn" onClick={() => goToPage(Math.max(1, pagination.current_page - 1))} disabled={pagination.current_page <= 1}><FiChevronLeft size={14} /></button>
                  <button type="button" className={`ks-pg-btn is-active`}>{pagination.current_page}</button>
                  <button type="button" className="ks-pg-btn" onClick={() => goToPage(Math.min(pagination.last_page, pagination.current_page + 1))} disabled={pagination.current_page >= pagination.last_page}><FiChevronRight size={14} /></button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="ks-empty">
            <p>Tidak ada data barang keluar pada filter ini. Ubah tanggal, status, atau kata kunci pencarian untuk melihat data lain.</p>
          </div>
        )}
        </div>
      </section>
    </div>
  );
};

export default HistoryOutCheckGudang;
