import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../Produk/ProductList.css";
import "../Jahit/KodeSeriBelumDikerjakanOptimized.css";
import API from "../../api";
import Select from "react-select";
import {
  FaImage,
  FaPrint,
  FaSearch,
  FaSync,
  FaWarehouse,
  FaTimes,
} from "react-icons/fa";

const PAGE_SIZE = 100;
const PAGE_FETCH_DELAY_MS = 120;
const MAX_RATE_LIMIT_RETRIES = 3;
const EMPTY_WARNA_KEY = "__tanpa_warna__";
const COLLATOR = new Intl.Collator("id", { numeric: true, sensitivity: "base" });

const WARNA_PALETTE = {
  hitam: "#111827",
  putih: "#f8fafc",
  merah: "#dc2626",
  marah: "#dc2626",
  maroon: "#7f1d1d",
  marun: "#7f1d1d",
  biru: "#2563eb",
  navy: "#1e3a8a",
  "biru tua": "#1e3a8a",
  "biru muda": "#60a5fa",
  hijau: "#16a34a",
  mint: "#99f6e4",
  kuning: "#facc15",
  mustard: "#ca8a04",
  orange: "#f97316",
  oranye: "#f97316",
  coklat: "#8b5a2b",
  "coklat tua": "#6b4423",
  coksu: "#c4a484",
  coffee: "#6f4e37",
  coffe: "#6f4e37",
  hazel: "#b07d47",
  beige: "#d6c6a5",
  abu: "#9ca3af",
  "abu abu": "#9ca3af",
  "abu-abu": "#9ca3af",
  abuabu: "#9ca3af",
  silver: "#cbd5e1",
  dusty: "#b48b8b",
  mauve: "#a78b9f",
  ungu: "#7c3aed",
  violet: "#7c3aed",
  pink: "#ec4899",
  "baby pink": "#f9a8d4",
  magenta: "#db2777",
  wine: "#722f37",
  mulberry: "#70193d",
  kenari: "#f7e967",
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeWarnaKey = (value) => normalizeText(value) || EMPTY_WARNA_KEY;

const uniqueValues = (values) =>
  Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );

const formatNumber = (value) =>
  (Number(value) || 0).toLocaleString("id-ID", {
    maximumFractionDigits: 2,
  });

const formatRoll = (value) => `${formatNumber(value)} - ROL`;

const getGrandTotalToneClass = (value) => {
  const numericValue = Number(value) || 0;
  if (numericValue === 0) return "grand-tone-zero";
  if (numericValue < 10) return "grand-tone-low";
  if (numericValue > 10) return "grand-tone-high";
  return "";
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const normalizeHex = (value) => {
  const hex = String(value || "").trim();
  if (!/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(hex)) {
    return null;
  }

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

const resolveWarnaStyle = (warnaValue) => {
  const fallback = {
    backgroundColor: "#eaf2ff",
    borderColor: "#d6e6fb",
    color: "#173b6d",
  };

  const raw = String(warnaValue || "").trim();
  if (!raw) return fallback;

  let baseColor = normalizeHex(raw);
  const warnaKey = normalizeText(raw).replace(/-/g, " ");

  if (!baseColor) {
    baseColor = WARNA_PALETTE[warnaKey] || null;
  }

  if (!baseColor) {
    const matchedKey = Object.keys(WARNA_PALETTE)
      .sort((a, b) => b.length - a.length)
      .find((name) => warnaKey.includes(name));

    baseColor = matchedKey ? WARNA_PALETTE[matchedKey] : null;
  }

  if (!baseColor) return fallback;

  return {
    backgroundColor: baseColor,
    borderColor: toRgba(baseColor, 0.45),
    color: getReadableTextColor(baseColor),
  };
};

const extractRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const extractLastPage = (payload) => {
  const lastPage = Number(payload?.last_page || payload?.meta?.last_page || 1);
  return Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1;
};

const getApiErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Gagal memuat data bahan list.";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRateLimitRetryDelay = (error, attempt) => {
  if (error?.response?.status !== 429) return null;

  const retryAfter = Number(error.response.headers?.["retry-after"]);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 30000);
  }

  return Math.min(1500 * (attempt + 1), 5000);
};

const apiGetWithRateLimitRetry = async (endpoint, config, attempt = 0) => {
  try {
    return await API.get(endpoint, config);
  } catch (error) {
    const retryDelay = getRateLimitRetryDelay(error, attempt);
    if (retryDelay === null || attempt >= MAX_RATE_LIMIT_RETRIES) {
      throw error;
    }

    await sleep(retryDelay);
    return apiGetWithRateLimitRetry(endpoint, config, attempt + 1);
  }
};

const splitCompoundBahanName = (value) => {
  const raw = String(value || "").trim();
  if (!raw || !raw.includes(" - ")) {
    return { group: raw, pabrik: "" };
  }

  const [group, ...pabrikParts] = raw.split(" - ");
  return {
    group: String(group || "").trim(),
    pabrik: pabrikParts.join(" - ").trim(),
  };
};

const getSpkGroupName = (spk) => {
  const directGroup = String(spk?.group_bahan || spk?.bahan?.group_bahan || "").trim();
  if (directGroup) return directGroup;
  return splitCompoundBahanName(spk?.bahan?.nama_bahan).group;
};

const getSpkWarnaQty = (warnaRow) =>
  Number(warnaRow?.jumlah_rol ?? warnaRow?.stok_dipesan ?? warnaRow?.jumlah ?? 0) || 0;

const getBahanImageUrl = (image) => {
  const rawUrl = image?.image_url || "";
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

  const imagePath = image?.image_path || "";
  const filename = String(imagePath).split("/").filter(Boolean).pop();
  if (!filename) return "";

  const apiBaseUrl = (process.env.REACT_APP_API_URL || "/api").replace(/\/$/, "");
  return `${apiBaseUrl}/bahan-images/${encodeURIComponent(filename)}`;
};

const getBahanImageFromRow = (row) => {
  const image = row?.bahan_image || row?.bahanImage || null;
  if (image) return image;

  if (row?.image_url || row?.image_path) {
    return {
      image_url: row.image_url || "",
      image_path: row.image_path || "",
    };
  }

  return null;
};

const fetchAllPaginated = async (endpoint, params = {}) => {
  const firstResponse = await apiGetWithRateLimitRetry(endpoint, {
    params: { ...params, page: 1, per_page: PAGE_SIZE },
  });

  const firstPayload = firstResponse.data || {};
  const rows = [...extractRows(firstPayload)];
  const lastPage = extractLastPage(firstPayload);

  for (let page = 2; page <= lastPage; page += 1) {
    await sleep(PAGE_FETCH_DELAY_MS);
    const response = await apiGetWithRateLimitRetry(endpoint, {
      params: { ...params, page, per_page: PAGE_SIZE },
    });
    rows.push(...extractRows(response.data || {}));
  }

  return rows;
};

const shouldUseLegacyBahanListFallback = (error) => {
  const status = error?.response?.status;
  return status === 404 || status === 405;
};

const toSafeFileName = (value) => {
  const safeName = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeName || "bahan-list";
};

const getDownloadFileName = (headers, fallbackFileName) => {
  const disposition =
    headers?.["content-disposition"] ||
    headers?.get?.("content-disposition") ||
    "";
  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch (error) {
      return encodedMatch[1];
    }
  }

  const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return fileNameMatch?.[1] || fallbackFileName;
};

const downloadBlob = (blob, fileName) => {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 1000);
};

const getOrderedQtyForWarnaGroup = (spkRows, material, warnaGroup) => {
  const materialKey = normalizeText(material.group_bahan);
  const materialRowIds = new Set(
    material.sourceRows
      .map((row) => Number(row?.id))
      .filter(Boolean)
  );

  return spkRows.reduce((total, spk) => {
    const bahanId = Number(spk?.bahan_id ?? spk?.bahan?.id);
    const matchesById = bahanId && materialRowIds.has(bahanId);
    const matchesByGroup = materialKey && normalizeText(getSpkGroupName(spk)) === materialKey;

    if (!matchesById && !matchesByGroup) {
      return total;
    }

    const warnaRows = Array.isArray(spk?.warna) ? spk.warna : [];

    if (warnaRows.length === 0) {
      const selectedRowInThisColor = warnaGroup.sourceRows.some((row) => Number(row?.id) === bahanId);
      if (!selectedRowInThisColor) return total;

      const qty = Number(spk?.jumlah ?? 0);
      return total + (qty > 0 ? qty : 0);
    }

    const warnaTotal = warnaRows.reduce((sum, warnaRow) => {
      if (normalizeWarnaKey(warnaRow?.warna) !== warnaGroup.key) {
        return sum;
      }

      return sum + getSpkWarnaQty(warnaRow);
    }, 0);

    return total + warnaTotal;
  }, 0);
};

const buildBahanGroups = (masterRows, spkRows) => {
  const materialMap = new Map();

  masterRows.forEach((row) => {
    const groupBahan = String(row?.group_bahan || row?.nama_bahan || "").trim();
    if (!groupBahan) return;

    const materialKey = normalizeText(groupBahan);
    if (!materialMap.has(materialKey)) {
      materialMap.set(materialKey, {
        key: materialKey,
        group_bahan: groupBahan,
        sourceRows: [],
      });
    }

    materialMap.get(materialKey).sourceRows.push(row);
  });

  return Array.from(materialMap.values())
    .map((material) => {
      const warnaMap = new Map();

      material.sourceRows.forEach((row) => {
        const warna = String(row?.warna_bahan || "Tanpa Warna").trim() || "Tanpa Warna";
        const warnaKey = normalizeWarnaKey(warna);

        if (!warnaMap.has(warnaKey)) {
          warnaMap.set(warnaKey, {
            key: warnaKey,
            warna,
            stok_gudang: 0,
            sourceRows: [],
          });
        }

        const warnaGroup = warnaMap.get(warnaKey);
        warnaGroup.stok_gudang += Number(row?.stok_bahan ?? 0) || 0;
        warnaGroup.sourceRows.push(row);
      });

      const rows = Array.from(warnaMap.values())
        .map((warnaGroup) => {
          const dipesan = getOrderedQtyForWarnaGroup(spkRows, material, warnaGroup);
          const image = warnaGroup.sourceRows.map(getBahanImageFromRow).find(Boolean) || null;
          const groupList = uniqueValues(warnaGroup.sourceRows.map((row) => row?.group_bahan));
          const pabrikList = uniqueValues(warnaGroup.sourceRows.map((row) => row?.pabrik_bahan));

          return {
            key: warnaGroup.key,
            warna: warnaGroup.warna,
            stok_gudang: warnaGroup.stok_gudang,
            dipesan,
            grand_total: warnaGroup.stok_gudang + dipesan,
            image_url: getBahanImageUrl(image),
            group_bahan_list: groupList,
            pabrik_bahan_list: pabrikList,
          };
        })
        .sort((a, b) => COLLATOR.compare(a.warna, b.warna));

      const totals = rows.reduce(
        (acc, row) => ({
          stok: acc.stok + row.stok_gudang,
          dipesan: acc.dipesan + row.dipesan,
          grand: acc.grand + row.grand_total,
        }),
        { stok: 0, dipesan: 0, grand: 0 }
      );

      return {
        key: material.key,
        group_bahan: material.group_bahan,
        nama_bahan_list: uniqueValues(material.sourceRows.map((row) => row?.nama_bahan)),
        group_bahan_list: uniqueValues(material.sourceRows.map((row) => row?.group_bahan)),
        pabrik_bahan_list: uniqueValues(material.sourceRows.map((row) => row?.pabrik_bahan)),
        rows,
        total_warna: rows.length,
        total_stok_gudang: totals.stok,
        total_dipesan: totals.dipesan,
        total_grand_total: totals.grand,
      };
    })
    .sort((a, b) => COLLATOR.compare(a.group_bahan, b.group_bahan));
};

const normalizeBahanSummaryGroups = (payload) =>
  extractRows(payload)
    .map((group) => {
      const rows = (Array.isArray(group?.rows) ? group.rows : [])
        .map((row) => {
          const stokGudang = Number(row?.stok_gudang ?? 0) || 0;
          const dipesan = Number(row?.dipesan ?? 0) || 0;
          const grandTotal = Number(row?.grand_total ?? stokGudang + dipesan) || 0;

          return {
            key: String(row?.key || normalizeWarnaKey(row?.warna)).trim(),
            warna: String(row?.warna || "Tanpa Warna").trim() || "Tanpa Warna",
            stok_gudang: stokGudang,
            dipesan,
            grand_total: grandTotal,
            image_url: getBahanImageUrl(row),
            group_bahan_list: uniqueValues(Array.isArray(row?.group_bahan_list) ? row.group_bahan_list : []),
            pabrik_bahan_list: uniqueValues(Array.isArray(row?.pabrik_bahan_list) ? row.pabrik_bahan_list : []),
          };
        })
        .sort((a, b) => COLLATOR.compare(a.warna, b.warna));

      const totals = rows.reduce(
        (acc, row) => ({
          stok: acc.stok + row.stok_gudang,
          dipesan: acc.dipesan + row.dipesan,
          grand: acc.grand + row.grand_total,
        }),
        { stok: 0, dipesan: 0, grand: 0 }
      );

      const groupBahan = String(group?.group_bahan || "").trim();

      return {
        key: String(group?.key || normalizeText(groupBahan)).trim(),
        group_bahan: groupBahan,
        nama_bahan_list: uniqueValues(Array.isArray(group?.nama_bahan_list) ? group.nama_bahan_list : []),
        group_bahan_list: uniqueValues(Array.isArray(group?.group_bahan_list) ? group.group_bahan_list : []),
        pabrik_bahan_list: uniqueValues(Array.isArray(group?.pabrik_bahan_list) ? group.pabrik_bahan_list : []),
        rows,
        total_warna: Number(group?.total_warna ?? rows.length) || rows.length,
        total_stok_gudang: Number(group?.total_stok_gudang ?? totals.stok) || totals.stok,
        total_dipesan: Number(group?.total_dipesan ?? totals.dipesan) || totals.dipesan,
        total_grand_total: Number(group?.total_grand_total ?? totals.grand) || totals.grand,
      };
    })
    .filter((group) => group.key && group.group_bahan)
    .sort((a, b) => COLLATOR.compare(a.group_bahan, b.group_bahan));

const fetchBahanListSummary = async () => {
  const response = await apiGetWithRateLimitRetry("/bahan-list/summary");
  return normalizeBahanSummaryGroups(response.data || {});
};

const fetchLegacyBahanGroups = async () => {
  const bahanData = await fetchAllPaginated("/bahan");
  const spkData = await fetchAllPaginated("/spk-bahan", { sort_by: "id", sort_dir: "desc" });

  return buildBahanGroups(bahanData, spkData);
};

const BahanList = () => {
  const [bahanGroups, setBahanGroups] = useState([]);
  const [selectedBahanKey, setSelectedBahanKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const initialLoadStartedRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let groups = [];
      try {
        groups = await fetchBahanListSummary();
      } catch (summaryError) {
        if (!shouldUseLegacyBahanListFallback(summaryError)) {
          throw summaryError;
        }

        groups = await fetchLegacyBahanGroups();
      }

      setBahanGroups(groups);
      setLastSyncAt(new Date().toISOString());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
      setBahanGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (bahanGroups.length === 0) {
      setSelectedBahanKey("");
      return;
    }

    setSelectedBahanKey((currentKey) =>
      bahanGroups.some((group) => group.key === currentKey)
        ? currentKey
        : bahanGroups[0].key
    );
  }, [bahanGroups]);

  const selectedMaterial = useMemo(
    () => bahanGroups.find((group) => group.key === selectedBahanKey) || null,
    [bahanGroups, selectedBahanKey]
  );

  const visibleRows = useMemo(() => {
    if (!selectedMaterial) return [];
    return selectedMaterial.rows;
  }, [selectedMaterial]);

  const visibleTotals = useMemo(
    () =>
      visibleRows.reduce(
        (acc, row) => ({
          stok: acc.stok + row.stok_gudang,
          dipesan: acc.dipesan + row.dipesan,
          grand: acc.grand + row.grand_total,
        }),
        { stok: 0, dipesan: 0, grand: 0 }
      ),
    [visibleRows]
  );

  const selectedPreviewRow = useMemo(
    () => visibleRows.find((row) => row.image_url) || visibleRows[0] || null,
    [visibleRows]
  );

  const materialPabrikLabel = selectedMaterial?.pabrik_bahan_list?.join(", ") || "-";

  const handleDownloadPdf = useCallback(async () => {
    if (!selectedMaterial || loading || downloadingPdf) return;

    try {
      setDownloadingPdf(true);
      const response = await API.get("/bahan-list/summary/pdf", {
        params: { group_key: selectedMaterial.key },
        responseType: "blob",
      });

      const fallbackFileName = `Bahan-List-${toSafeFileName(selectedMaterial.group_bahan)}.pdf`;
      const fileName = getDownloadFileName(response.headers, fallbackFileName);
      const pdfBlob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: "application/pdf" });

      downloadBlob(pdfBlob, fileName);
    } catch (downloadError) {
      window.alert(getApiErrorMessage(downloadError) || "Gagal download PDF bahan list.");
    } finally {
      setDownloadingPdf(false);
    }
  }, [downloadingPdf, loading, selectedMaterial]);

  return (
    <div className="ks-page">
      <header className="ks-header">
        <div className="ks-header-title">
          <h1>Bahan List</h1>
          <p>
            Gudang Bahan / List Bahan &bull; Ringkasan stok gudang awal, total
            dipesan, dan grand total per warna.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Terakhir Sinkron</span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{formatDateTime(lastSyncAt)}</span>
          </div>
          {selectedMaterial && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Group Terpilih</span>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{selectedMaterial.group_bahan}</span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
            <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Warna</span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{visibleRows.length} warna</span>
          </div>
        </div>
      </header>

      <section className="ks-board">
        <div className="ks-toolbar">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "300px" }}>
              <Select
                value={bahanGroups.length > 0 ? { value: selectedBahanKey, label: selectedMaterial ? `${selectedMaterial.group_bahan} (${selectedMaterial.total_warna} warna)` : "Pilih Group Bahan..." } : null}
                onChange={(option) => setSelectedBahanKey(option ? option.value : "")}
                isDisabled={loading || bahanGroups.length === 0}
                placeholder="Cari nama bahan atau group..."
                options={bahanGroups.map((group) => ({
                  value: group.key,
                  label: `${group.group_bahan} (${group.total_warna} warna)`,
                  group_bahan: group.group_bahan,
                  nama_bahan_list: group.nama_bahan_list,
                }))}
                filterOption={(option, inputValue) => {
                  const query = inputValue.toLowerCase();
                  if (!query) return true;
                  const groupMatch = option.data.group_bahan?.toLowerCase().includes(query);
                  const listMatch = option.data.nama_bahan_list?.join(" ").toLowerCase().includes(query);
                  return groupMatch || listMatch;
                }}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: "36px",
                    borderRadius: "6px",
                    borderColor: "#e2e8f0",
                    fontSize: "13px",
                    boxShadow: "none",
                    "&:hover": { borderColor: "#cbd5e1" }
                  }),
                  menu: (base) => ({ ...base, fontSize: "13px", zIndex: 100 })
                }}
              />
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            <button
              type="button"
              className="ks-btn is-secondary"
              onClick={loadData}
              disabled={loading}
              title="Refresh"
            >
              <FaSync className={loading ? "is-spinning" : ""} /> Refresh
            </button>
            <button
              type="button"
              className="ks-btn is-secondary"
              onClick={handleDownloadPdf}
              disabled={loading || downloadingPdf || !selectedMaterial}
            >
              <FaPrint />
              {downloadingPdf ? "Mengunduh..." : "Download PDF"}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Memuat data bahan list...</div>
        ) : error ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#ef4444", fontWeight: 600 }}>{error}</div>
        ) : !selectedMaterial ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>
            {"Belum ada data group bahan yang bisa ditampilkan."}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap", padding: "16px" }}>
            <div className="ks-grid-scroll" style={{ flex: "2 1 600px", padding: 0 }}>
              <table className="ks-grid">
                <colgroup>
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "25%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="cell-no" style={{ textAlign: "center" }}>No</th>
                    <th>Warna</th>
                    <th style={{ textAlign: "right" }}>Stok Gudang - Total</th>
                    <th style={{ textAlign: "right" }}>Dipesan - Total</th>
                    <th style={{ textAlign: "right" }}>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                        Tidak ada warna yang sesuai pencarian.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row, index) => {
                      const warnaStyle = resolveWarnaStyle(row.warna);

                      return (
                        <tr key={row.key}>
                          <td className="ks-cell-code" style={{ textAlign: "center" }}>{index + 1}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "50%",
                                  backgroundColor: warnaStyle.backgroundColor,
                                  border: `1px solid ${warnaStyle.borderColor}`,
                                  flexShrink: 0
                                }}
                              />
                              <strong style={{ fontSize: "13px" }}>{row.warna}</strong>
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>{formatRoll(row.stok_gudang)}</td>
                          <td style={{ textAlign: "right" }}>{formatRoll(row.dipesan)}</td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: row.grand_total === 0 ? "#94a3b8" : row.grand_total < 10 ? "#ef4444" : "#10b981" }}>
                            {formatRoll(row.grand_total)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {visibleRows.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="2" style={{ fontWeight: 700, background: "#f8fafc" }}>TOTAL</td>
                      <td style={{ textAlign: "right", fontWeight: 700, background: "#f8fafc" }}>{formatRoll(visibleTotals.stok)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, background: "#f8fafc" }}>{formatRoll(visibleTotals.dipesan)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, background: "#f8fafc", color: visibleTotals.grand === 0 ? "#94a3b8" : visibleTotals.grand < 10 ? "#ef4444" : "#10b981" }}>
                        {formatRoll(visibleTotals.grand)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div style={{ flex: "1 1 300px", maxWidth: "400px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", minHeight: "300px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                Preview Gambar Bahan
              </div>
              {!selectedPreviewRow ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px", fontWeight: "600", minHeight: "200px" }}>
                  Tidak ada preview gambar.
                </div>
              ) : (
                <div
                  title={`${selectedMaterial.group_bahan}: ${formatRoll(visibleTotals.grand)}`}
                  style={{ width: "100%", height: "auto", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "8px", background: "#fff", flex: 1 }}
                >
                  {selectedPreviewRow.image_url ? (
                    <img src={selectedPreviewRow.image_url} alt={`Preview ${selectedMaterial.group_bahan}`} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "8px" }} />
                  ) : (
                    <div style={{ width: "100%", height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1" }}>
                      <FaImage size={48} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default BahanList;
