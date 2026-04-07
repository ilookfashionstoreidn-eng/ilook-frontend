import React, { useEffect, useMemo, useState } from "react";
import { FaBoxes, FaSearchLocation } from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import {
  getAllSlots,
  getSlotStockSummaryMap,
} from "./GudangProdukMockStore";
import { GudangLayoutMap, GudangStatCard, buildSlotHeadline } from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";

const StokLokasiGudang = () => {
  const { state, isLoading, error } = useGudangProdukWorkspace();
  const [layoutId, setLayoutId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [skuFilter, setSkuFilter] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (!layoutId && state.layouts.length) {
      setLayoutId(state.layouts[0].id);
    }
  }, [layoutId, state.layouts]);

  const selectedLayout = useMemo(
    () => state.layouts.find((layout) => layout.id === layoutId) || state.layouts[0] || null,
    [layoutId, state.layouts]
  );
  const selectedSkuLabel = useMemo(
    () =>
      state.skus.find((sku) => String(sku.id) === String(skuFilter))?.label || "",
    [skuFilter, state.skus]
  );

  const stockSummaryBySlot = useMemo(() => getSlotStockSummaryMap(state), [state]);
  const slotRows = useMemo(() => {
    const slots = getAllSlots(state).map((slot) => {
      const summary = stockSummaryBySlot[slot.id];
      return {
        ...slot,
        totalQty: summary?.qty || 0,
        skuCount: summary?.skuCount || 0,
        lines: summary?.lines || [],
      };
    });

    return slots.filter((slot) => (selectedLayout ? slot.layoutId === selectedLayout.id : true));
  }, [selectedLayout, state, stockSummaryBySlot]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return slotRows.filter((slot) => {
      const matchSearch =
        !term ||
        slot.slotCode.toLowerCase().includes(term) ||
        String(slot.alias || "").toLowerCase().includes(term) ||
        String(slot.blockCode || "").toLowerCase().includes(term) ||
        String(slot.rackLabel || "").toLowerCase().includes(term) ||
        slot.lines.some(
          (line) =>
            line.sku?.label?.toLowerCase().includes(term) ||
            line.sku?.code?.toLowerCase().includes(term) ||
            line.product?.name?.toLowerCase().includes(term)
        );

      const matchSku =
        !skuFilter || slot.lines.some((line) => String(line.skuId) === String(skuFilter));
      const matchFilled = showEmpty || slot.totalQty > 0;
      const matchSelectedSlot = !selectedSlot || slot.id === selectedSlot.id;

      return matchSearch && matchSku && matchFilled && matchSelectedSlot;
    });
  }, [searchTerm, selectedSlot, showEmpty, skuFilter, slotRows]);

  const highlightedSlotIds = useMemo(
    () =>
      skuFilter
        ? slotRows
            .filter((slot) => slot.lines.some((line) => String(line.skuId) === String(skuFilter)))
            .map((slot) => slot.id)
        : [],
    [skuFilter, slotRows]
  );

  const summary = {
    slotCount: filteredRows.length,
    filledSlots: filteredRows.filter((slot) => slot.totalQty > 0).length,
    emptySlots: filteredRows.filter((slot) => slot.totalQty === 0).length,
    totalQty: filteredRows.reduce((total, slot) => total + slot.totalQty, 0),
  };

  useEffect(() => {
    if (selectedSlot && selectedLayout && selectedSlot.layoutId !== selectedLayout.id) {
      setSelectedSlot(null);
    }
  }, [selectedLayout, selectedSlot]);

  return (
    <GudangProdukBaseShell
      title="Stok per Lokasi Gudang"
      subtitle="Lihat isi setiap slot gudang berdasarkan layout visual. Filter dapat mempersempit tampilan per gudang, per SKU, atau langsung dari slot di peta."
      icon={FaBoxes}
      statusLabel={isLoading ? "Memuat workspace..." : `${summary.filledSlots} slot terisi`}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Cari slot, alias, SKU, atau produk..."
    >
      {error ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      <div className="gudang-ui-stat-grid">
        <GudangStatCard label="Slot Ditampilkan" value={summary.slotCount} helper="hasil filter aktif" />
        <GudangStatCard label="Slot Terisi" value={summary.filledSlots} helper="lokasi dengan stok" />
        <GudangStatCard label="Slot Kosong" value={summary.emptySlots} helper="tetap terlihat bila diaktifkan" />
        <GudangStatCard label="Total Qty" value={summary.totalQty} helper="qty semua slot hasil filter" />
      </div>

      <div className="gudang-ui-grid split-hero">
        <section className="gudang-ui-panel">
          <div className="gudang-ui-panel-head">
            <div>
              <h2>Filter Lokasi</h2>
              <p>Pilih gudang dan SKU, lalu klik slot di peta bila ingin fokus ke satu lokasi.</p>
            </div>
          </div>

          <div className="gudang-ui-form-grid">
            <div className="gudang-ui-field">
              <label>Gudang Produk</label>
              <select value={layoutId} onChange={(event) => setLayoutId(event.target.value)}>
                {state.layouts.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {layout.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="gudang-ui-field">
              <label>Filter SKU</label>
              <select
                value={skuFilter === "" ? "" : String(skuFilter)}
                onChange={(event) =>
                  setSkuFilter(event.target.value === "" ? "" : Number(event.target.value))
                }
              >
                <option value="">Semua SKU</option>
                {state.skus.map((sku) => (
                  <option key={sku.id} value={sku.id}>
                    {sku.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="gudang-ui-form-actions">
            <button
              type="button"
              className="gudang-ui-button-secondary"
              onClick={() => setShowEmpty((prev) => !prev)}
            >
              <FaBoxes /> {showEmpty ? "Sembunyikan Slot Kosong" : "Tampilkan Slot Kosong"}
            </button>
            {selectedSlot ? (
              <button
                type="button"
                className="gudang-ui-button-secondary"
                onClick={() => setSelectedSlot(null)}
              >
                Reset Fokus Slot
              </button>
            ) : null}
          </div>

          {skuFilter ? (
            <div className="gudang-ui-callout gudang-ui-callout-highlight" style={{ marginTop: 16 }}>
              <strong>Highlight SKU aktif</strong>
              <div style={{ marginTop: 6 }}>
                {selectedSkuLabel || "SKU terpilih"} ditemukan di {highlightedSlotIds.length} lokasi pada
                peta.
              </div>
            </div>
          ) : null}

          <div className="gudang-ui-detail-box" style={{ marginTop: 18 }}>
            <h4>Slot Fokus</h4>
            {selectedSlot ? (
              <>
                <p>{buildSlotHeadline(selectedSlot)}</p>
                <div className="gudang-ui-pill-list" style={{ marginTop: 12 }}>
                  {(stockSummaryBySlot[selectedSlot.id]?.lines || []).map((line) => (
                    <span key={line.id} className="gudang-ui-pill">
                      {line.sku?.label} | {line.qty} pcs
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p>Belum ada slot dipilih dari peta.</p>
            )}
          </div>
        </section>

        <section className="gudang-ui-panel">
          <div className="gudang-ui-panel-head">
            <div>
              <h2>Peta Lokasi</h2>
              <p>Gunakan peta untuk menyorot lokasi tertentu.</p>
            </div>
          </div>
          <GudangLayoutMap
            layout={selectedLayout}
            selectedSlotId={selectedSlot?.id}
            onSelectSlot={setSelectedSlot}
            stockSummaryBySlot={stockSummaryBySlot}
            highlightedSlotIds={highlightedSlotIds}
          />
        </section>
      </div>

      <section className="gudang-ui-panel" style={{ marginTop: 20 }}>
        <div className="gudang-ui-panel-head">
          <div>
            <h2>Daftar Slot</h2>
            <p>Ringkasan stok per lokasi berdasarkan data workspace yang aktif.</p>
          </div>
        </div>

        {filteredRows.length ? (
          <div className="gudang-ui-table-shell">
            <table className="gudang-ui-table">
              <thead>
                <tr>
                  <th>Lokasi</th>
                  <th>Alias</th>
                  <th>Rak</th>
                  <th>Total Qty</th>
                  <th>Varian SKU</th>
                  <th>Isi Slot</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((slot) => (
                  <tr key={slot.id}>
                    <td>
                      <strong>{slot.slotCode}</strong>
                      <div style={{ marginTop: 6, color: "#6b7f95" }}>
                        Lantai {slot.floorNumber} | Blok {slot.blockCode} | Baris {slot.rowNumber}
                      </div>
                    </td>
                    <td>{slot.alias || "-"}</td>
                    <td>
                      Rak {String(slot.rackNumber).padStart(2, "0")}
                      <div style={{ marginTop: 6, color: "#6b7f95" }}>{slot.rackLabel || "-"}</div>
                    </td>
                    <td>{slot.totalQty} pcs</td>
                    <td>{slot.skuCount}</td>
                    <td>
                      {slot.lines.length ? (
                        <div className="gudang-ui-pill-list">
                          {slot.lines.map((line) => (
                            <span key={line.id} className="gudang-ui-pill">
                              {line.sku?.label} | {line.qty}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "#6b7f95" }}>Kosong</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gudang-ui-empty-panel">
            <FaSearchLocation style={{ marginBottom: 10 }} />
            <div>Tidak ada slot yang cocok dengan filter saat ini.</div>
          </div>
        )}
      </section>
    </GudangProdukBaseShell>
  );
};

export default StokLokasiGudang;
