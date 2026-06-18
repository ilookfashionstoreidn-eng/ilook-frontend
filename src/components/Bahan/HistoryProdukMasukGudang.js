import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
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
  FaTrash,
  FaFilePdf,
  FaFileExcel,
} from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import { GudangStatCard } from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import {
  buildGudangWorkspaceErrorMessage,
  fetchGudangProdukHistory,
} from "./GudangProdukWorkspaceApi";
import API from "../../api";

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

const formatDateForFile = (value) => String(value || "").replace(/[^0-9]/g, "") || "semua";

const formatBaseKodeSeri = (val) => {
  let str = String(val || "").trim();
  str = str.replace(/^Scan produk masuk\s*\|\s*Kode seri:\s*/i, "").trim();
  str = str.replace(/\.\d+$/, "");
  return str || "-";
};

const HistoryProdukMasukGudang = () => {
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
  const [error, setError] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [viewMode, setViewMode] = useState("detail");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [allSummaryRows, setAllSummaryRows] = useState([]);
  const [summaryFilterHash, setSummaryFilterHash] = useState("");

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
      const result = await fetchGudangProdukHistory({
        page: query.page,
        per_page: query.perPage,
        search: query.search,
        start_date: query.startDate,
        end_date: query.endDate,
        movement_type: "in",
      });

      setRows(result.data);
      setSummary(result.summary);
      setPagination(result.pagination);
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
          "Gagal memuat history produk."
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

  const handleDeleteItem = async (row) => {
    if (!row.id.startsWith("activity-")) {
      alert("Hanya data history barang masuk dari gudang produk yang dapat dihapus.");
      return;
    }

    const activityId = row.id.replace("activity-", "");

    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus data history ini? Stok gudang untuk SKU "${row.sku}" dengan nomor seri tersebut akan disesuaikan.`
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      await API.post("/gudang-produk-workspace/delete-scan-produk", {
        activity_id: activityId,
      });

      alert("Data scan history berhasil dihapus.");
      loadRows();
    } catch (err) {
      console.error("Gagal menghapus log history", err);
      const errMsg = err.response?.data?.message || "Gagal menghapus log history.";
      alert(errMsg);
      setIsLoading(false);
    }
  };

  const fetchAllExportRows = async () => {
    const perPage = 200;
    let page = 1;
    let lastPage = 1;
    const exportRows = [];

    do {
      const result = await fetchGudangProdukHistory({
        page,
        per_page: perPage,
        search: query.search,
        start_date: query.startDate,
        end_date: query.endDate,
        movement_type: "in",
      });

      exportRows.push(...result.data);
      lastPage = Math.max(Number(result.pagination?.last_page) || 1, 1);
      page += 1;
    } while (page <= lastPage);

    return exportRows;
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);

    try {
      const exportRows = await fetchAllExportRows();
      const generatedAt = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const doc = new jsPDF("portrait", "mm", "a4");
      const marginX = 10;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text("History Produk Masuk Gudang", marginX, 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tanggal: ${query.startDate || "-"} s/d ${query.endDate || "-"}`, marginX, 19);
      doc.text(`Search: ${query.search || "-"} | Export: ${generatedAt}`, marginX, 24);

      const groupedMap = new Map();
      exportRows.forEach(row => {
        const dateObj = new Date(row.happenedAt || row.keluarPada);
        const dateStr = Number.isNaN(dateObj.getTime()) ? (row.happenedAt || row.keluarPada || "-") : dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
        const sku = row.sku || "-";
        const key = `${dateStr}___${sku}`;
        
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            tgl: dateStr,
            sku: sku,
            qty: 0,
            seriMap: new Map(),
            sumberSet: new Set(),
            tujuanSet: new Set()
          });
        }
        
        const group = groupedMap.get(key);
        const rowQty = Number(row.qty) || 0;
        group.qty += rowQty;
        
        const rawSerials = String(row.kodeSeri || "-").split(",").map(s => formatBaseKodeSeri(s)).filter(Boolean);
        if (rawSerials.length > 1 && rawSerials.length === rowQty) {
            rawSerials.forEach(s => {
                group.seriMap.set(s, (group.seriMap.get(s) || 0) + 1);
            });
        } else {
            const s = formatBaseKodeSeri(row.kodeSeri);
            if (s && s !== "-") {
              group.seriMap.set(s, (group.seriMap.get(s) || 0) + rowQty);
            }
        }

        if (row.sourceLabel) {
           group.sumberSet.add(row.sourceLabel);
        }
        if (row.destinationLabel) {
           group.tujuanSet.add(row.destinationLabel);
        }
      });

      const groupedRows = Array.from(groupedMap.values());
      const totalQty = groupedRows.reduce((total, g) => total + g.qty, 0);
      
      doc.text(`Total baris unik: ${formatNumber(groupedRows.length)} | Total qty: ${formatNumber(totalQty)}`, marginX, 29);

      const pdfBody = groupedRows.length > 0 ? groupedRows.map((g, index) => {
        const seriText = Array.from(g.seriMap.entries()).map(([s, count]) => `${s} (Qty ${count})`).join("\n");
        const sumberText = Array.from(g.sumberSet).join(", ") || "-";
        const tujuanText = Array.from(g.tujuanSet).join(", ") || "-";
        
        return [
          index + 1,
          g.tgl,
          g.sku,
          seriText,
          formatNumber(g.qty),
          sumberText,
          tujuanText,
        ];
      }) : [["-", "-", "Tidak ada data", "-", "-", "-", "-"]];

      doc.autoTable({
        startY: 35,
        head: [["No", "TGL", "SKU", "SERI", "QTY", "Sumber", "Gudang / Rak"]],
        body: pdfBody,
        theme: "grid",
        margin: { left: marginX, right: marginX, top: 12, bottom: 12 },
        styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", valign: "middle", textColor: [15, 23, 42], lineColor: [226, 232, 240], lineWidth: 0.15 },
        headStyles: { fillColor: [36, 88, 206], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 22 }, 2: { cellWidth: 32 }, 3: { cellWidth: 45 }, 4: { cellWidth: 12, halign: "center" }, 5: { cellWidth: 35 }, 6: { cellWidth: "auto" } },
      });

      const fileStart = formatDateForFile(query.startDate);
      const fileEnd = formatDateForFile(query.endDate);
      doc.save(`History_Produk_Masuk_${fileStart}_${fileEnd}.pdf`);
    } catch (exportError) {
      console.error(exportError);
      setError(buildGudangWorkspaceErrorMessage(exportError, "Gagal export PDF history produk masuk."));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (isExportingExcel) return;
    setIsExportingExcel(true);

    try {
      const exportRows = await fetchAllExportRows();
      
      const groupedMap = new Map();
      exportRows.forEach(row => {
        const dateObj = new Date(row.happenedAt || row.keluarPada);
        const dateStr = Number.isNaN(dateObj.getTime()) ? (row.happenedAt || row.keluarPada || "-") : dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
        const sku = row.sku || "-";
        const key = `${dateStr}___${sku}`;
        
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            tgl: dateStr,
            sku: sku,
            qty: 0,
            seriMap: new Map(),
            sumberSet: new Set(),
            tujuanSet: new Set()
          });
        }
        
        const group = groupedMap.get(key);
        const rowQty = Number(row.qty) || 0;
        group.qty += rowQty;
        
        const rawSerials = String(row.kodeSeri || "-").split(",").map(s => formatBaseKodeSeri(s)).filter(Boolean);
        if (rawSerials.length > 1 && rawSerials.length === rowQty) {
            rawSerials.forEach(s => {
                group.seriMap.set(s, (group.seriMap.get(s) || 0) + 1);
            });
        } else {
            const s = formatBaseKodeSeri(row.kodeSeri);
            if (s && s !== "-") {
              group.seriMap.set(s, (group.seriMap.get(s) || 0) + rowQty);
            }
        }

        if (row.sourceLabel) {
           group.sumberSet.add(row.sourceLabel);
        }
        if (row.destinationLabel) {
           group.tujuanSet.add(row.destinationLabel);
        }
      });

      const groupedRows = Array.from(groupedMap.values());
      const excelData = groupedRows.length > 0 ? groupedRows.map((g, index) => {
        const seriText = Array.from(g.seriMap.entries()).map(([s, count]) => `${s} (Qty ${count})`).join("\n");
        const sumberText = Array.from(g.sumberSet).join(", ") || "-";
        const tujuanText = Array.from(g.tujuanSet).join(", ") || "-";
        
        return {
          "No": index + 1,
          "Tanggal": g.tgl,
          "SKU": g.sku,
          "Kode Seri": seriText,
          "QTY": g.qty,
          "Sumber": sumberText,
          "Gudang / Rak": tujuanText,
        };
      }) : [{
        "No": "-",
        "Tanggal": "-",
        "SKU": "Tidak ada data",
        "Kode Seri": "-",
        "QTY": "-",
        "Sumber": "-",
        "Gudang / Rak": "-",
      }];

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "History Produk Masuk");
      
      const fileStart = formatDateForFile(query.startDate);
      const fileEnd = formatDateForFile(query.endDate);
      XLSX.writeFile(workbook, `History_Produk_Masuk_${fileStart}_${fileEnd}.xlsx`);
    } catch (exportError) {
      console.error(exportError);
      setError(buildGudangWorkspaceErrorMessage(exportError, "Gagal export Excel history produk masuk."));
    } finally {
      setIsExportingExcel(false);
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
        kodeSeri: formatBaseKodeSeri(row.kodeSeri),
      })),
    [resultFrom, rows]
  );

  const loadSummaryData = async () => {
    const currentHash = JSON.stringify({ search: query.search, start: query.startDate, end: query.endDate });
    if (summaryFilterHash === currentHash && allSummaryRows.length > 0) return;

    setIsSummaryLoading(true);
    try {
      const exportRows = await fetchAllExportRows();

      const groupedMap = new Map();
      exportRows.forEach(row => {
        const dateObj = new Date(row.happenedAt || row.keluarPada);
        const dateStr = Number.isNaN(dateObj.getTime()) ? (row.happenedAt || row.keluarPada || "-") : dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
        const sku = row.sku || "-";
        const key = `${dateStr}___${sku}`;
        
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            id: key,
            tgl: dateStr,
            sku: sku,
            qty: 0,
            seriMap: new Map(),
            sumberSet: new Set(),
            tujuanSet: new Set()
          });
        }
        
        const group = groupedMap.get(key);
        const rowQty = Number(row.qty) || 0;
        group.qty += rowQty;
        
        const rawSerials = String(row.kodeSeri || "-").split(",").map(s => formatBaseKodeSeri(s)).filter(Boolean);
        if (rawSerials.length > 1 && rawSerials.length === rowQty) {
            rawSerials.forEach(s => {
                group.seriMap.set(s, (group.seriMap.get(s) || 0) + 1);
            });
        } else {
            const s = formatBaseKodeSeri(row.kodeSeri);
            if (s && s !== "-") {
              group.seriMap.set(s, (group.seriMap.get(s) || 0) + rowQty);
            }
        }

        if (row.sourceLabel) {
           group.sumberSet.add(row.sourceLabel);
        }
        if (row.destinationLabel) {
           group.tujuanSet.add(row.destinationLabel);
        }
      });

      const grouped = Array.from(groupedMap.values()).map((g, index) => {
        const seriText = Array.from(g.seriMap.entries()).map(([s, count]) => count > 1 ? `${s} (Qty ${count})` : s).join(", ") || "-";
        const sumberText = Array.from(g.sumberSet).join(", ") || "-";
        const tujuanText = Array.from(g.tujuanSet).join(", ") || "-";
        
        return {
          ...g,
          rowNumber: index + 1,
          seriText,
          sumberText,
          tujuanText,
        };
      });

      setAllSummaryRows(grouped);
      setSummaryFilterHash(currentHash);
    } catch (err) {
      console.error("Gagal load summary data", err);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "summary") {
      loadSummaryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, query.search, query.startDate, query.endDate]);

  return (
    <GudangProdukBaseShell
      title="History Produk Masuk"
      subtitle="Riwayat barang masuk ke gudang produk."
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
          key: "export-history-produk-excel",
          label: isExportingExcel ? "Menyiapkan Excel..." : "Export Excel",
          icon: FaFileExcel,
          onClick: handleExportExcel,
          disabled: isExportingExcel || isInitialLoading,
        },
        {
          key: "export-history-produk-pdf",
          label: isExportingPdf ? "Menyiapkan PDF..." : "Export PDF",
          icon: FaFilePdf,
          onClick: handleExportPdf,
          disabled: isExportingPdf || isInitialLoading,
        },
        {
          key: "refresh-history-produk",
          label: "Refresh",
          icon: FaSync,
          onClick: refreshRows,
        },
      ]}
    >
      <section className="gudang-ui-stat-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <GudangStatCard
          label="Barang Masuk"
          value={formatNumber(summary.total_qty_masuk)}
          helper="Total qty masuk pada filter aktif."
        />
        <GudangStatCard
          label="SKU Berbeda"
          value={formatNumber(summary.total_sku)}
          helper="Jumlah SKU berbeda yang masuk."
        />
        <GudangStatCard
          label="Kode Seri Berbeda"
          value={formatNumber(summary.total_seri)}
          helper="Jumlah kode seri berbeda."
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
        <div className="gudang-ui-panel-head" style={{ marginBottom: "16px" }}>
          <div>
            <h2>Tabel History Produk Masuk</h2>
            <p>Data berisi arah pergerakan, SKU, qty, kode seri/catatan, dan waktu aktivitas.</p>
          </div>
          {isRefreshing ? (
            <span className="gudang-ui-chip gudang-liststok-chip-pending">
              Memperbarui hasil...
            </span>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <button 
            type="button"
            className={viewMode === "detail" ? "gudang-ui-button" : "gudang-ui-button-secondary"}
            onClick={() => setViewMode("detail")}
          >
            Data Detail
          </button>
          <button 
            type="button"
            className={viewMode === "summary" ? "gudang-ui-button" : "gudang-ui-button-secondary"}
            onClick={() => setViewMode("summary")}
          >
            Summary per SKU & Tanggal
          </button>
        </div>

        {isInitialLoading || (viewMode === "summary" && isSummaryLoading) ? (
          <div className="gudang-ui-empty-panel">
            {viewMode === "summary" ? "Memuat summary data secara keseluruhan..." : "Memuat history produk masuk..."}
          </div>
        ) : viewMode === "summary" && allSummaryRows.length === 0 ? (
          <div className="gudang-ui-empty-panel">Tidak ada data summary pada filter aktif.</div>
        ) : hasRows || (viewMode === "summary" && allSummaryRows.length > 0) ? (
          <>
            <div className="gudang-history-table-stage">
              {isRefreshing && viewMode === "detail" ? (
                <div className="gudang-liststok-loading-overlay">
                  Memperbarui data tanpa menutup hasil yang sedang dibaca...
                </div>
              ) : null}

              <div className="gudang-ui-table-shell">
                <table className="gudang-ui-table gudang-history-table">
                  {viewMode === "summary" ? (
                    <>
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>Tanggal</th>
                          <th>SKU</th>
                          <th>Qty Total</th>
                          <th>Kode Seri</th>
                          <th>Sumber</th>
                          <th>Gudang / Rak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSummaryRows.length > 0 ? allSummaryRows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.rowNumber}</td>
                            <td>{row.tgl}</td>
                            <td><strong>{row.sku}</strong></td>
                            <td>{formatNumber(row.qty)}</td>
                            <td style={{ whiteSpace: "pre-wrap", maxWidth: "300px" }}>{row.seriText}</td>
                            <td>{row.sumberText}</td>
                            <td>{row.tujuanText}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={7} style={{ textAlign: "center" }}>Tidak ada data summary pada halaman ini.</td>
                          </tr>
                        )}
                      </tbody>
                    </>
                  ) : (
                    <>
                      <thead>
                        <tr>
                          <th>Jenis</th>
                          <th>SKU</th>
                          <th>Qty</th>
                          <th>Kode Seri / Catatan</th>
                          <th>Sumber</th>
                          <th>Gudang / Rak</th>
                          <th>Tanggal</th>
                          <th style={{ textAlign: "center" }}>Aksi</th>
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
                            <td>{row.destinationLabel || "-"}</td>
                            <td>{formatDateTime(row.happenedAt || row.keluarPada)}</td>
                            <td style={{ textAlign: "center" }}>
                              {row.id.startsWith("activity-") && (
                                <button
                                  type="button"
                                  className="gudang-ui-button-danger"
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}
                                  onClick={() => handleDeleteItem(row)}
                                >
                                  <FaTrash size={10} /> Hapus
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>
            </div>

            {pagination.last_page > 1 && viewMode === "detail" ? (
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
              Tidak ada history produk masuk pada filter ini.
            </strong>
            <span>Ubah tanggal atau kata kunci pencarian untuk melihat data lain.</span>
          </div>
        )}
      </section>
    </GudangProdukBaseShell>
  );
};

export default HistoryProdukMasukGudang;
