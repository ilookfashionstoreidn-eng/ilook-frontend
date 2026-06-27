import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import {
  FiSearch,
  FiPrinter,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import { fetchOpnameHistory } from "./GudangProdukWorkspaceApi";

const EMPTY_PAGINATION = {
  current_page: 1,
  per_page: 50,
  total: 0,
  last_page: 1,
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString("id-ID") : "0";
};

const RiwayatStokOpnameGudang = () => {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);
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
        const result = await fetchOpnameHistory({
          page: query.page,
          per_page: query.perPage,
          search: query.search,
          start_date: query.startDate,
          end_date: query.endDate,
        });

        if (ignore) {
          return;
        }

        setRows(result.data);
        setPagination(result.pagination);
        setError("");
        setHasLoadedOnce(true);
      } catch (fetchError) {
        if (ignore) {
          return;
        }

        if (!hasLoadedOnce) {
          setRows([]);
          setPagination({
            ...EMPTY_PAGINATION,
            current_page: query.page,
            per_page: query.perPage,
          });
        }

        setError(fetchError?.response?.data?.message || fetchError.message || "Gagal memuat riwayat stok opname.");
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

  const handlePrint = () => {
    window.print();
  };

  const isInitialLoading = isLoading && !hasLoadedOnce;
  const hasRows = rows.length > 0;

  return (
    <div className="ks-page" id="print-area">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
            .ks-toolbar, .ks-header-actions, .ks-statrail, .ks-footer { display: none !important; }
            .ks-grid-scroll { overflow: visible !important; max-height: none !important; }
            .ks-header-sub { color: #000; }
          }
        `}
      </style>
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Riwayat Stok Opname</h1>
          <span className="ks-header-sub">Melihat histori perhitungan fisik stok gudang.</span>
        </div>
        <div className="ks-header-actions">
          <button type="button" className="ks-btn" onClick={handlePrint}>
            <FiPrinter size={13} /> Cetak (Print)
          </button>
        </div>
      </header>

      <section className="ks-board">
        <div className="ks-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="ks-search" style={{ flex: '1 1 300px' }}>
            <FiSearch className="ks-search-icon" size={14} />
            <input
              type="text"
              placeholder="Cari No. Opname, PIC, Lokasi..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>

          <label className="ks-search" style={{ flex: '0 0 auto', width: 'auto' }}>
            <span style={{ fontSize: '12px', color: '#64748b', marginRight: '5px' }}>Mulai:</span>
            <input
              type="date"
              value={query.startDate}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => {
                  setQuery(c => ({ ...c, startDate: val, page: 1 }));
                });
              }}
              style={{ border: 'none', outline: 'none', background: 'transparent' }}
            />
          </label>

          <label className="ks-search" style={{ flex: '0 0 auto', width: 'auto' }}>
            <span style={{ fontSize: '12px', color: '#64748b', marginRight: '5px' }}>Sampai:</span>
            <input
              type="date"
              value={query.endDate}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => {
                  setQuery(c => ({ ...c, endDate: val, page: 1 }));
                });
              }}
              style={{ border: 'none', outline: 'none', background: 'transparent' }}
            />
          </label>
        </div>

        {error && (
          <div className="ks-empty" style={{ color: '#ef4444', padding: '10px' }}>
            {error}
          </div>
        )}

        <div className="ks-grid-scroll">
          {isInitialLoading ? (
            <div className="ks-empty">
              <FiRefreshCw className="is-spinning" size={20} />
              <p>Memuat riwayat stok opname...</p>
            </div>
          ) : hasRows ? (
            <>
              <table className="ks-grid">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>No. Opname</th>
                    <th>Tanggal</th>
                    <th>PIC</th>
                    <th>Lokasi</th>
                    <th>SKU</th>
                    <th className="align-right">Total SKU</th>
                    <th className="align-right">Qty Sistem</th>
                    <th className="align-right">Qty Fisik</th>
                    <th className="align-right">Selisih</th>
                    <th className="align-right">Stok Saat Ini</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows].sort((a, b) => b.selisih - a.selisih).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className={`ks-urgency-dot tone-${row.status === 'Selesai' ? 'safe' : 'warning'}`} />
                      </td>
                      <td><strong>{row.opname_number}</strong></td>
                      <td>{formatDateTime(row.tanggal)}</td>
                      <td>{row.pic}</td>
                      <td>{row.lokasi}</td>
                      <td>{row.sku || '-'}</td>
                      <td className="align-right">{formatNumber(row.total_sku)}</td>
                      <td className="align-right">{formatNumber(row.total_qty_sistem)}</td>
                      <td className="align-right">
                        <strong>{formatNumber(row.total_qty_fisik)}</strong>
                      </td>
                      <td className="align-right">
                        <span
                          style={{
                            color: row.selisih > 0 ? '#10b981' : row.selisih < 0 ? '#ef4444' : '#6b7280',
                            fontWeight: row.selisih !== 0 ? 'bold' : 'normal'
                          }}
                        >
                          {row.selisih > 0 ? '+' : ''}{row.selisih}
                        </span>
                      </td>
                      <td className="align-right">{formatNumber(row.stok_saat_ini)}</td>
                      <td>
                        <span className={`ks-badge tone-${row.status === 'Selesai' ? 'safe' : 'warning'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

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
            <div className="ks-empty" style={{ padding: '40px' }}>
              <FiSearch size={20} style={{ marginBottom: '10px', color: '#94a3b8' }} />
              <p>Tidak ada hasil riwayat stok opname.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RiwayatStokOpnameGudang;
