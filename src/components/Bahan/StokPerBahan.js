import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./StokPerBahan.css";
import API from "../../api";
import {
  FaArrowLeft,
  FaBoxes,
  FaFilePdf,
  FaFilter,
  FaImage,
  FaSearch,
  FaWarehouse,
} from "react-icons/fa";

const COLLATOR = new Intl.Collator("id", { numeric: true, sensitivity: "base" });
const GROUPS_PER_PAGE = 3;

const formatNumber = (value, options = {}) =>
  (Number(value) || 0).toLocaleString("id-ID", options);

const formatWeight = (value) =>
  formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (value = new Date()) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatFileDate = (value = new Date()) =>
  new Date(value).toISOString().slice(0, 10);

const makeSafeFilename = (value) =>
  String(value || "laporan-bahan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "laporan-bahan";

const WARNA_PALETTE = {
  hitam: "#111827",
  putih: "#f8fafc",
  merah: "#dc2626",
  maroon: "#7f1d1d",
  marun: "#7f1d1d",
  biru: "#2563eb",
  "biru tua": "#1e3a8a",
  navy: "#1e3a8a",
  "biru dongker": "#1e3a8a",
  "biru muda": "#60a5fa",
  "biru langit": "#38bdf8",
  hijau: "#16a34a",
  "hijau tua": "#166534",
  "hijau muda": "#86efac",
  "hijau army": "#4b5320",
  olive: "#4b5320",
  kuning: "#facc15",
  mustard: "#ca8a04",
  orange: "#f97316",
  oranye: "#f97316",
  coklat: "#8b5a2b",
  "coklat tua": "#6b4423",
  "coklat muda": "#b08968",
  cream: "#fef3c7",
  krem: "#fef3c7",
  beige: "#f5f5dc",
  abu: "#9ca3af",
  "abu abu": "#9ca3af",
  "abu-abu": "#9ca3af",
  abuabu: "#9ca3af",
  silver: "#cbd5e1",
  ungu: "#7c3aed",
  violet: "#7c3aed",
  pink: "#ec4899",
  magenta: "#db2777",
  peach: "#fdba74",
  turkis: "#14b8a6",
  tosca: "#14b8a6",
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeHex = (value) => {
  const hex = String(value || "").trim();
  if (!/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(hex)) return null;
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  return hex.toLowerCase();
};

const hexToRgb = (hex) => {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const num = parseInt(normalized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const toRgba = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(148, 163, 184, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const getReadableTextColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#0f172a";
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 160 ? "#0f172a" : "#ffffff";
};

const resolveWarnaColor = (warnaValue) => {
  const fallback = {
    backgroundColor: "#edf4ff",
    color: "#1e40af",
    borderColor: "#dbe6ff",
  };

  const raw = String(warnaValue || "").trim();
  if (!raw) return fallback;

  let baseColor = normalizeHex(raw);

  if (!baseColor) {
    const key = normalizeText(raw).replace(/-/g, " ");
    baseColor = WARNA_PALETTE[key] || null;

    if (!baseColor) {
      const matchedKey = Object.keys(WARNA_PALETTE)
        .sort((a, b) => b.length - a.length)
        .find((name) => key.includes(name));
      baseColor = matchedKey ? WARNA_PALETTE[matchedKey] : null;
    }
  }

  if (!baseColor) return fallback;

  const textColor = getReadableTextColor(baseColor) === "#ffffff" ? baseColor : "#0f172a";

  return {
    backgroundColor: toRgba(baseColor, 0.18),
    color: textColor,
    borderColor: toRgba(baseColor, 0.45),
  };
};

const getBahanImageUrl = (source) => {
  const rawUrl = source?.image_url || "";
  if (rawUrl) {
    if (rawUrl.startsWith("/") || rawUrl.startsWith("blob:")) return rawUrl;

    try {
      const parsedUrl = new URL(rawUrl);
      if (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") {
        return parsedUrl.pathname;
      }
      return rawUrl;
    } catch (error) {
      return rawUrl;
    }
  }

  const imagePath = source?.image_path || source?.bahan_image?.image_path || "";
  const filename = String(imagePath).split("/").filter(Boolean).pop();
  if (!filename) return "";

  const apiBaseUrl = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "");
  return `${apiBaseUrl}/bahan-images/${encodeURIComponent(filename)}`;
};

const getNumericValue = (source, keys, fallback = 0) => {
  const key = keys.find((candidate) => source?.[candidate] !== undefined && source?.[candidate] !== null);
  if (!key) return fallback;
  const value = Number(source[key]);
  return Number.isFinite(value) ? value : fallback;
};

const getRowImage = (item, detailRows) => {
  const direct = getBahanImageUrl(item);
  if (direct) return direct;

  const detailWithImage = detailRows.find(
    (detail) => getBahanImageUrl(detail) || getBahanImageUrl(detail?.bahan_image)
  );

  return getBahanImageUrl(detailWithImage) || getBahanImageUrl(detailWithImage?.bahan_image);
};

const getRowsByWarna = (items) =>
  items
    .flatMap((item) => {
      const details = Array.isArray(item.detail) ? item.detail : [];
      const detailGroups = details.reduce((acc, detail) => {
        const warna = String(detail.warna || "Tanpa Warna").trim() || "Tanpa Warna";
        if (!acc[warna]) acc[warna] = [];
        acc[warna].push(detail);
        return acc;
      }, {});

      const colors =
        Object.keys(detailGroups).length > 0
          ? Object.keys(detailGroups)
          : (Array.isArray(item.warna) ? item.warna : []).map((warna) => String(warna || "Tanpa Warna"));

      return colors.map((warna) => {
        const detailRows = detailGroups[warna] || [];
        const stok = detailRows.length || getNumericValue(item, ["stok", "total_rol"]);
        const keperluan = getNumericValue(item, ["keperluan", "kebutuhan", "total_keperluan"]);
        const dipesan = getNumericValue(item, ["dipesan", "stok_dipesan", "total_dipesan"]);
        const explicitSisa = getNumericValue(item, ["sisa", "sisa_dipesan"], null);
        const sisa = explicitSisa === null ? Math.max(0, stok - keperluan - dipesan) : explicitSisa;
        const berat = detailRows.reduce((sum, detail) => sum + (Number(detail.berat) || 0), 0);

        return {
          id: `${item.nama_bahan || "bahan"}-${warna}`,
          nama_bahan: item.nama_bahan || "-",
          warna,
          stok,
          keperluan,
          dipesan,
          sisa,
          berat,
          pabrik: Array.isArray(item.pabrik) ? item.pabrik.join(", ") : item.pabrik || "-",
          gudang: Array.isArray(item.gudang) ? item.gudang.join(", ") : item.gudang || "-",
          sku: item.sku || detailRows.find((detail) => detail.sku)?.sku || "-",
          imageUrl: getRowImage(item, detailRows),
        };
      });
    })
    .sort((a, b) => {
      const bahanCompare = COLLATOR.compare(a.nama_bahan, b.nama_bahan);
      return bahanCompare || COLLATOR.compare(a.warna, b.warna);
    });

const getReportGroups = (items) =>
  items
    .map((item) => {
      const rows = getRowsByWarna([item]);
      return {
        id: item.nama_bahan || "Tidak Diketahui",
        nama_bahan: item.nama_bahan || "Tidak Diketahui",
        rows,
        totalStok: rows.reduce((sum, row) => sum + row.stok, 0),
        totalBerat: rows.reduce((sum, row) => sum + row.berat, 0),
      };
    })
    .filter((group) => group.rows.length > 0)
    .sort((a, b) => COLLATOR.compare(a.nama_bahan, b.nama_bahan));

const StokPerBahan = () => {
  const [data, setData] = useState([]);
  const [draftSearchTerm, setDraftSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBahanMode, setSelectedBahanMode] = useState("all");
  const [selectedBahanList, setSelectedBahanList] = useState([]);
  const [isBahanMenuOpen, setIsBahanMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [summaryRoll, setSummaryRoll] = useState({
    total_semua: 0,
    total_utuh: 0,
    total_sisa: 0,
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_bahan: 0,
    total_roll: 0,
    total_berat_kg: 0,
    total_berat_yard: 0,
    total_roll_utuh: 0,
    total_roll_sisa: 0,
  });
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const bahanMenuRef = useRef(null);

  const fetchStokPerBahan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await API.get("/stok-bahan/per-bahan", { params });
      const dataArray = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setData(dataArray);
      setLastSyncAt(new Date().toISOString());
    } catch (e) {
      const errorMessage =
        e.response?.data?.message || e.message || "Gagal memuat data stok per bahan.";
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchSummaryRoll = useCallback(async () => {
    try {
      const res = await API.get("/stok-bahan/summary-total-roll");
      setSummaryRoll({
        total_semua: res.data?.total_semua || 0,
        total_utuh: res.data?.total_utuh || 0,
        total_sisa: res.data?.total_sisa || 0,
      });
    } catch (e) {
      setSummaryRoll({ total_semua: 0, total_utuh: 0, total_sisa: 0 });
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;

      const res = await API.get("/stok-bahan/dashboard-stats", { params });
      setDashboardStats({
        total_bahan: res.data?.total_bahan || 0,
        total_roll: res.data?.total_roll || 0,
        total_berat_kg: res.data?.total_berat_kg || 0,
        total_berat_yard: res.data?.total_berat_yard || 0,
        total_roll_utuh: res.data?.total_roll_utuh || 0,
        total_roll_sisa: res.data?.total_roll_sisa || 0,
      });
    } catch (e) {
      setDashboardStats({
        total_bahan: 0,
        total_roll: 0,
        total_berat_kg: 0,
        total_berat_yard: 0,
        total_roll_utuh: 0,
        total_roll_sisa: 0,
      });
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchStokPerBahan();
    fetchSummaryRoll();
    fetchDashboardStats();
  }, [fetchStokPerBahan, fetchSummaryRoll, fetchDashboardStats]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBahanMode, selectedBahanList, statusFilter]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (bahanMenuRef.current && !bahanMenuRef.current.contains(event.target)) {
        setIsBahanMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const bahanOptions = useMemo(
    () =>
      Array.from(
        new Set(data.map((item) => String(item.nama_bahan || "").trim()).filter(Boolean))
      ).sort(COLLATOR.compare),
    [data]
  );

  useEffect(() => {
    if (selectedBahanMode !== "custom") return;

    setSelectedBahanList((prev) =>
      prev.filter((namaBahan) => bahanOptions.includes(namaBahan))
    );
  }, [bahanOptions, selectedBahanMode]);

  const selectedBahanSet = useMemo(
    () => new Set(selectedBahanList),
    [selectedBahanList]
  );

  const isAllBahanSelected = selectedBahanMode === "all";
  const selectedBahanLabel = isAllBahanSelected
    ? "Semua grup terpilih"
    : selectedBahanList.length === 0
      ? "Tidak ada grup dipilih"
      : selectedBahanList.length === 1
        ? selectedBahanList[0]
        : `${selectedBahanList.length} grup dipilih`;

  const toggleAllBahan = () => {
    if (isAllBahanSelected) {
      setSelectedBahanMode("custom");
      setSelectedBahanList([]);
      return;
    }

    setSelectedBahanMode("all");
    setSelectedBahanList([]);
  };

  const toggleBahanSelection = (namaBahan) => {
    if (isAllBahanSelected) {
      const nextSelection = bahanOptions.filter((option) => option !== namaBahan);
      setSelectedBahanMode("custom");
      setSelectedBahanList(nextSelection);
      return;
    }

    setSelectedBahanList((prev) => {
      const exists = prev.includes(namaBahan);
      const nextSelection = exists
        ? prev.filter((option) => option !== namaBahan)
        : [...prev, namaBahan].sort(COLLATOR.compare);

      if (nextSelection.length === bahanOptions.length) {
        setSelectedBahanMode("all");
        return [];
      }

      return nextSelection;
    });
  };

  const reportItems = useMemo(() => {
    const query = normalizeText(searchTerm);

    return data.filter((item) => {
      const selectedMatch =
        isAllBahanSelected || selectedBahanSet.has(String(item.nama_bahan || "").trim());
      if (!selectedMatch) return false;
      if (!query) return true;

      const detailText = Array.isArray(item.detail)
        ? item.detail
            .map((detail) =>
              [detail.warna, detail.nama_pabrik, detail.nama_gudang, detail.sku, detail.barcode].join(" ")
            )
            .join(" ")
        : "";

      const haystack = normalizeText(
        [
          item.nama_bahan,
          Array.isArray(item.warna) ? item.warna.join(" ") : item.warna,
          Array.isArray(item.pabrik) ? item.pabrik.join(" ") : item.pabrik,
          item.sku,
          detailText,
        ].join(" ")
      );

      return haystack.includes(query);
    });
  }, [data, searchTerm, isAllBahanSelected, selectedBahanSet]);

  const reportGroups = useMemo(() => getReportGroups(reportItems), [reportItems]);
  const reportRows = useMemo(() => reportGroups.flatMap((group) => group.rows), [reportGroups]);
  const totalPages = Math.ceil(reportGroups.length / GROUPS_PER_PAGE);
  const reportLabel = selectedBahanLabel.toUpperCase();

  const applyFilter = (event) => {
    event?.preventDefault();
    setSearchTerm(draftSearchTerm);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleDownloadPdf = () => {
    if (reportGroups.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const generatedAt = lastSyncAt || new Date();
    const cardsPerRow = 8;
    const gap = 4;
    const cardWidth = (contentWidth - gap * (cardsPerRow - 1)) / cardsPerRow;
    const cardHeight = 29;
    const imageHeight = 17;

    reportGroups.forEach((group, groupIndex) => {
      if (groupIndex > 0) doc.addPage("a4", "landscape");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("LAPORAN BAHAN", margin, 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`Tanggal: ${formatDate(generatedAt)}`, pageWidth - margin, 12, { align: "right" });
      doc.text(`Total varian: ${formatNumber(reportRows.length)} item`, pageWidth - margin, 16, { align: "right" });
      doc.text(`Page: ${Math.floor(groupIndex / GROUPS_PER_PAGE) + 1}`, pageWidth - margin, 20, { align: "right" });

      doc.setDrawColor(31, 45, 70);
      doc.setLineWidth(0.35);
      doc.line(margin, 22, pageWidth - margin, 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`GRUP: ${group.nama_bahan}`, margin, 30);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`${formatNumber(group.rows.length)} varian`, pageWidth - margin, 30, { align: "right" });
      doc.line(margin, 33, pageWidth - margin, 33);

      const gridStartY = 38;
      group.rows.forEach((row, index) => {
        const column = index % cardsPerRow;
        const rowIndex = Math.floor(index / cardsPerRow);
        const x = margin + column * (cardWidth + gap);
        const y = gridStartY + rowIndex * (cardHeight + gap);

        doc.setDrawColor(219, 227, 238);
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, cardWidth, cardHeight, "FD");
        doc.setFillColor(248, 250, 252);
        doc.rect(x + 1.5, y + 1.5, cardWidth - 3, imageHeight, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text("NO IMAGE", x + cardWidth / 2, y + 10.5, { align: "center" });

        doc.setFontSize(5.5);
        doc.setTextColor(15, 23, 42);
        const warnaLines = doc.splitTextToSize(String(row.warna || "-").toUpperCase(), cardWidth - 4);
        doc.text(warnaLines.slice(0, 2), x + 2, y + imageHeight + 5);

        const badgeY = y + cardHeight - 5;
        if (row.stok <= 0) {
          doc.setFillColor(254, 242, 242);
          doc.setTextColor(185, 28, 28);
        } else {
          doc.setFillColor(237, 244, 255);
          doc.setTextColor(36, 88, 206);
        }
        doc.roundedRect(x + 2, badgeY - 3.5, 14, 4.5, 1, 1, "F");
        doc.setFontSize(5);
        doc.text(`Stok: ${formatNumber(row.stok)}`, x + 3, badgeY);
      });

      const cardRows = Math.max(1, Math.ceil(group.rows.length / cardsPerRow));
      const tableY = Math.min(gridStartY + cardRows * (cardHeight + gap) + 6, pageHeight - 58);

      doc.autoTable({
        startY: tableY,
        head: [["No", "Nama Bahan", "Warna Bahan", "Stok", "Berat", "Pabrik"]],
        body: group.rows.map((row, index) => [
          index + 1,
          row.nama_bahan,
          row.warna,
          formatNumber(row.stok),
          formatWeight(row.berat),
          row.pabrik,
        ]),
        foot: [["", `Total ${group.nama_bahan}`, "", formatNumber(group.totalStok), formatWeight(group.totalBerat), ""]],
        margin: { left: margin, right: margin },
        styles: {
          font: "helvetica",
          fontSize: 7,
          cellPadding: 2.4,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [244, 247, 250],
          textColor: [71, 85, 105],
          fontStyle: "bold",
          halign: "left",
        },
        footStyles: {
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 12 },
          3: { halign: "center", cellWidth: 18 },
          4: { halign: "center", cellWidth: 24 },
        },
      });
    });

    const fileLabel =
      isAllBahanSelected || selectedBahanList.length !== 1
        ? "semua-grup"
        : selectedBahanList[0];

    doc.save(`laporan-bahan-${makeSafeFilename(fileLabel)}-${formatFileDate(new Date())}.pdf`);
  };

  const renderReportGroup = (group, groupIndex) => {
    const pageNumber = Math.floor(groupIndex / GROUPS_PER_PAGE) + 1;
    const isCurrentGroup = pageNumber === currentPage;

    return (
      <div
        className={`stok-bahan-report-page ${isCurrentGroup ? "active" : ""}`}
        key={group.id}
      >
        <section className="stok-bahan-group-container">
          <div className="stok-bahan-report-heading">
          <div>
            <p className="stok-bahan-report-kicker">Laporan bahan</p>
            <h1>Stok Per Bahan</h1>
          </div>
          <div className="stok-bahan-report-meta">
            <span>Tanggal: {formatDate(lastSyncAt || new Date())}</span>
            <span>Total varian: {formatNumber(reportRows.length)} item</span>
            <span>Page: {pageNumber}</span>
          </div>
          </div>

          <div className="stok-bahan-variant-section">
            <div className="stok-bahan-group-line">
              <strong>Grup: {group.nama_bahan}</strong>
              <span>{formatNumber(group.rows.length)} varian</span>
            </div>

            <div className="stok-bahan-variant-grid">
              {group.rows.map((row) => (
                <article className="stok-bahan-variant-card" key={row.id}>
                  <div className="stok-bahan-variant-image">
                    {row.imageUrl ? (
                      <img src={row.imageUrl} alt={`${row.nama_bahan} ${row.warna}`} />
                    ) : (
                      <div className="stok-bahan-no-image">
                        <FaImage />
                        <span>No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="stok-bahan-variant-name">{row.warna}</div>
                  <span
                    className={`stok-bahan-stock-badge ${row.stok <= 0 ? "is-zero" : ""}`}
                    style={row.stok > 0 ? resolveWarnaColor(row.warna) : undefined}
                  >
                    Stok: {formatNumber(row.stok)}
                  </span>
                </article>
              ))}
            </div>
          </div>

          <div className="stok-bahan-table-section">
            <div className="stok-bahan-table-wrapper">
              <table className="stok-bahan-table">
                <thead>
                  <tr>
                    <th className="cell-no">No</th>
                    <th>Nama Bahan</th>
                    <th>Warna Bahan</th>
                    <th>Stok</th>
                    <th>Berat</th>
                    <th>Pabrik</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, index) => (
                    <tr key={`${row.id}-${index}`}>
                      <td className="cell-no">{index + 1}</td>
                      <td className="cell-name">{row.nama_bahan}</td>
                      <td>
                        <span className="stok-bahan-warna-chip" style={resolveWarnaColor(row.warna)}>
                          {row.warna}
                        </span>
                      </td>
                      <td className={row.stok <= 0 ? "cell-alert" : "cell-number"}>
                        {formatNumber(row.stok)}
                      </td>
                      <td className="cell-number">{formatWeight(row.berat)}</td>
                      <td>{row.pabrik}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3">Total {group.nama_bahan}</td>
                    <td>{formatNumber(group.totalStok)}</td>
                    <td>{formatWeight(group.totalBerat)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="stok-bahan-page">
      <div className="stok-bahan-shell">
        <header className="stok-bahan-report-toolbar">
          <Link to="/home" className="stok-bahan-dashboard-link">
            <FaArrowLeft />
            <span>Dashboard</span>
          </Link>

          <form className="stok-bahan-report-search" onSubmit={applyFilter}>
            <FaSearch className="stok-bahan-search-icon" />
            <input
              type="text"
              placeholder="Cari nama / warna / grup..."
              value={draftSearchTerm}
              onChange={(e) => setDraftSearchTerm(e.target.value)}
            />
            <button type="submit">
              <FaFilter />
              <span>Filter</span>
            </button>
          </form>

          <button
            type="button"
            className="stok-bahan-print-btn"
            onClick={handleDownloadPdf}
            disabled={loading || reportGroups.length === 0}
          >
            <FaFilePdf />
            <span>Download PDF</span>
          </button>
        </header>

        <section className="stok-bahan-report-filters">
          <label className="stok-bahan-select-group">
            <span>Pilih grup untuk dilihat / print:</span>
            <div className="stok-bahan-checkselect" ref={bahanMenuRef}>
              <button
                type="button"
                className="stok-bahan-checkselect-trigger"
                onClick={() => setIsBahanMenuOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isBahanMenuOpen}
              >
                <span>{selectedBahanLabel}</span>
              </button>

              {isBahanMenuOpen && (
                <div className="stok-bahan-checkselect-menu" role="listbox">
                  <label className="stok-bahan-check-option is-all">
                    <input
                      type="checkbox"
                      checked={isAllBahanSelected}
                      onChange={toggleAllBahan}
                    />
                    <span>Semua grup terpilih</span>
                  </label>

                  {bahanOptions.map((namaBahan) => {
                    const checked = isAllBahanSelected || selectedBahanSet.has(namaBahan);

                    return (
                      <label className="stok-bahan-check-option" key={namaBahan}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBahanSelection(namaBahan)}
                        />
                        <span>{namaBahan}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </label>

          <div className="stok-bahan-status-actions" aria-label="Filter status roll">
            <button
              className={`stok-bahan-status-filter ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
              type="button"
            >
              Semua <strong>{formatNumber(summaryRoll.total_semua)}</strong>
            </button>
            <button
              className={`stok-bahan-status-filter ${statusFilter === "utuh" ? "active" : ""}`}
              onClick={() => setStatusFilter("utuh")}
              type="button"
            >
              Utuh <strong>{formatNumber(summaryRoll.total_utuh)}</strong>
            </button>
            <button
              className={`stok-bahan-status-filter ${statusFilter === "sisa" ? "active" : ""}`}
              onClick={() => setStatusFilter("sisa")}
              type="button"
            >
              Sisa <strong>{formatNumber(summaryRoll.total_sisa)}</strong>
            </button>
          </div>
        </section>

        <section className="stok-bahan-summary-strip">
          <div>
            <FaWarehouse />
            <span>Total Bahan</span>
            <strong>{formatNumber(dashboardStats.total_bahan)}</strong>
          </div>
          <div>
            <FaBoxes />
            <span>Total Roll</span>
            <strong>{formatNumber(dashboardStats.total_roll)}</strong>
          </div>
          <div>
            <span>Utuh</span>
            <strong>{formatNumber(dashboardStats.total_roll_utuh)}</strong>
          </div>
          <div>
            <span>Sisa</span>
            <strong>{formatNumber(dashboardStats.total_roll_sisa)}</strong>
          </div>
          <div>
            <span>Berat KG</span>
            <strong>{formatWeight(dashboardStats.total_berat_kg)}</strong>
          </div>
          <div>
            <span>Yard</span>
            <strong>{formatWeight(dashboardStats.total_berat_yard)}</strong>
          </div>
        </section>

        {loading ? (
          <p className="stok-bahan-loading">Memuat data stok...</p>
        ) : error ? (
          <p className="stok-bahan-error">{error}</p>
        ) : (
          <>
            {reportGroups.length === 0 ? (
              <div className="stok-bahan-empty-state">Tidak ada data stok yang sesuai filter.</div>
            ) : (
              <div className="stok-bahan-report-pages">
                {reportGroups.map(renderReportGroup)}
              </div>
            )}

            {totalPages > 1 && (
              <div className="stok-bahan-pagination">
                <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, pageIndex) => pageIndex + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                  .map((page, index, pages) => (
                    <React.Fragment key={page}>
                      {index > 0 && page - pages[index - 1] > 1 && (
                        <span className="stok-bahan-ellipsis">...</span>
                      )}
                      <button
                        type="button"
                        className={currentPage === page ? "active" : ""}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
                <span className="stok-bahan-pagination-info">
                  Halaman {currentPage} dari {totalPages} ({GROUPS_PER_PAGE} grup per halaman)
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StokPerBahan;
