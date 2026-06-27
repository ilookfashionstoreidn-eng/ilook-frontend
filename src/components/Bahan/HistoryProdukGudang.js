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
  FiFilter
} from "react-icons/fi";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
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
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Riwayat Produk</h1>
          <span className="ks-header-sub">Riwayat barang masuk dan barang keluar dari gudang produk.</span>
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
          <span className="ks-stat-label">Barang Masuk</span>
          <span className="ks-stat-value">{formatNumber(summary.total_qty_masuk)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Barang Keluar</span>
          <span className="ks-stat-value">{formatNumber(summary.total_qty_keluar)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">SKU Berbeda</span>
          <span className="ks-stat-value">{formatNumber(summary.total_sku)}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Kode Seri Berbeda</span>
          <span className="ks-stat-value">{formatNumber(summary.total_seri)}</span>
        </div>
      </div>

      <section className="ks-board">
        <div className="ks-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="ks-search" style={{ flex: '1 1 250px' }}>
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
            <span style={{ fontSize: '13px', color: '#64748b' }}>Jenis:</span>
            <select value={movementType} onChange={(e) => setMovementType(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}>
              <option value="">Semua Jenis</option>
              <option value="in">Barang Masuk</option>
              <option value="out">Barang Keluar</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Sumber:</span>
            <select value={source} onChange={(e) => setSource(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}>
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
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             <button type="button" className="ks-btn is-primary" onClick={applyFilter}>
               <FiFilter size={13} /> Tampilkan
             </button>
             {(activeSearch || startDate || endDate || movementType || source) && (
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
            <p>Memuat history produk...</p>
          </div>
        ) : hasRows ? (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="ks-grid">
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
                          <span className={`ks-badge tone-${row.movementType === 'in' ? 'safe' : 'warning'}`}>
                            {row.movementLabel || (row.movementType === "in" ? "Barang Masuk" : "Barang Keluar")}
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
            <p>Tidak ada history produk pada filter ini. Ubah tanggal atau kata kunci pencarian untuk melihat data lain.</p>
          </div>
        )}
        </div>
      </section>
    </div>
  );
};

export default HistoryProdukGudang;
