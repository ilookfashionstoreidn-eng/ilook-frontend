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
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import { GudangStatCard } from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
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
    <GudangProdukBaseShell
      title="History Keluar - Cek Masuk"
      subtitle="Cek apakah produk/seri yang keluar sudah pernah di-scan masuk ke gudang sebelumnya."
      icon={FaHistory}
      statusLabel={
        isInitialLoading
          ? "Memuat data..."
          : isRefreshing
          ? "Memperbarui hasil..."
          : `${formatNumber(summary.total_rows)} aktivitas`
      }
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Cari SKU atau kode seri..."
      headerActions={[
        {
          key: "refresh-history-out-check",
          label: "Refresh",
          icon: FaSync,
          onClick: refreshRows,
        },
      ]}
    >
      <section className="gudang-ui-stat-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <GudangStatCard
          label="Total Barang Keluar"
          value={formatNumber(summary.total_qty || summary.total_rows)}
          helper="Jumlah barang keluar pada filter aktif."
        />
        <GudangStatCard
          label="Sudah Pernah Masuk"
          value={formatNumber(summary.total_entered)}
          helper="Barang keluar yang terdeteksi sudah pernah masuk stok."
          helperColor="text-success"
        />
        <GudangStatCard
          label="Belum Pernah Masuk"
          value={formatNumber(summary.total_not_entered)}
          helper="Barang keluar yang TIDAK terdeteksi masuk stok."
          helperColor="text-danger"
        />
      </section>

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
            <span>Status Masuk</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="entered">Sudah Pernah Masuk</option>
              <option value="not_entered">Belum Pernah Masuk</option>
            </select>
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
            {activeSearch ? (
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
            {formatNumber(pagination.total)} data
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

      <section className="gudang-ui-panel gudang-history-table-panel">
        <div className="gudang-ui-panel-head">
          <div>
            <h2>Tabel Status Keluar-Masuk Barang</h2>
            <p>Data berisi status verifikasi, SKU, nomor seri, asal pengeluaran, waktu keluar, dan waktu masuk.</p>
          </div>
          {isRefreshing ? (
            <span className="gudang-ui-chip gudang-liststok-chip-pending">
              Memperbarui hasil...
            </span>
          ) : null}
        </div>

        {isInitialLoading ? (
          <div className="gudang-ui-empty-panel">Memuat data histori...</div>
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
                            <span
                              className="gudang-history-movement-badge is-in"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                backgroundColor: "rgba(16, 185, 129, 0.15)",
                                color: "#10b981",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontWeight: "600",
                                fontSize: "11px",
                              }}
                            >
                              <FaCheckCircle size={10} /> Sudah Pernah Masuk
                            </span>
                          ) : (
                            <span
                              className="gudang-history-movement-badge is-out"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                backgroundColor: "rgba(239, 68, 68, 0.15)",
                                color: "#ef4444",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontWeight: "600",
                                fontSize: "11px",
                              }}
                            >
                              <FaExclamationCircle size={10} /> Belum Pernah Masuk
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
            </div>

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
              Tidak ada data barang keluar pada filter ini.
            </strong>
            <span>Ubah tanggal, status, atau kata kunci pencarian untuk melihat data lain.</span>
          </div>
        )}
      </section>
    </GudangProdukBaseShell>
  );
};

export default HistoryOutCheckGudang;
