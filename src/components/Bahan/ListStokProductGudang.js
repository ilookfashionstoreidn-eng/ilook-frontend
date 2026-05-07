import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBoxes,
  FaChevronLeft,
  FaChevronRight,
  FaMapMarkedAlt,
  FaSync,
  FaTimes,
  FaWarehouse,
} from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import { GudangStatCard } from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import {
  buildGudangWorkspaceErrorMessage,
  fetchGudangProdukWorkspaceStockList,
} from "./GudangProdukWorkspaceApi";

const EMPTY_SUMMARY = {
  total_rows: 0,
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

const ListStokProductGudang = () => {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);
  const [query, setQuery] = useState({
    page: 1,
    perPage: 50,
    search: "",
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
        const result = await fetchGudangProdukWorkspaceStockList({
          page: query.page,
          per_page: query.perPage,
          search: query.search,
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

  const isInitialLoading = isLoading && !hasLoadedOnce;
  const isRefreshing = isLoading && hasLoadedOnce;
  const hasRows = rows.length > 0;
  const activeSearch = query.search;
  const isSearchDirty = searchInput.trim() !== query.search;
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
      title="List Stok Product"
      subtitle="Lihat ringkasan stok masuk, keluar, sisa, dan lokasi rak aktif untuk semua SKU di gudang produk."
      icon={FaBoxes}
      statusLabel={
        isInitialLoading
          ? "Memuat data..."
          : isRefreshing
          ? "Memperbarui hasil..."
          : `${summary.total_rows} baris stok aktif`
      }
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Cari SKU, nama produk, atau nama gudang..."
      headerActions={[
        {
          key: "refresh-list-stok-product",
          label: "Refresh",
          icon: FaSync,
          onClick: refreshRows,
        },
      ]}
    >
      <section className="gudang-ui-stat-grid">
        <GudangStatCard
          label="SKU Aktif"
          value={formatNumber(summary.total_rows)}
          helper="Baris stok yang masih punya qty sisa."
        />
        <GudangStatCard
          label="Qty Masuk"
          value={formatNumber(summary.total_qty_masuk)}
          helper="Akumulasi qty yang pernah masuk ke lokasi aktif."
        />
        <GudangStatCard
          label="Qty Keluar"
          value={formatNumber(summary.total_qty_keluar)}
          helper="Akumulasi qty yang sudah keluar dari lokasi aktif."
        />
        <GudangStatCard
          label="Qty Sisa"
          value={formatNumber(summary.total_qty_sisa)}
          helper={`${formatNumber(summary.total_locations)} lokasi rak masih terisi.`}
        />
      </section>

      <section className="gudang-ui-panel gudang-liststok-toolbar-panel">
        <div className="gudang-liststok-toolbar">
          <div className="gudang-liststok-toolbar-copy">
            <div className="gudang-liststok-toolbar-kicker">
              <FaWarehouse />
              Panel Operasional
            </div>
            <h2>Cari stok product lebih cepat.</h2>
            <p>
              Gunakan pencarian cepat untuk SKU, nama produk, layout, atau kode rak.
              Hasil lama tetap terlihat saat pencarian atau refresh berjalan supaya fokus
              baca user tidak terputus.
            </p>
          </div>

          <div className="gudang-liststok-toolbar-controls">
            <label className="gudang-liststok-select-field">
              <span>Baris / halaman</span>
              <select value={query.perPage} onChange={handlePerPageChange}>
                {PAGE_SIZE_OPTIONS.map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize} baris
                  </option>
                ))}
              </select>
            </label>

            {activeSearch ? (
              <button
                type="button"
                className="gudang-ui-button-secondary"
                onClick={clearSearch}
              >
                <FaTimes />
                Reset Pencarian
              </button>
            ) : null}
          </div>
        </div>

        <div className="gudang-liststok-meta-row">
          <div className="gudang-ui-chip-row">
            <span className="gudang-ui-chip">
              Menampilkan {formatNumber(resultFrom)}-{formatNumber(resultTo)} dari{" "}
              {formatNumber(pagination.total || summary.total_rows)} baris
            </span>
            <span className="gudang-ui-chip">
              Halaman {formatNumber(pagination.current_page)} /{" "}
              {formatNumber(Math.max(pagination.last_page, 1))}
            </span>
            <span className="gudang-ui-chip">
              <FaMapMarkedAlt style={{ marginRight: 8 }} />
              {formatNumber(summary.total_locations)} lokasi aktif
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

          <div className="gudang-liststok-legend">
            <span className="gudang-liststok-legend-item masuk">Masuk</span>
            <span className="gudang-liststok-legend-item keluar">Keluar</span>
            <span className="gudang-liststok-legend-item sisa">Sisa</span>
          </div>
        </div>

        {error ? (
          <div className="gudang-ui-callout gudang-liststok-callout-error">
            {error}
          </div>
        ) : null}
      </section>

      <section className="gudang-ui-panel gudang-liststok-data-panel">
        <div className="gudang-ui-panel-head">
          <div>
            <h2>Tabel Stok Product</h2>
            <p>
              Susunan kolom dibuat agar angka masuk, keluar, sisa, dan lokasi rak lebih
              mudah dipindai dalam sekali lihat.
            </p>
          </div>
          <div className="gudang-ui-chip-row">
            {isRefreshing ? (
              <span className="gudang-ui-chip gudang-liststok-chip-pending">
                Memperbarui hasil...
              </span>
            ) : (
              <span className="gudang-ui-chip">Siap dibaca</span>
            )}
          </div>
        </div>

        {isInitialLoading ? (
          <div className="gudang-ui-empty-panel">Memuat list stok product...</div>
        ) : hasRows ? (
          <>
            <div className="gudang-liststok-table-stage">
              {isRefreshing ? (
                <div className="gudang-liststok-loading-overlay">
                  Memperbarui data tanpa menutup hasil yang sedang dibaca...
                </div>
              ) : null}

              <div className="gudang-ui-table-shell gudang-liststok-table-shell">
              <table className="gudang-ui-table gudang-liststok-table">
                <colgroup>
                  <col className="gudang-liststok-col-order" />
                  <col className="gudang-liststok-col-sku" />
                  <col className="gudang-liststok-col-qty" />
                  <col className="gudang-liststok-col-qty" />
                  <col className="gudang-liststok-col-qty" />
                  <col className="gudang-liststok-col-location" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="gudang-liststok-head-center">No</th>
                    <th>SKU</th>
                    <th className="gudang-liststok-head-qty">QTY Masuk</th>
                    <th className="gudang-liststok-head-qty">Qty Keluar</th>
                    <th className="gudang-liststok-head-qty">Qty Sisa</th>
                    <th>Nama Gudang</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id}>
                      <td className="gudang-liststok-order-cell">
                        {formatNumber(row.rowNumber)}
                      </td>
                      <td>
                        <div className="gudang-liststok-sku">
                          <span className="gudang-liststok-sku-code">
                            {highlightText(row.sku, activeSearch)}
                          </span>
                         
                        </div>
                      </td>
                      <td className="gudang-liststok-qty-cell">
                        <span className="gudang-liststok-qty masuk">
                          {formatNumber(row.qtyMasuk)}
                        </span>
                      </td>
                      <td className="gudang-liststok-qty-cell">
                        <span className="gudang-liststok-qty keluar">
                          {formatNumber(row.qtyKeluar)}
                        </span>
                      </td>
                      <td className="gudang-liststok-qty-cell">
                        <span className="gudang-liststok-qty sisa">
                          {formatNumber(row.qtySisa)}
                        </span>
                      </td>
                      <td>
                        <div className="gudang-liststok-location-stack">
                          <span className="gudang-ui-pill gudang-liststok-location">
                            {highlightText(row.namaGudang, activeSearch)}
                          </span>
                        </div>
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
                  Menampilkan{" "}
                  <strong>
                    {formatNumber((pagination.current_page - 1) * pagination.per_page + 1)}
                  </strong>{" "}
                  sampai{" "}
                  <strong>
                    {formatNumber(
                      Math.min(
                        pagination.current_page * pagination.per_page,
                        pagination.total
                      )
                    )}
                  </strong>{" "}
                  dari <strong>{formatNumber(pagination.total)}</strong> baris.
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
              Tidak ada stok product yang cocok.
            </strong>
            <span style={{ display: "block", marginBottom: 16 }}>
              Coba ganti kata kunci pencarian atau reset filter pencarian yang sedang aktif.
            </span>
            {activeSearch ? (
              <button
                type="button"
                className="gudang-ui-button-secondary"
                onClick={clearSearch}
              >
                <FaTimes />
                Tampilkan Semua Data
              </button>
            ) : null}
          </div>
        )}
      </section>
    </GudangProdukBaseShell>
  );
};

export default ListStokProductGudang;
