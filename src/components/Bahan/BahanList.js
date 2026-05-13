import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./BahanList.css";
import API from "../../api";
import {
  FaImage,
  FaSearch,
  FaSync,
  FaWarehouse,
} from "react-icons/fa";

const PAGE_SIZE = 100;
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
  const firstResponse = await API.get(endpoint, {
    params: { ...params, page: 1, per_page: PAGE_SIZE },
  });

  const firstPayload = firstResponse.data || {};
  const rows = [...extractRows(firstPayload)];
  const lastPage = extractLastPage(firstPayload);

  for (let page = 2; page <= lastPage; page += 1) {
    const response = await API.get(endpoint, {
      params: { ...params, page, per_page: PAGE_SIZE },
    });
    rows.push(...extractRows(response.data || {}));
  }

  return rows;
};

const buildOrderMapByBahanId = (spkRows) => {
  const map = new Map();

  spkRows.forEach((spk) => {
    const bahanId = Number(spk?.bahan_id ?? spk?.bahan?.id);
    if (!bahanId) return;

    if (!map.has(bahanId)) {
      map.set(bahanId, new Map());
    }

    const warnaMap = map.get(bahanId);
    const warnaRows = Array.isArray(spk?.warna) ? spk.warna : [];

    if (warnaRows.length === 0) {
      const qty = Number(spk?.jumlah ?? 0);
      if (qty > 0) {
        warnaMap.set(EMPTY_WARNA_KEY, (warnaMap.get(EMPTY_WARNA_KEY) || 0) + qty);
      }
      return;
    }

    warnaRows.forEach((warnaRow) => {
      const warnaKey = normalizeWarnaKey(warnaRow?.warna);
      const qty = Number(warnaRow?.jumlah_rol ?? warnaRow?.stok_dipesan ?? 0);
      warnaMap.set(warnaKey, (warnaMap.get(warnaKey) || 0) + qty);
    });
  });

  return map;
};

const buildBahanGroups = (masterRows, spkRows) => {
  const orderMapByBahanId = buildOrderMapByBahanId(spkRows);
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
          const dipesan = warnaGroup.sourceRows.reduce((total, row) => {
            const bahanOrderMap = orderMapByBahanId.get(Number(row?.id));
            if (!bahanOrderMap) return total;
            const warnaKey = normalizeWarnaKey(row?.warna_bahan);
            return total + (Number(bahanOrderMap.get(warnaKey)) || 0);
          }, 0);

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

const BahanList = () => {
  const [masterRows, setMasterRows] = useState([]);
  const [spkRows, setSpkRows] = useState([]);
  const [selectedBahanKey, setSelectedBahanKey] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [bahanData, spkData] = await Promise.all([
        fetchAllPaginated("/bahan"),
        fetchAllPaginated("/spk-bahan", { sort_by: "id", sort_dir: "desc" }),
      ]);

      setMasterRows(bahanData);
      setSpkRows(spkData);
      setLastSyncAt(new Date().toISOString());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
      setMasterRows([]);
      setSpkRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const bahanGroups = useMemo(() => buildBahanGroups(masterRows, spkRows), [masterRows, spkRows]);

  const filteredBahanGroups = useMemo(() => {
    const query = normalizeText(searchTerm);
    if (!query) return bahanGroups;

    return bahanGroups.filter((group) =>
      normalizeText(group.nama_bahan_list?.join(" ")).includes(query)
    );
  }, [bahanGroups, searchTerm]);

  useEffect(() => {
    if (filteredBahanGroups.length === 0) {
      setSelectedBahanKey("");
      return;
    }

    setSelectedBahanKey((currentKey) =>
      filteredBahanGroups.some((group) => group.key === currentKey)
        ? currentKey
        : filteredBahanGroups[0].key
    );
  }, [filteredBahanGroups]);

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

  return (
    <div className="bahan-list-page">
      <div className="bahan-list-shell">
        <header className="bahan-list-topbar">
          <div className="bahan-list-title-side">
            <p className="bahan-list-breadcrumb">Gudang Bahan / List Bahan</p>
            <div className="bahan-list-title-row">
              <div className="bahan-list-title-icon">
                <FaWarehouse />
              </div>
              <div>
                <h1>Bahan List</h1>
                <p>Ringkasan stok gudang awal, total dipesan, dan grand total per warna.</p>
              </div>
            </div>
          </div>

          <div className="bahan-list-meta-side">
            <div className="bahan-list-meta-card">
              <span>Terakhir Sinkron</span>
              <strong>{formatDateTime(lastSyncAt)}</strong>
            </div>
            <button type="button" className="bahan-list-refresh-btn" onClick={loadData} disabled={loading}>
              <FaSync className={loading ? "is-spinning" : ""} />
              Refresh
            </button>
          </div>
        </header>

        <section className="bahan-list-toolbar">
          <label className="bahan-list-select-wrap">
            <span>Group Bahan</span>
            <select
              value={selectedBahanKey}
              onChange={(event) => setSelectedBahanKey(event.target.value)}
              disabled={loading || bahanGroups.length === 0}
            >
              {bahanGroups.length === 0 ? (
                <option value="">Tidak ada data group bahan</option>
              ) : filteredBahanGroups.length === 0 ? (
                <option value="">Group bahan tidak ditemukan</option>
              ) : (
                filteredBahanGroups.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.group_bahan} ({group.total_warna} warna)
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="bahan-list-search-wrap">
            <FaSearch />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari nama bahan..."
            />
          </label>
        </section>

        {loading ? (
          <div className="bahan-list-state">Memuat data bahan list...</div>
        ) : error ? (
          <div className="bahan-list-state error">{error}</div>
        ) : !selectedMaterial ? (
          <div className="bahan-list-state">
            {searchTerm ? "Group bahan tidak ditemukan." : "Belum ada data group bahan yang bisa ditampilkan."}
          </div>
        ) : (
          <>
            <section className="bahan-list-content-card">
              <div className="bahan-list-card-head">
                <div>
                  <h3>Tabel Stok Bahan</h3>
                  <p>Group bahan: {selectedMaterial.group_bahan}</p>
                </div>

                <div className="bahan-list-content-meta">
                  <span>{formatDateTime(lastSyncAt)}</span>
                  <span>{materialPabrikLabel}</span>
                  <span>{visibleRows.length} warna</span>
                </div>
              </div>

              <div className="bahan-list-content-grid">
                <article className="bahan-list-table-panel">
                  <div className="bahan-list-table-wrap">
                    <table className="bahan-list-table">
                      <colgroup>
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "30%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "25%" }} />
                      </colgroup>
                      <thead>
                        {/* FIXED: alignment */}
                        <tr>
                          <th className="cell-no">No</th>
                          <th>Warna</th>
                          <th>Stok Gudang - Total</th>
                          <th>Dipesan - Total</th>
                          <th>Grand Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="bahan-list-empty-cell">
                              Tidak ada warna yang sesuai pencarian.
                            </td>
                          </tr>
                        ) : (
                          visibleRows.map((row, index) => {
                            const warnaStyle = resolveWarnaStyle(row.warna);

                            return (
                              /* FIXED: alignment */
                              <tr key={row.key}>
                                <td className="cell-no">{index + 1}</td>
                                <td className="bahan-list-warna-cell">
                                  <span
                                    className="bahan-list-warna-dot"
                                    style={{
                                      backgroundColor: warnaStyle.backgroundColor,
                                      borderColor: warnaStyle.borderColor,
                                    }}
                                  />
                                  <strong>{row.warna}</strong>
                                </td>
                                <td className="bahan-list-number-cell">{formatRoll(row.stok_gudang)}</td>
                                <td className="bahan-list-number-cell">{formatRoll(row.dipesan)}</td>
                                <td className="bahan-list-number-cell bahan-list-grand-cell">{formatRoll(row.grand_total)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {visibleRows.length > 0 && (
                        <tfoot>
                          {/* FIXED: alignment */}
                          <tr>
                            <td colSpan="2" className="bahan-list-total-label">TOTAL</td>
                            <td className="bahan-list-number-cell">{formatRoll(visibleTotals.stok)}</td>
                            <td className="bahan-list-number-cell">{formatRoll(visibleTotals.dipesan)}</td>
                            <td className="bahan-list-number-cell">{formatRoll(visibleTotals.grand)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </article>

                <aside className="bahan-list-preview-panel">
                  <div className="bahan-list-preview-head">
                    <div>
                      <h3>Preview Gambar</h3>
                      <p>{selectedPreviewRow?.image_url ? "1 gambar tampil" : "Belum ada gambar"}</p>
                    </div>
                    <FaImage />
                  </div>

                  <div className="bahan-list-preview-grid">
                    {!selectedPreviewRow ? (
                      <div className="bahan-list-palette-empty">Tidak ada preview gambar.</div>
                    ) : (
                      <div
                        className="bahan-list-image-preview"
                        title={`${selectedMaterial.group_bahan}: ${formatRoll(visibleTotals.grand)}`}
                      >
                        {selectedPreviewRow.image_url ? (
                          <img src={selectedPreviewRow.image_url} alt={`Preview ${selectedMaterial.group_bahan}`} />
                        ) : (
                          <div className="bahan-list-image-placeholder">
                            <FaImage />
                          </div>
                        )}
                        <div className="bahan-list-image-caption">
                          <strong>{selectedMaterial.group_bahan}</strong>
                          <span>
                            {formatNumber(visibleRows.length)} warna / {formatRoll(visibleTotals.grand)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default BahanList;
