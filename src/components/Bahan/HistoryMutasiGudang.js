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
import "./GudangProdukWorkspace.css";
import { GudangStatCard } from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
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
    <GudangProdukBaseShell
      title="History Mutasi Gudang"
      subtitle="Riwayat perpindahan stok antar lokasi/rak dan daftar antrean mutasi."
      icon={FaExchangeAlt}
      statusLabel={
        isInitialLoading
          ? "Memuat data..."
          : isRefreshing
          ? "Memperbarui hasil..."
          : `${formatNumber(summary.total_rows)} transaksi`
      }
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Cari SKU atau lokasi..."
      headerActions={[
        {
          key: "refresh-history-mutasi",
          label: "Refresh",
          icon: FaSync,
          onClick: refreshRows,
        },
      ]}
    >
      {/* Stat Panel */}
      <section className="gudang-ui-stat-grid">
        <GudangStatCard
          label="Total Transaksi"
          value={formatNumber(summary.total_rows)}
          helper="Jumlah pencatatan mutasi pada filter aktif."
        />
        <GudangStatCard
          label="Total Qty Mutasi"
          value={formatNumber(summary.total_qty)}
          helper="Akumulasi quantity produk yang dimutasi."
        />
      </section>

      {/* Tabs Selector */}
      <div 
        style={{ 
          display: "flex", 
          gap: "8px", 
          borderBottom: "1px solid #e2e8f0", 
          paddingBottom: "8px",
          marginBottom: "16px"
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("executed");
            setRows([]);
            setHasLoadedOnce(false);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: activeTab === "executed" ? "#2458ce" : "transparent",
            color: activeTab === "executed" ? "#fff" : "#64748b",
            fontWeight: "600",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
        >
          <FaExchangeAlt size={12} />
          Riwayat Mutasi
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("pending");
            setRows([]);
            setHasLoadedOnce(false);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: activeTab === "pending" ? "#2458ce" : "transparent",
            color: activeTab === "pending" ? "#fff" : "#64748b",
            fontWeight: "600",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
        >
          <FaHourglassHalf size={12} />
          Belum Dieksekusi
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("cancelled");
            setRows([]);
            setHasLoadedOnce(false);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: activeTab === "cancelled" ? "#2458ce" : "transparent",
            color: activeTab === "cancelled" ? "#fff" : "#64748b",
            fontWeight: "600",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s"
          }}
        >
          <FaBan size={12} />
          Dibatalkan
        </button>
      </div>

      {/* Filter Toolbar */}
      <section className="gudang-ui-panel gudang-history-filter-panel">
        <div className="gudang-history-filter-grid">
          <label className="gudang-history-date-field">
            <span>Range Tanggal</span>
            <div className="gudang-history-date-range">
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                onClick={openDatePicker}
                onFocus={openDatePicker}
              />
              <span>-</span>
              <input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                onClick={openDatePicker}
                onFocus={openDatePicker}
              />
            </div>
          </label>

          <label className="gudang-history-date-field">
            <span>1 Tanggal</span>
            <input
              type="date"
              value={singleDate}
              onChange={handleSingleDateChange}
              onClick={openDatePicker}
              onFocus={openDatePicker}
            />
          </label>

          <label className="gudang-history-date-field">
            <span>Baris / halaman</span>
            <select value={query.perPage} onChange={handlePerPageChange}>
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} baris
                </option>
              ))}
            </select>
          </label>

          <div className="gudang-history-filter-actions">
            {activeSearch || startDate || endDate ? (
              <button
                type="button"
                className="gudang-ui-button-secondary"
                onClick={clearSearch}
              >
                <FaTimes />
                Reset
              </button>
            ) : null}
            <button
              type="button"
              className="gudang-ui-header-action primary"
              onClick={applyFilter}
            >
              <FaQrcode />
              Tampilkan
            </button>
          </div>
        </div>

        <div className="gudang-ui-chip-row gudang-history-meta-row">
          <span className="gudang-ui-chip">
            Menampilkan {formatNumber(resultFrom)}-{formatNumber(resultTo)} dari{" "}
            {formatNumber(pagination.total || summary.total_rows)} data
          </span>
          <span className="gudang-ui-chip">
            Halaman {formatNumber(pagination.current_page)} /{" "}
            {formatNumber(Math.max(pagination.last_page, 1))}
          </span>
          {activeSearch ? (
            <span className="gudang-ui-chip gudang-liststok-chip-active">
              Pencarian aktif: "{activeSearch}"
            </span>
          ) : null}
          {isSearchDirty ? (
            <span className="gudang-ui-chip gudang-liststok-chip-pending">
              Menyiapkan pencarian...
            </span>
          ) : null}
        </div>

        {error ? (
          <div className="gudang-ui-callout gudang-liststok-callout-error">
            {error}
          </div>
        ) : null}
      </section>

      {/* Table Section */}
      <section className="gudang-ui-panel gudang-history-table-panel">
        <div className="gudang-ui-panel-head">
          <div>
            <h2>
              {activeTab === "executed"
                ? "Tabel Riwayat Mutasi"
                : activeTab === "pending"
                ? "Tabel Sesi Belum Dieksekusi"
                : "Tabel Sesi Dibatalkan"}
            </h2>
            <p>
              {activeTab === "executed"
                ? "Daftar mutasi produk yang telah sukses dipindahkan antar rak."
                : activeTab === "pending"
                ? "Daftar antrean pemindahan produk yang belum diselesaikan lokasinya."
                : "Daftar sesi scan mutasi yang telah dibatalkan."}
            </p>
          </div>
          {isRefreshing ? (
            <span className="gudang-ui-chip gudang-liststok-chip-pending">
              Memperbarui hasil...
            </span>
          ) : null}
        </div>

        {isInitialLoading ? (
          <div className="gudang-ui-empty-panel">Memuat data mutasi...</div>
        ) : hasRows ? (
          <>
            <div className="gudang-history-table-stage">
              {isRefreshing ? (
                <div className="gudang-liststok-loading-overlay">
                  Memperbarui data tanpa menutup hasil yang sedang dibaca...
                </div>
              ) : null}

              <div className="gudang-ui-table-shell">
                <table className="gudang-ui-table gudang-history-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>SKU</th>
                      <th>Qty</th>
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
                            <strong>#{row.id}</strong>
                          </td>
                          <td>
                            <strong>{row.sku || "-"}</strong>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                background: "#eff6ff",
                                color: "#1e40af",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: "800",
                                fontSize: "11px"
                              }}
                            >
                              {formatNumber(row.qty || 0)} pcs
                            </span>
                          </td>
                          <td>
                            <span className="gudang-ui-pill" style={{ background: "#fee2e2", color: "#991b1b" }}>
                              {row.from_slot || "-"}
                            </span>
                          </td>
                          {activeTab === "executed" && (
                            <td>
                              <span className="gudang-ui-pill" style={{ background: "#dcfce7", color: "#166534" }}>
                                {row.to_slot || "-"}
                              </span>
                            </td>
                          )}
                          <td>{row.creator_name || "-"}</td>
                          <td>{formatDateTime(row.created_at)}</td>
                          {(activeTab === "pending" || activeTab === "cancelled") && (
                            <td>
                              {row.barcodes && row.barcodes.length > 0 ? (
                                <button
                                  type="button"
                                  className="liststok-detail-btn"
                                  onClick={() => toggleRowExpansion(row.id)}
                                  style={{ padding: "4px 8px", fontSize: "11px" }}
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
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "11px",
                                    background: "#fee2e2",
                                    color: "#991b1b",
                                    border: "1px solid #f87171",
                                    borderRadius: "4px",
                                    cursor: isRevertingId === row.id ? "not-allowed" : "pointer",
                                    opacity: isRevertingId === row.id ? 0.6 : 1
                                  }}
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
            </div>

            {/* Pagination */}
            {pagination.last_page > 1 ? (
              <div className="gudang-liststok-pagination">
                <div className="gudang-liststok-pagination-info">
                  Menampilkan <strong>{formatNumber(resultFrom)}</strong> sampai{" "}
                  <strong>{formatNumber(resultTo)}</strong> dari{" "}
                  <strong>{formatNumber(pagination.total)}</strong> data.
                </div>

                <div className="gudang-liststok-pagination-actions">
                  <button
                    type="button"
                    className="gudang-ui-button-secondary"
                    onClick={() => goToPage(pagination.current_page - 1)}
                    disabled={pagination.current_page <= 1}
                  >
                    <FaChevronLeft />
                    Sebelumnya
                  </button>
                  <span className="gudang-ui-chip">
                    Halaman {formatNumber(pagination.current_page)} /{" "}
                    {formatNumber(pagination.last_page)}
                  </span>
                  <button
                    type="button"
                    className="gudang-ui-button-secondary"
                    onClick={() => goToPage(pagination.current_page + 1)}
                    disabled={pagination.current_page >= pagination.last_page}
                  >
                    Berikutnya
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="gudang-ui-empty-panel">
            <strong style={{ display: "block", marginBottom: 8 }}>
              Tidak ada data mutasi pada filter ini.
            </strong>
            <span>Ubah tanggal atau kata kunci pencarian untuk melihat data lain.</span>
          </div>
        )}
      </section>
    </GudangProdukBaseShell>
  );
};

export default HistoryMutasiGudang;
