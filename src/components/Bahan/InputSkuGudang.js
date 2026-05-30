import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import {
  FaBarcode,
  FaCheckCircle,
  FaDownload,
  FaPlus,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import { buildGudangWorkspaceErrorMessage } from "./GudangProdukWorkspaceApi";
import { showGudangError, showGudangWarning } from "./GudangProdukAlerts";

const makeSkuRow = () => ({
  id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  sku: "",
  qty: 1,
});

const normalizeText = (value) => String(value || "").trim().toUpperCase();

const sanitizeDownloadName = (value) =>
  String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

const getProductListSkuName = (item) => String(item?.sku_name || item?.sku || "").trim();

const getProductListOptionLabel = (item) => {
  const skuName = getProductListSkuName(item);
  const productName = String(item?.product || "").trim();
  const details = [item?.product_colour, item?.product_size].filter(Boolean).join(" ");

  return [skuName, productName, details].filter(Boolean).join(" - ");
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const getBarcodeDownloadErrorMessage = async (error, fallback) => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    const text = await data.text();

    try {
      const parsed = JSON.parse(text);
      return parsed?.message || fallback;
    } catch {
      return text || fallback;
    }
  }

  return buildGudangWorkspaceErrorMessage(error, fallback);
};

const InputSkuGudang = () => {
  const [serialBase, setSerialBase] = useState("");
  const [skuRows, setSkuRows] = useState([makeSkuRow()]);
  const [downloadingRowId, setDownloadingRowId] = useState("");
  const [productListOptions, setProductListOptions] = useState([]);
  const [productListLoading, setProductListLoading] = useState(false);
  const [productListError, setProductListError] = useState("");
  const [activeProductListRowId, setActiveProductListRowId] = useState("");
  const [debouncedProductListSearch, setDebouncedProductListSearch] = useState("");

  const activeProductListSearch = useMemo(() => {
    const activeRow = skuRows.find((row) => row.id === activeProductListRowId);
    return String(activeRow?.sku || "").trim();
  }, [activeProductListRowId, skuRows]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedProductListSearch(activeProductListSearch);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [activeProductListSearch]);

  useEffect(() => {
    let ignore = false;

    const fetchProductListOptions = async () => {
      try {
        setProductListLoading(true);
        setProductListError("");

        const response = await API.get("/product-list", {
          params: {
            search: debouncedProductListSearch || "",
            page: 1,
            per_page: 500,
            sortBy: "sku_name",
            sortOrder: "asc",
          },
        });

        if (ignore) return;

        setProductListOptions(Array.isArray(response?.data?.data) ? response.data.data : []);
      } catch (fetchError) {
        if (ignore) return;

        setProductListOptions([]);
        setProductListError(
          fetchError?.response?.data?.message ||
            fetchError?.message ||
            "Gagal mengambil data Product List."
        );
      } finally {
        if (!ignore) {
          setProductListLoading(false);
        }
      }
    };

    fetchProductListOptions();

    return () => {
      ignore = true;
    };
  }, [debouncedProductListSearch]);

  const normalizedRows = useMemo(() => {
    let cursor = 1;

    return skuRows.map((row) => {
      const skuText = normalizeText(row.sku);
      const qty = Math.max(1, Number(row.qty) || 1);
      const startNumber = cursor;
      const endNumber = cursor + qty - 1;
      cursor += qty;

      return {
        ...row,
        skuText,
        qty,
        startNumber,
        endNumber,
        serialRange:
          qty === 1
            ? `${normalizeText(serialBase)}.${startNumber}`
            : `${normalizeText(serialBase)}.${startNumber} - ${normalizeText(serialBase)}.${endNumber}`,
      };
    });
  }, [serialBase, skuRows]);

  const validRows = normalizedRows.filter((row) => row.skuText && row.qty > 0);
  const totalQty = validRows.reduce((total, row) => total + row.qty, 0);
  const serialReady = Boolean(normalizeText(serialBase));
  const barcodeReady = serialReady && validRows.length === skuRows.length && totalQty > 0;

  const buildBarcodePayload = (rows) => ({
    serial_base: normalizeText(serialBase),
    items: rows.map((row) => ({
      sku: row.skuText,
      qty: row.qty,
      start_number: row.startNumber,
    })),
  });

  const getProductListMatches = (row) => {
    const keyword = String(row.sku || "").trim().toLowerCase();

    return productListOptions
      .filter((item) => {
        if (!keyword) return true;

        return [
          item?.sku_name,
          item?.sku,
          item?.product,
          item?.product_group,
          item?.product_source,
          item?.product_colour,
          item?.product_size,
        ].some((value) => String(value || "").toLowerCase().includes(keyword));
      })
      .slice(0, 12);
  };

  const handleRowChange = (rowId, field, value) => {
    if (field === "sku") {
      setActiveProductListRowId(rowId);
    }

    setSkuRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: field === "qty" ? Math.max(1, Number(value) || 1) : value.toUpperCase(),
            }
          : row
      )
    );
  };

  const handleSelectProductListSku = (rowId, item) => {
    const skuName = getProductListSkuName(item).toUpperCase();
    if (!skuName) return;

    setSkuRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, sku: skuName } : row))
    );
    setActiveProductListRowId("");
  };

  const handleAddSkuRow = () => {
    setSkuRows((currentRows) => [...currentRows, makeSkuRow()]);
  };

  const handleRemoveSkuRow = (rowId) => {
    setSkuRows((currentRows) =>
      currentRows.length === 1 ? currentRows : currentRows.filter((row) => row.id !== rowId)
    );
  };

  const handleDownloadBarcode = async (row = null) => {
    const rows = row ? [row] : validRows;

    if (!serialReady) {
      await showGudangWarning("Barcode belum siap", "Isi kode seri terlebih dahulu.");
      return;
    }

    if (!rows.length || rows.some((item) => !item.skuText)) {
      await showGudangWarning("Barcode belum siap", "Isi minimal satu SKU dan qty terlebih dahulu.");
      return;
    }

    try {
      setDownloadingRowId(row?.id || "__all__");

      const response = await API.post(
        "/gudang-produk-workspace/serial-barcodes",
        buildBarcodePayload(rows),
        { responseType: "blob" }
      );
      const contentType = String(response?.headers?.["content-type"] || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const text = await response.data.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed?.message || "Backend mengembalikan error saat membuat barcode.");
      }

      const suffix = row ? row.skuText : "semua-sku";
      downloadBlob(
        response.data,
        `barcode-${sanitizeDownloadName(normalizeText(serialBase))}-${sanitizeDownloadName(suffix)}.pdf`
      );
    } catch (downloadError) {
      await showGudangError(
        "Gagal unduh barcode",
        await getBarcodeDownloadErrorMessage(downloadError, "Barcode SKU tidak bisa diunduh.")
      );
    } finally {
      setDownloadingRowId("");
    }
  };

  return (
    <GudangProdukBaseShell
      title="Cetak Barcode SKU"
      subtitle="Input kode seri dan SKU untuk mendapatkan print PDF barcode. Menu ini tidak lagi memasukkan barang ke gudang."
      icon={FaBarcode}
      statusLabel={
        productListLoading
          ? "Memuat Product List..."
          : downloadingRowId
            ? "Membuat PDF..."
            : barcodeReady
              ? "Siap Cetak Barcode"
              : "Input Kode Seri"
      }
    >
      <section className="gudang-ui-panel" style={{ marginBottom: 20 }}>
        <div className="gudang-ui-panel-head">
          <div>
            <h2>Input Kode Seri</h2>
            <p>Masukkan kode seri dasar, lalu isi SKU dan qty barcode yang ingin dicetak.</p>
          </div>
          <button
            type="button"
            className="gudang-ui-button"
            onClick={() => handleDownloadBarcode()}
            disabled={!barcodeReady || downloadingRowId === "__all__"}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <FaDownload /> {downloadingRowId === "__all__" ? "Membuat PDF..." : "Unduh Semua PDF"}
          </button>
        </div>

        <div className="gudang-ui-form-grid">
          <div className="gudang-ui-field">
            <label>Kode Seri</label>
            <input
              value={serialBase}
              onChange={(event) => setSerialBase(event.target.value.toUpperCase())}
              placeholder="Contoh: 3100.112"
              autoComplete="off"
            />
          </div>

          <div className="gudang-ui-detail-box">
            <span>Total Barcode</span>
            <strong>{totalQty || 0} pcs</strong>
          </div>

          <div className="gudang-ui-detail-box">
            <span>Jumlah SKU</span>
            <strong>{validRows.length} SKU</strong>
          </div>
        </div>
      </section>

      <section className="gudang-ui-panel">
        <div className="gudang-ui-panel-head">
          <div>
            <h2>Daftar SKU Barcode</h2>
            <p>Pilih SKU dari Product List atau ketik manual, lalu unduh PDF per SKU atau sekaligus.</p>
          </div>
          <button
            type="button"
            className="gudang-ui-button"
            onClick={handleAddSkuRow}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <FaPlus /> Tambah SKU
          </button>
        </div>

        {productListError ? (
          <div
            className="gudang-ui-callout"
            style={{ background: "#fff5f5", borderColor: "#fecaca", color: "#b91c1c" }}
          >
            <strong>{productListError}</strong>
          </div>
        ) : null}

        <div className="gudang-serial-sku-stack">
          {normalizedRows.map((row, index) => (
            <div key={row.id} className="gudang-serial-sku-row">
              <div className="gudang-ui-field">
                <label>SKU #{index + 1}</label>
                <div style={{ position: "relative" }}>
                  <FaSearch
                    style={{
                      position: "absolute",
                      left: 12,
                      top: 14,
                      color: "#64748b",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    value={row.sku}
                    onChange={(event) => handleRowChange(row.id, "sku", event.target.value)}
                    onFocus={() => setActiveProductListRowId(row.id)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setActiveProductListRowId((currentRowId) =>
                          currentRowId === row.id ? "" : currentRowId
                        );
                      }, 120);
                    }}
                    placeholder="Cari / isi SKU"
                    autoComplete="off"
                    style={{ paddingLeft: 36 }}
                  />

                  {activeProductListRowId === row.id ? (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        background: "#fff",
                        border: "1px solid #d1dbe8",
                        borderRadius: 12,
                        boxShadow: "0 16px 32px rgba(15, 23, 42, 0.12)",
                        padding: 8,
                        maxHeight: 300,
                        overflowY: "auto",
                      }}
                    >
                      {productListLoading ? (
                        <div style={{ padding: "10px 12px", color: "#64748b", fontSize: 13 }}>
                          Memuat Product List...
                        </div>
                      ) : getProductListMatches(row).length ? (
                        getProductListMatches(row).map((item) => {
                          const skuName = getProductListSkuName(item);
                          return (
                            <button
                              key={item.id || skuName}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectProductListSku(row.id, item)}
                              style={{
                                width: "100%",
                                display: "block",
                                textAlign: "left",
                                border: "none",
                                background: normalizeText(skuName) === row.skuText ? "#edf4ff" : "transparent",
                                borderRadius: 8,
                                padding: "9px 10px",
                                cursor: "pointer",
                                marginBottom: 2,
                              }}
                            >
                              <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>
                                {skuName || "-"}
                              </strong>
                              <span style={{ display: "block", color: "#64748b", fontSize: 12, marginTop: 2 }}>
                                {getProductListOptionLabel(item) || "Product List"}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div style={{ padding: "10px 12px", color: "#64748b", fontSize: 13 }}>
                          Tidak ada saran Product List. SKU tetap bisa diketik manual.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="gudang-ui-field">
                <label>Qty</label>
                <input
                  type="number"
                  min="1"
                  value={row.qty}
                  onChange={(event) => handleRowChange(row.id, "qty", event.target.value)}
                />
              </div>

              <button
                type="button"
                className="gudang-ui-button-secondary"
                onClick={() => handleDownloadBarcode(row)}
                disabled={!serialReady || !row.skuText || downloadingRowId === row.id || downloadingRowId === "__all__"}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44 }}
              >
                <FaDownload /> {downloadingRowId === row.id ? "PDF..." : "PDF"}
              </button>

              <button
                type="button"
                className="gudang-ui-button-secondary"
                onClick={() => handleRemoveSkuRow(row.id)}
                disabled={skuRows.length === 1}
                style={{ height: 44, minWidth: 44, padding: "0 12px" }}
                aria-label="Hapus SKU"
              >
                <FaTimes />
              </button>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span className="gudang-ui-pill" style={{ background: "#fff", borderColor: "#c8d8f6", color: "#2458ce" }}>
                  {serialReady && row.skuText ? row.serialRange : "Isi kode seri dan SKU untuk melihat nomor barcode"}
                </span>
                {row.skuText ? (
                  <span className="gudang-ui-pill" style={{ background: "#ecfdf5", borderColor: "#b7e4d8", color: "#0f766e" }}>
                    Siap untuk PDF barcode
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="gudang-serial-total-row">
          <strong>
            Total {validRows.length} SKU / {totalQty} barcode
          </strong>
          <span
            className="gudang-ui-pill"
            style={{
              background: barcodeReady ? "#ecfdf5" : "#f8fafc",
              borderColor: barcodeReady ? "#b7e4d8" : "#dbe4ef",
              color: barcodeReady ? "#0f766e" : "#64748b",
            }}
          >
            {barcodeReady ? (
              <>
                <FaCheckCircle /> Siap diunduh
              </>
            ) : (
              "Lengkapi kode seri, SKU, dan qty"
            )}
          </span>
        </div>
      </section>
    </GudangProdukBaseShell>
  );
};

export default InputSkuGudang;
