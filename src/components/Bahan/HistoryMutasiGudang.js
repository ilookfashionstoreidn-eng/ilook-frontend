import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaHistory,
  FaQrcode,
  FaSync,
  FaTimes,
  FaExchangeAlt,
  FaHourglassHalf,
  FaBan,
} from "react-icons/fa";
import {
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiRefreshCw,
  FiX,
  FiClock,
  FiSlash,
  FiFilter
} from "react-icons/fi";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import {
  buildGudangWorkspaceErrorMessage,
  fetchGudangProdukMutationHistory,
  revertMutationSession,
} from "./GudangProdukWorkspaceApi";

const EMPTY_SUMMARY = {
  total_rows: 0,
  total_qty: 0,
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
  });
};

const getToday = () => new Date().toISOString().slice(0, 10);

const HistoryMutasiGudang = () => {
  const today = getToday();
  const [activeTab, setActiveTab] = useState("executed"); // 'executed', 'pending', 'cancelled'
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [singleDate, setSingleDate] = useState("");
  const [query, setQuery] = useState({
    page: 1,
    perPage: 50,
    search: "",
    startDate: "",
    endDate: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState("");
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [isRevertingId, setIsRevertingId] = useState(null);

  const handleRevert = async (activityLogId, notes) => {
    const sessionId = notes.match(/Sesi:\s*(\d+)/i)?.[1];
    if (!sessionId) {
      alert("Tidak dapat membatalkan: ID Sesi tidak ditemukan dalam catatan.");
      return;
    }
    if (!window.confirm("Apakah Anda yakin ingin membatalkan mutasi ini dan mengembalikan sesi?")) {
      return;
    }
    
    setIsRevertingId(activityLogId);
    try {
      const res = await revertMutationSession(sessionId);
      alert(res.message || "Mutasi berhasil dibatalkan.");
      refreshRows();
    } catch (err) {
      alert(buildGudangWorkspaceErrorMessage(err, "Gagal membatalkan mutasi."));
    } finally {
      setIsRevertingId(null);
    }
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
        const result = await fetchGudangProdukMutationHistory({
          page: query.page,
          per_page: query.perPage,
          search: query.search,
          start_date: query.startDate,
          end_date: query.endDate,
          status: activeTab,
        });

        if (ignore) {
          return;
        }

        setRows(result.data || []);
        setSummary(result.summary || EMPTY_SUMMARY);
        setPagination(result.pagination || EMPTY_PAGINATION);
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
            "Gagal memuat riwayat mutasi."
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
  }, [query, activeTab]);

  const openDatePicker = (event) => {
    const input = event.currentTarget;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch (pickerError) {
        // ignore
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
    setStartDate("");
    setEndDate("");
    setSingleDate("");

    startTransition(() => {
      setQuery((current) => ({
        ...current,
        search: "",
        startDate: "",
        endDate: "",
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

  const toggleRowExpansion = (rowId) => {
    setExpandedRowId((current) => (current === rowId ? null : rowId));
  };

  return (
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Riwayat Mutasi Gudang</h1>
          <span className="ks-header-sub">Riwayat perpindahan stok antar lokasi/rak dan daftar antrean mutasi.</span>
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
          <span className="ks-stat-label">Status Data</span>
          <span className="ks-stat-value">
            {isInitialLoading ? "Memuat..." : isRefreshing ? "Memperbarui..." : `${formatNumber(summary.total_rows)} trx`}
          </span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Total Transaksi</span>
          <span className="ks-stat-value">{formatNumber(summary.total_rows)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Total Qty Mutasi</span>
          <span className="ks-stat-value">{formatNumber(summary.total_qty)}</span>
        </div>
      </div>

      <section className="ks-board">
        <div className="ks-toolbar">
          <div className="ks-segment" role="tablist">
            <button
              type="button"
              className={`ks-seg-btn ${activeTab === "executed" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("executed");
                setRows([]);
                setHasLoadedOnce(false);
              }}
            >
              Riwayat Mutasi
            </button>
            <button
              type="button"
              className={`ks-seg-btn ${activeTab === "pending" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("pending");
                setRows([]);
                setHasLoadedOnce(false);
              }}
            >
              <FiClock style={{ marginRight: '6px' }} /> Belum Dieksekusi
            </button>
            <button
              type="button"
              className={`ks-seg-btn ${activeTab === "cancelled" ? "is-active" : ""}`}
              onClick={() => {
                setActiveTab("cancelled");
                setRows([]);
                setHasLoadedOnce(false);
              }}
            >
              <FiSlash style={{ marginRight: '6px' }} /> Dibatalkan
            </button>
          </div>
        </div>

        <div className="ks-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '12px' }}>
          <label className="ks-search" style={{ flex: '1 1 300px' }}>
            <FiSearch className="ks-search-icon" size={14} />
            <input
              type="text"
              placeholder="Cari SKU atau lokasi..."
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
             <button type="button" className="ks-btn is-primary" onClick={applyFilter}>
               <FiFilter size={13} /> Tampilkan
             </button>
             {(activeSearch || startDate || endDate) && (
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
            <p>Memuat data mutasi...</p>
          </div>
        ) : hasRows ? (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="ks-grid">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>ID</th>
                    <th>SKU</th>
                    <th className="align-right">Qty</th>
                    <th>Lokasi Asal</th>
                    {activeTab === "executed" && <th>Lokasi Tujuan</th>}
                    <th>Operator</th>
                    <th>Waktu</th>
                    {(activeTab === "pending" || activeTab === "cancelled") && <th>Seri</th>}
                    {activeTab === "executed" && <th>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <React.Fragment key={row.id}>
                      <tr>
                        <td>
                          <div className={`ks-urgency-dot tone-${activeTab === 'executed' ? 'safe' : activeTab === 'pending' ? 'warning' : 'overdue'}`} />
                        </td>
                        <td><strong>#{row.id}</strong></td>
                        <td><strong>{row.sku || "-"}</strong></td>
                        <td className="align-right">{formatNumber(row.qty || 0)} pcs</td>
                        <td>
                          <span className="ks-badge tone-warning">{row.from_slot || "-"}</span>
                        </td>
                        {activeTab === "executed" && (
                          <td>
                            <span className="ks-badge tone-safe">{row.to_slot || "-"}</span>
                          </td>
                        )}
                          <td>{row.creator_name || "-"}</td>
                          <td>{formatDateTime(row.created_at)}</td>
                          {(activeTab === "pending" || activeTab === "cancelled") && (
                            <td>
                              {row.barcodes && row.barcodes.length > 0 ? (
                                <button
                                  type="button"
                                  className="ks-btn"
                                  onClick={() => toggleRowExpansion(row.id)}
                                >
                                  {expandedRowId === row.id ? "Tutup" : "Detail"}
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}
                          {activeTab === "executed" && (
                            <td>
                              {row.notes && row.notes.includes("Sesi:") ? (
                                <button
                                  type="button"
                                  onClick={() => handleRevert(row.id, row.notes)}
                                  disabled={isRevertingId === row.id}
                                  className="ks-btn"
                                  style={{ borderColor: "#f87171", color: "#b91c1c", backgroundColor: "#fef2f2" }}
                                >
                                  {isRevertingId === row.id ? "Membatalkan..." : "Batalkan"}
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                          )}
                        </tr>
                        {/* Expanded details row for barcodes */}
                        {(activeTab === "pending" || activeTab === "cancelled") && expandedRowId === row.id && (
                          <tr className="gudang-ui-expanded-row">
                            <td colSpan={7} style={{ background: "#f8fafc", padding: "12px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <strong style={{ fontSize: "11px", color: "#64748b" }}>
                                  Daftar Barcode / Nomor Seri yang di-scan:
                                </strong>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {row.barcodes.map((b, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        fontSize: "11px",
                                        background: "#fff",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "4px",
                                        padding: "2px 6px",
                                        fontFamily: "monospace",
                                        color: "#334155"
                                      }}
                                    >
                                      {b.serialCode || b.barcode}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
            <p>Tidak ada data mutasi pada filter ini. Ubah tanggal atau kata kunci pencarian untuk melihat data lain.</p>
          </div>
        )}
        </div>
      </section>
    </div>
  );
};

export default HistoryMutasiGudang;
