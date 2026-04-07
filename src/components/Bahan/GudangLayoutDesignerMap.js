import React, { useMemo, useState } from "react";
import {
  buildSlotsFromLayout,
  generateSlotCode,
} from "./GudangProdukMockStore";

const clampColumns = (value, fallback = 3) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 4);
};

const GudangLayoutDesignerMap = ({
  layout,
  selectedSlotId,
  onSelectSlot,
  stockSummaryBySlot = {},
  onRackReorder,
  onBlockLayoutColumnsChange,
}) => {
  const [dragState, setDragState] = useState(null);

  const layoutSlots = useMemo(() => buildSlotsFromLayout(layout), [layout]);
  const floors = useMemo(
    () => [...(layout?.floors || [])].sort((a, b) => a.number - b.number),
    [layout]
  );

  if (!layout) {
    return <div className="gudang-ui-empty-panel">Pilih gudang terlebih dahulu.</div>;
  }

  if (!layout.floors?.length) {
    return (
      <div className="gudang-ui-empty-panel">
        Gudang ini belum punya layout. Tambahkan lantai, blok, dan rak untuk mulai membuat slot.
      </div>
    );
  }

  const handleDragStart = (floorId, blockId, sourceIndex, rackId) => {
    setDragState({ floorId, blockId, sourceIndex, rackId });
  };

  const clearDragState = () => setDragState(null);

  const handleDrop = (floorId, blockId, destinationIndex) => {
    if (!dragState) return;
    if (dragState.floorId !== floorId || dragState.blockId !== blockId) {
      clearDragState();
      return;
    }

    if (dragState.sourceIndex !== destinationIndex) {
      onRackReorder?.({
        floorId,
        blockId,
        sourceIndex: dragState.sourceIndex,
        destinationIndex,
      });
    }

    clearDragState();
  };

  return (
    <div className="gudang-layout-map">
      {floors.map((floor) => (
        <section key={floor.id} className="gudang-layout-floor">
          <div className="gudang-layout-floor-head">
            <div>
              <h3>{floor.label || `Lantai ${floor.number}`}</h3>
              <p>{(floor.blocks || []).length} blok aktif</p>
            </div>
          </div>

          <div className="gudang-layout-blocks">
            {[...(floor.blocks || [])]
              .sort((a, b) => String(a.code).localeCompare(String(b.code)))
              .map((block) => {
                const blockColumns = clampColumns(
                  block.layoutColumns,
                  Math.min(Math.max((block.racks || []).length || 1, 1), 3)
                );

                return (
                  <article key={block.id} className="gudang-layout-block">
                    <div className="gudang-layout-block-head designer">
                      <div>
                        <strong>{block.label || `Blok ${block.code}`}</strong>
                        <p className="gudang-layout-block-subtitle">
                          Geser rak lewat header kartunya untuk mengatur posisi tampil di preview.
                        </p>
                      </div>

                      <div className="gudang-layout-block-tools">
                        <label>
                          Kolom
                          <select
                            value={blockColumns}
                            onChange={(event) =>
                              onBlockLayoutColumnsChange?.({
                                floorId: floor.id,
                                blockId: block.id,
                                layoutColumns: Number(event.target.value),
                              })
                            }
                          >
                            {[1, 2, 3, 4].map((column) => (
                              <option key={column} value={column}>
                                {column}
                              </option>
                            ))}
                          </select>
                        </label>
                        <span>Kode {block.code}</span>
                      </div>
                    </div>

                    <div
                      className={[
                        "gudang-layout-racks",
                        dragState?.blockId === block.id ? "drag-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        gridTemplateColumns: `repeat(${blockColumns}, minmax(220px, 1fr))`,
                      }}
                    >
                      {(block.racks || []).map((rack, rackIndex) => (
                        <div
                          key={rack.id}
                          className={[
                            "gudang-layout-rack-card",
                            dragState?.rackId === rack.id ? "dragging" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleDrop(floor.id, block.id, rackIndex)}
                        >
                          <div
                            className="gudang-layout-rack-head editable"
                            draggable
                            onDragStart={() =>
                              handleDragStart(floor.id, block.id, rackIndex, rack.id)
                            }
                            onDragEnd={clearDragState}
                          >
                            <strong>Rak {String(rack.number).padStart(2, "0")}</strong>
                            <span>Geser rak</span>
                          </div>

                          <div className="gudang-layout-slot-grid">
                            {Array.from({ length: rack.rows }, (_, index) => {
                              const rowNumber = index + 1;
                              const slotId = `${layout.id}__F${floor.number}__B${String(
                                block.code
                              ).toUpperCase()}__R${rack.number}__ROW${rowNumber}`;
                              const slotCode = generateSlotCode(
                                floor.number,
                                block.code,
                                rack.number,
                                rowNumber
                              );
                              const slotSummary = stockSummaryBySlot[slotId];
                              const isSelected = selectedSlotId === slotId;
                              const hasStock = Boolean(slotSummary?.qty);
                              const alias = layout.slotAliases?.[slotId];

                              return (
                                <button
                                  key={slotId}
                                  type="button"
                                  className={[
                                    "gudang-layout-slot-button",
                                    isSelected ? "selected" : "",
                                    hasStock ? "filled" : "empty",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  onClick={() =>
                                    onSelectSlot?.(layoutSlots.find((slot) => slot.id === slotId))
                                  }
                                >
                                  <strong>{slotCode}</strong>
                                  <span>Baris {rowNumber}</span>
                                  <small>
                                    {hasStock
                                      ? `${slotSummary.qty} pcs | ${slotSummary.skuCount} SKU`
                                      : alias || "Kosong"}
                                  </small>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default GudangLayoutDesignerMap;
