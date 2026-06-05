import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaFilePdf,
  FaQrcode,
  FaSync,
  FaTimes,
} from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import { GudangStatCard } from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import {
  buildGudangWorkspaceErrorMessage,
  fetchGudangProdukStokAwalHistory,
} from "./GudangProdukWorkspaceApi";

const EMPTY_SUMMARY = {
  total_rows: 0,
  total_qty: 0,
  total_sku: 0,
  total_seri: 0,
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

const formatDateForFile = (value) => String(value || "").replace(/[^0-9]/g, "") || "semua";

const formatSeriSummaryForPdf = (value) => {
  const serialGroups = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((groups, serial) => {
      const baseSerial = serial.split(".")[0]?.trim() || serial;
      groups.set(baseSerial, (groups.get(baseSerial) || 0) + 1);
      return groups;
    }, new Map());

  if (serialGroups.size === 0) {
    return "-";
  }

  return Array.from(serialGroups.entries())
    .map(([serial, count]) => `${serial} Qty ${count}`)
    .join("\n");
};

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const HistoryStokAwalGudang = () => {
  const today = getToday();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [singleDate, setSingleDate] = useState(today);
  const [query, setQuery] = useState({
    page: 1,
    perPage: 50,
    search: "",
    startDate: today,
    endDate: today,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
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
        const result = await fetchGudangProdukStokAwalHistory({
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
            "Gagal memuat history stok awal."
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

  const fetchAllExportRows = async () => {
    const perPage = 200;
    let page = 1;
    let lastPage = 1;
    const exportRows = [];

    do {
      const result = await fetchGudangProdukStokAwalHistory({
        page,
        per_page: perPage,
        search: query.search,
        start_date: query.startDate,
        end_date: query.endDate,
      });

      exportRows.push(...result.data);
      lastPage = Math.max(Number(result.pagination?.last_page) || 1, 1);
      page += 1;
    } while (page <= lastPage);

    return exportRows;
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const exportRows = await fetchAllExportRows();
      const generatedAt = new Date().toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const totalQty = exportRows.reduce((total, row) => total + (Number(row.qty) || 0), 0);
      const doc = new jsPDF("portrait", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 10;
      const fileStart = formatDateForFile(query.startDate);
      const fileEnd = formatDateForFile(query.endDate);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text("History Stok Awal Gudang Produk", marginX, 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tanggal: ${query.startDate || "-"} s/d ${query.endDate || "-"}`, marginX, 19);
      doc.text(`Search: ${query.search || "-"} | Export: ${generatedAt}`, marginX, 24);
      doc.text(
        `Total baris: ${formatNumber(exportRows.length)} | Total qty: ${formatNumber(totalQty)}`,
        marginX,
        29
      );

      doc.autoTable({
        startY: 35,
        head: [["No", "TGL", "SKU", "SERI", "Lokasi", "QTY Produk Awal", "Qty Produk Masuk"]],
        body:
          exportRows.length > 0
            ? exportRows.map((row, index) => [
                index + 1,
                formatDateTime(row.tgl),
                row.sku || "-",
                formatSeriSummaryForPdf(row.seri),
                row.lokasi || "-",
                formatNumber(row.qty),
                "",
              ])
            : [["-", "-", "Tidak ada data", "-", "-", "-", "-"]],
        theme: "grid",
        margin: { left: marginX, right: marginX, top: 12, bottom: 12 },
        styles: {
          fontSize: 6.5,
          cellPadding: 2,
          overflow: "linebreak",
          valign: "middle",
          textColor: [15, 23, 42],
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [36, 88, 206],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 27 },
          2: { cellWidth: 38 },
          3: { cellWidth: 38 },
          4: { cellWidth: pageWidth - marginX * 2 - 159 },
          5: { cellWidth: 23, halign: "center" },
          6: { cellWidth: 23, halign: "center" },
        },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.getHeight();
          const pageNumber = doc.internal.getNumberOfPages();

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(`Halaman ${pageNumber}`, pageWidth - marginX, pageHeight - 6, {
            align: "right",
          });
        },
      });

      doc.save(`history-stok-awal-${fileStart}-${fileEnd}.pdf`);
    } catch (exportError) {
      setError(
        buildGudangWorkspaceErrorMessage(
          exportError,
          "Gagal export PDF history stok awal."
        )
      );
    } finally {
      setIsExportingPdf(false);
    }
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
      title="History Stok Awal"
      subtitle="Riwayat input stok awal gudang produk berdasarkan tanggal, SKU, seri, qty, dan lokasi."
      icon={FaClipboardList}
      statusLabel={
        isInitialLoading
          ? "Memuat data..."
          : isRefreshing
          ? "Memperbarui hasil..."
          : `${formatNumber(summary.total_rows)} baris stok awal`
      }
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="Cari SKU, seri, atau lokasi..."
      headerActions={[
        {
          key: "refresh-history-stok-awal",
          label: "Refresh",
          icon: FaSync,
          onClick: refreshRows,
        },
        {
          key: "export-history-stok-awal-pdf",
          label: isExportingPdf ? "Menyiapkan PDF..." : "Export PDF",
          icon: FaFilePdf,
          onClick: handleExportPdf,
          disabled: isExportingPdf || isInitialLoading,
        },
      ]}
    >
      <section className="gudang-ui-stat-grid">
        <GudangStatCard
          label="Total Baris"
          value={formatNumber(summary.total_rows)}
          helper="Jumlah input stok awal pada filter aktif."
        />
        <GudangStatCard
          label="Total Qty"
          value={formatNumber(summary.total_qty)}
          helper="Akumulasi qty stok awal pada filter aktif."
        />
        <GudangStatCard
          label="SKU Berbeda"
          value={formatNumber(summary.total_sku)}
          helper="Jumlah SKU berbeda yang masuk stok awal."
        />
        <GudangStatCard
          label="Lokasi"
          value={formatNumber(summary.total_locations)}
          helper={`${formatNumber(summary.total_seri)} seri tercatat.`}
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
            <h2>Tabel History Stok Awal</h2>
            <p>Kolom utama mengikuti format TGL, SKU, SERI, QTY, dan lokasi rak.</p>
          </div>
          {isRefreshing ? (
            <span className="gudang-ui-chip gudang-liststok-chip-pending">
              Memperbarui hasil...
            </span>
          ) : null}
        </div>

        {isInitialLoading ? (
          <div className="gudang-ui-empty-panel">Memuat history stok awal...</div>
        ) : hasRows ? (
          <>
            <div className="gudang-history-table-stage">
              {isRefreshing ? (
                <div className="gudang-liststok-loading-overlay">
                  Memperbarui data tanpa menutup hasil yang sedang dibaca...
                </div>
              ) : null}

              <div className="gudang-ui-table-shell">
                <table className="gudang-ui-table gudang-history-table gudang-stok-awal-history-table">
                  <thead>
                    <tr>
                      <th>TGL</th>
                      <th>SKU</th>
                      <th>SERI</th>
                      <th>QTY</th>
                      <th>Lokasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDateTime(row.tgl)}</td>
                        <td>
                          <strong>{highlightText(row.sku, activeSearch)}</strong>
                        </td>
                        <td>{highlightText(row.seri, activeSearch)}</td>
                        <td className="gudang-liststok-qty-cell">
                          <span className="gudang-liststok-qty sisa">
                            {formatNumber(row.qty)}
                          </span>
                        </td>
                        <td>
                          <span className="gudang-ui-pill gudang-liststok-location">
                            {highlightText(row.lokasi, activeSearch)}
                          </span>
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
              Tidak ada history stok awal pada filter ini.
            </strong>
            <span>Ubah tanggal atau kata kunci pencarian untuk melihat data lain.</span>
          </div>
        )}
      </section>
    </GudangProdukBaseShell>
  );
};

export default HistoryStokAwalGudang;
