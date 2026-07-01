import React, { useState, useMemo } from "react";
import { FaExchangeAlt, FaSave, FaSpinner, FaArrowRight } from "react-icons/fa";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";
import { mutateGudangProdukSku } from "./GudangProdukWorkspaceApi";
import { showGudangError, showGudangSuccess } from "./GudangProdukAlerts";
import { getAllSlots } from "./GudangProdukMockStore";
import "./GudangProdukWorkspace.css";

const MutasiGudangProduk = () => {
  const { state, refresh } = useGudangProdukWorkspace({ includeCatalog: true });
  const [loading, setLoading] = useState(false);

  // Form State
  const [fromSlotId, setFromSlotId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [qty, setQty] = useState("");
  const [toSlotId, setToSlotId] = useState("");
  const [notes, setNotes] = useState("");

  const allSlots = useMemo(() => {
    return getAllSlots(state);
  }, [state]);

  // Human-readable label for a slot
  const formatSlotLabel = (slot) => {
    const parts = [];
    if (slot.layoutName) parts.push(slot.layoutName);
    if (slot.floorLabel) {
      parts.push(slot.floorLabel);
    } else if (slot.floorNumber) {
      parts.push(`Lantai ${slot.floorNumber}`);
    }
    if (slot.blockLabel) {
      parts.push(slot.blockLabel);
    } else if (slot.blockCode) {
      parts.push(`Blok ${slot.blockCode}`);
    }
    const rackPart = slot.rackLabel || `Rak ${String(slot.rackNumber).padStart(2, '0')}`;
    parts.push(`${rackPart} / Baris ${slot.rowNumber}`);
    return parts.join(' › ');
  };

  const stockEntries = state?.stockEntries || [];
  const skus = state?.skus || [];

  // Available Source Slots (only those with stock)
  const sourceSlots = useMemo(() => {
    const slotIds = new Set(stockEntries.filter(e => e.qty > 0).map(e => e.slotId));
    return allSlots.filter(s => slotIds.has(s.id));
  }, [stockEntries, allSlots]);

  // Available SKUs in selected source slot
  const availableSkus = useMemo(() => {
    if (!fromSlotId) return [];
    return stockEntries
      .filter(e => e.slotId === fromSlotId && e.qty > 0)
      .map(e => {
        const sku = skus.find(c => String(c.id) === String(e.skuId));
        return {
          ...e,
          skuCode: sku?.code || sku?.sku || sku?.label || "Unknown SKU",
          brand: sku?.brand || "",
        };
      });
  }, [fromSlotId, stockEntries, skus]);

  // Max Qty for selected SKU in selected Slot
  const maxQty = useMemo(() => {
    if (!fromSlotId || !skuId) return 0;
    const entry = availableSkus.find(e => String(e.skuId) === String(skuId));
    return entry ? entry.qty : 0;
  }, [fromSlotId, skuId, availableSkus]);

  // Auto reset dependent fields
  const handleSourceSlotChange = (e) => {
    setFromSlotId(e.target.value);
    setSkuId("");
    setQty("");
  };

  const handleSkuChange = (e) => {
    setSkuId(e.target.value);
    setQty("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromSlotId || !skuId || !qty || !toSlotId) {
      showGudangError("Mohon lengkapi semua form mutasi.");
      return;
    }
    if (fromSlotId === toSlotId) {
      showGudangError("Slot tujuan tidak boleh sama dengan slot asal.");
      return;
    }
    if (parseInt(qty) > maxQty) {
      showGudangError("Qty melebihi stok yang tersedia.");
      return;
    }

    try {
      setLoading(true);
      await mutateGudangProdukSku({
        fromSlotId,
        toSlotId,
        skuId: parseInt(skuId),
        qty: parseInt(qty),
        notes,
      });
      showGudangSuccess("Mutasi berhasil disimpan.");
      setFromSlotId("");
      setSkuId("");
      setQty("");
      setToSlotId("");
      setNotes("");
      await refresh({ silent: true, includeCatalog: true });
    } catch (err) {
      showGudangError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Gagal melakukan mutasi."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setFromSlotId("");
    setSkuId("");
    setQty("");
    setToSlotId("");
    setNotes("");
  };

  return (
    <div className="ks-page sog-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Mutasi Stok Gudang</h1>
          <span className="ks-header-sub">
            Pindahkan stok produk antar slot tanpa perlu barcode scanning
            (Direct Transfer).
          </span>
        </div>
        <div className="ks-header-actions">
          <button type="button" className="ks-btn" onClick={resetSession}>
            Reset Form
          </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Slot Asal Dipilih</span>
          <span className="ks-stat-value">
              {fromSlotId
                ? (sourceSlots.find(s => s.id === fromSlotId)?.slotCode || fromSlotId)
                : "\u2014"}
            </span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">SKU Dipilih</span>
          <span className="ks-stat-value">
            {skuId
              ? availableSkus.find(
                  (s) => String(s.skuId) === String(skuId)
                )?.skuCode
              : "\u2014"}
          </span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Stok Tersedia</span>
          <span className="ks-stat-value">{maxQty} pcs</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Status</span>
          <span className="ks-stat-value">
            {loading ? "Menyimpan..." : "Siap"}
          </span>
        </div>
      </div>

      <section className="ks-board sog-board">
        <div className="sog-scroll">
          <div className="opname-page">
            <div
              className="opname-step-content"
              style={{ maxWidth: 800, margin: "0 auto" }}
            >
              <div className="opname-section-header">
                <h2>
                  <FaExchangeAlt className="opname-section-icon" />
                  Detail Mutasi
                </h2>
                <p>
                  Lengkapi formulir di bawah ini untuk memindahkan barang.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                style={{ padding: "0 16px 16px" }}
              >
                <div className="gudang-ui-form-grid" style={{ gap: "12px" }}>
                  <label className="gudang-ui-field">
                    <span>1. Pilih Slot Asal</span>
                    <select
                      className="ks-input"
                      value={fromSlotId}
                      onChange={handleSourceSlotChange}
                      required
                    >
                      <option value="">-- Cari / Pilih Slot Asal --</option>
                      {sourceSlots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatSlotLabel(s)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>2. Pilih SKU Produk</span>
                    <select
                      className="ks-input"
                      value={skuId}
                      onChange={handleSkuChange}
                      required
                      disabled={!fromSlotId}
                    >
                      <option value="">-- Pilih SKU di Slot --</option>
                      {availableSkus.map((s) => (
                        <option key={s.skuId} value={s.skuId}>
                          {s.skuCode} (Sisa: {s.qty})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>3. Jumlah (Qty)</span>
                    <input
                      type="number"
                      className="ks-input"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      min="1"
                      max={maxQty}
                      required
                      disabled={!skuId}
                      placeholder={
                        skuId ? `Maksimal: ${maxQty}` : "0"
                      }
                    />
                  </label>

                  <label className="gudang-ui-field">
                    <span>4. Pilih Slot Tujuan</span>
                    <select
                      className="ks-input"
                      value={toSlotId}
                      onChange={(e) => setToSlotId(e.target.value)}
                      required
                    >
                      <option value="">
                        -- Cari / Pilih Slot Tujuan --
                      </option>
                      {allSlots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatSlotLabel(s)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="gudang-ui-field">
                    <span>Catatan (Opsional)</span>
                    <input
                      type="text"
                      className="ks-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alasan mutasi..."
                    />
                  </label>
                </div>

                <div
                  style={{
                    marginTop: "24px",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "20px",
                  }}
                >
                  <button
                    type="submit"
                    className="ks-btn ks-btn-primary"
                    style={{
                      width: "100%",
                      padding: "14px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "1rem",
                    }}
                    disabled={loading || !qty || !toSlotId}
                  >
                    {loading ? (
                      <FaSpinner className="fa-spin" />
                    ) : (
                      <FaSave />
                    )}
                    Eksekusi Mutasi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MutasiGudangProduk;
