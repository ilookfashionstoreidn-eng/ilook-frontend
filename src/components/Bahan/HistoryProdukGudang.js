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
} from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import { GudangStatCard } from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import {
  buildGudangWorkspaceErrorMessage,
  fetchGudangProdukHistory,
} from "./GudangProdukWorkspaceApi";

const EMPTY_SUMMARY = {
  total_rows: 0,
  total_qty: 0,
  total_qty_masuk: 0,
  total_qty_keluar: 0,
  total_sku: 0,
  total_seri: 0,
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

const HistoryProdukGudang = () => {
  const today = getToday();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [singleDate, setSingleDate] = useState(today);
  const [movementType, setMovementType] = useState("");
  const [source, setSource] = useState("");
  const [query, setQuery] = useState({
    page: 1,
    perPage: 50,
    search: "",
    startDate: today,
    endDate: today,
    movementType: "",
    source: "",
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

  useEffect(() => {
    let ignore = false;

    const loadRows = async () => {
      setIsLoading(true);

      try {
        const result = await fetchGudangProdukHistory({
          page: query.page,
          per_page: query.perPage,
          search: query.search,
          start_date: query.startDate,
          end_date: query.endDate,
          movement_type: query.movementType,
          source: query.source,
        });

        if (ignore) {
          return;
        }

        setRows(result.data);
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
            "Gagal memuat history produk."
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
        movementType,
        source,
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
      title="History Produk"
      subtitle="Riwayat barang masuk dan barang keluar dari gudang produk."
      icon={FaHistory}
      statusLabel={
        isInitialLoading
          ? "Memuat data..."
          : isRefreshing
          ? "Memperbarui hasil..."
          : `${formatNumber(summary.total_qty || summary.total_rows)} aktivitas`
      }
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Cari SKU atau kode seri..."
      headerActions={[
        {
          key: "refresh-history-produk",
          label: "Refresh",
          icon: FaSync,
          onClick: refreshRows,
        },
      ]}
    >
      <section className="gudang-ui-stat-grid">
        <GudangStatCard
          label="Barang Masuk"
          value={formatNumber(summary.total_qty_masuk)}
          helper="Total qty masuk pada filter aktif."
        />
        <GudangStatCard
          label="Barang Keluar"
          value={formatNumber(summary.total_qty_keluar)}
          helper="Total qty keluar pada filter aktif."
        />
        <GudangStatCard
          label="SKU Berbeda"
          value={formatNumber(summary.total_sku)}
          helper="Jumlah SKU berbeda yang keluar."
        />
        <GudangStatCard
          label="Kode Seri Berbeda"
          value={formatNumber(summary.total_seri)}
          helper="Jumlah kode seri berbeda."
        />
      </section>

      <section className="gudang-ui-panel gudang-history-filter-panel">
        <div 
          className="gudang-history-filter-grid" 
          style={{ gridTemplateColumns: "minmax(260px, 1.2fr) minmax(130px, 1fr) minmax(130px, 1fr) minmax(160px, 1.2fr) minmax(120px, 0.8fr) auto" }}
        >
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
            <span>Jenis</span>
            <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
              <option value="">Semua Jenis</option>
              <option value="in">Barang Masuk</option>
              <option value="out">Barang Keluar</option>
            </select>
          </label>

          <label className="gudang-history-date-field">
            <span>Sumber</span>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Semua Sumber</option>
              <option value="Packing Normal">Packing Normal</option>
              <option value="Packing Random">Packing Random</option>
              <option value="Packing Pendingan">Packing Pendingan</option>
              <option value="Produk Belum Barcode">Produk Belum Barcode</option>
              <option value="No Data Ginee">No Data Ginee</option>
              <option value="Inject Data">Inject Data</option>
              <option value="Barang Masuk Gudang">Barang Masuk Gudang</option>
              <option value="Mutasi/Koreksi Keluar">Mutasi/Koreksi Keluar</option>
              <option value="Stok Opname Masuk">Stok Opname Masuk</option>
              <option value="Stok Opname Keluar">Stok Opname Keluar</option>
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

      <section className="gudang-ui-panel gudang-history-table-panel">
        <div className="gudang-ui-panel-head">
          <div>
            <h2>Tabel History Produk</h2>
            <p>Data berisi arah pergerakan, SKU, qty, kode seri/catatan, dan waktu aktivitas.</p>
          </div>
          {isRefreshing ? (
            <span className="gudang-ui-chip gudang-liststok-chip-pending">
              Memperbarui hasil...
            </span>
          ) : null}
        </div>

        {isInitialLoading ? (
          <div className="gudang-ui-empty-panel">Memuat history produk...</div>
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
                      <th>Jenis</th>
                      <th>SKU</th>
                      <th>Qty</th>
                      <th>Kode Seri / Catatan</th>
                      <th>Sumber</th>
                      <th>User Input</th>
                      <th>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <span
                            className={`gudang-history-movement-badge ${
                              row.movementType === "in" ? "is-in" : "is-out"
                            }`}
                          >
                            {row.movementLabel ||
                              (row.movementType === "in"
                                ? "Barang Masuk"
                                : "Barang Keluar")}
                          </span>
                        </td>
                        <td>
                          <strong>{row.sku || "-"}</strong>
                        </td>
                        <td>{formatNumber(row.qty || 0)}</td>
                        <td>{row.kodeSeri || "-"}</td>
                        <td>{row.sourceLabel || "-"}</td>
                        <td>{row.scannerName || "-"}</td>
                        <td>{formatDateTime(row.happenedAt || row.keluarPada)}</td>
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
              Tidak ada history produk pada filter ini.
            </strong>
            <span>Ubah tanggal atau kata kunci pencarian untuk melihat data lain.</span>
          </div>
        )}
      </section>
    </GudangProdukBaseShell>
  );
};

export default HistoryProdukGudang;
