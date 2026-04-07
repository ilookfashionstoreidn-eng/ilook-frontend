import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaLayerGroup, FaSave, FaTimes, FaUndo } from "react-icons/fa";
import {
  getDefaultRackLayoutPosition,
  normalizeBlockCanvas,
  resolveRackLayoutPosition,
} from "./GudangProdukMockStore";

const clampNumber = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const normalizeBlockDraft = (block) => {
  const draftBlock = {
    ...block,
    layoutColumns: clampNumber(block?.layoutColumns, 1, 4, 3),
    layoutCanvas: normalizeBlockCanvas(block),
  };

  return {
    ...draftBlock,
    racks: (draftBlock.racks || []).map((rack, index) => ({
      ...rack,
      layoutPosition: resolveRackLayoutPosition(rack, index, draftBlock),
    })),
  };
};

const buildLayoutDraft = (layout) => {
  if (!layout) return null;

  return {
    ...layout,
    floors: (layout.floors || []).map((floor) => ({
      ...floor,
      blocks: (floor.blocks || []).map((block) => normalizeBlockDraft(block)),
    })),
  };
};

const buildCanvasStyle = (canvas) => ({
  "--gudang-canvas-columns": canvas.columns,
  "--gudang-canvas-rows": canvas.rows,
  "--gudang-canvas-column-size": `${100 / canvas.columns}%`,
  "--gudang-canvas-row-size": `${100 / canvas.rows}%`,
});

const buildRackCardStyle = (position, canvas) => ({
  left: `${((position.x - 1) / canvas.columns) * 100}%`,
  top: `${((position.y - 1) / canvas.rows) * 100}%`,
  width: `${(position.w / canvas.columns) * 100}%`,
  height: `${(position.h / canvas.rows) * 100}%`,
});

const resizeHandles = [
  { key: "n", className: "north" },
  { key: "s", className: "south" },
  { key: "e", className: "east" },
  { key: "w", className: "west" },
  { key: "ne", className: "north-east" },
  { key: "nw", className: "north-west" },
  { key: "se", className: "south-east" },
  { key: "sw", className: "south-west" },
];

const getNextRackLayoutPosition = ({
  interactionMode,
  direction = "",
  startPosition,
  deltaX,
  deltaY,
  canvas,
}) => {
  if (!startPosition) return startPosition;

  const minWidth = 2;
  const minHeight = 2;

  if (interactionMode === "move") {
    return {
      ...startPosition,
      x: clampNumber(
        startPosition.x + deltaX,
        1,
        Math.max(canvas.columns - startPosition.w + 1, 1),
        startPosition.x
      ),
      y: clampNumber(
        startPosition.y + deltaY,
        1,
        Math.max(canvas.rows - startPosition.h + 1, 1),
        startPosition.y
      ),
    };
  }

  const nextPosition = { ...startPosition };

  if (direction.includes("w")) {
    const appliedDeltaX = clampNumber(
      deltaX,
      -(startPosition.x - 1),
      startPosition.w - minWidth,
      0
    );
    nextPosition.x = startPosition.x + appliedDeltaX;
    nextPosition.w = startPosition.w - appliedDeltaX;
  }

  if (direction.includes("e")) {
    nextPosition.w = clampNumber(
      startPosition.w + deltaX,
      minWidth,
      canvas.columns - nextPosition.x + 1,
      startPosition.w
    );
  }

  if (direction.includes("n")) {
    const appliedDeltaY = clampNumber(
      deltaY,
      -(startPosition.y - 1),
      startPosition.h - minHeight,
      0
    );
    nextPosition.y = startPosition.y + appliedDeltaY;
    nextPosition.h = startPosition.h - appliedDeltaY;
  }

  if (direction.includes("s")) {
    nextPosition.h = clampNumber(
      startPosition.h + deltaY,
      minHeight,
      canvas.rows - nextPosition.y + 1,
      startPosition.h
    );
  }

  return nextPosition;
};

const GudangLayoutEditorModal = ({
  isOpen,
  layout,
  initialFloorId,
  initialBlockId,
  onClose,
  onSave,
}) => {
  const [draftLayout, setDraftLayout] = useState(() => buildLayoutDraft(layout));
  const [activeFloorId, setActiveFloorId] = useState(initialFloorId || "");
  const [activeBlockId, setActiveBlockId] = useState(initialBlockId || "");
  const [selectedRackId, setSelectedRackId] = useState("");
  const [draggedRackId, setDraggedRackId] = useState("");
  const [interactionMode, setInteractionMode] = useState("");
  const canvasRef = useRef(null);
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setDraftLayout(buildLayoutDraft(layout));
    setActiveFloorId(initialFloorId || "");
    setActiveBlockId(initialBlockId || "");
    setSelectedRackId("");
    setDraggedRackId("");
    setInteractionMode("");
    dragStateRef.current = null;
  }, [initialBlockId, initialFloorId, isOpen, layout]);

  const floors = draftLayout?.floors || [];
  const activeFloor =
    floors.find((floor) => floor.id === activeFloorId) ||
    floors.find((floor) => floor.blocks?.length) ||
    floors[0] ||
    null;
  const activeBlock =
    activeFloor?.blocks?.find((block) => block.id === activeBlockId) ||
    activeFloor?.blocks?.[0] ||
    null;
  const selectedRack = activeBlock?.racks?.find((rack) => rack.id === selectedRackId) || null;
  const canvas = useMemo(
    () => (activeBlock ? normalizeBlockCanvas(activeBlock) : normalizeBlockCanvas(null)),
    [activeBlock]
  );

  useEffect(() => {
    if (!isOpen || !floors.length) return;

    if (!activeFloor || activeFloor.id !== activeFloorId) {
      setActiveFloorId(activeFloor?.id || "");
    }
  }, [activeFloor, activeFloorId, floors, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (!activeBlock || activeBlock.id !== activeBlockId) {
      setActiveBlockId(activeBlock?.id || "");
    }
  }, [activeBlock, activeBlockId, isOpen]);

  useEffect(() => {
    if (!activeBlock) {
      setSelectedRackId("");
      return;
    }

    const rackExists = activeBlock.racks?.some((rack) => rack.id === selectedRackId);
    if (!rackExists) {
      setSelectedRackId(activeBlock.racks?.[0]?.id || "");
    }
  }, [activeBlock, selectedRackId]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || !canvasRef.current) return;

      const cellWidth = dragState.rect.width / canvas.columns;
      const cellHeight = dragState.rect.height / canvas.rows;
      const deltaX = Math.round((event.clientX - dragState.startClientX) / Math.max(cellWidth, 1));
      const deltaY = Math.round((event.clientY - dragState.startClientY) / Math.max(cellHeight, 1));

      setDraftLayout((currentLayout) => {
        if (!currentLayout) return currentLayout;

        return {
          ...currentLayout,
          floors: currentLayout.floors.map((floor) =>
            floor.id === activeFloor?.id
              ? {
                  ...floor,
                  blocks: floor.blocks.map((block) =>
                    block.id === activeBlock?.id
                      ? normalizeBlockDraft({
                          ...block,
                          racks: block.racks.map((rack, index) =>
                            rack.id === dragState.rackId
                              ? {
                                  ...rack,
                                  layoutPosition: getNextRackLayoutPosition({
                                    interactionMode: dragState.mode,
                                    direction: dragState.direction,
                                    startPosition: dragState.startPosition,
                                    deltaX,
                                    deltaY,
                                    canvas,
                                  }),
                                }
                              : rack
                          ),
                        })
                      : block
                  ),
                }
              : floor
          ),
        };
      });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      setDraggedRackId("");
      setInteractionMode("");
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeBlock, activeFloor, canvas.columns, canvas.rows, isOpen]);

  const updateActiveBlock = (updater) => {
    setDraftLayout((currentLayout) => {
      if (!currentLayout || !activeFloor || !activeBlock) return currentLayout;

      return {
        ...currentLayout,
        floors: currentLayout.floors.map((floor) =>
          floor.id === activeFloor.id
            ? {
                ...floor,
                blocks: floor.blocks.map((block) =>
                  block.id === activeBlock.id ? normalizeBlockDraft(updater(block)) : block
                ),
              }
            : floor
        ),
      };
    });
  };

  const handleCanvasSettingChange = (field, value) => {
    updateActiveBlock((block) => ({
      ...block,
      layoutCanvas: {
        ...block.layoutCanvas,
        [field]: Number(value),
      },
    }));
  };

  const handleLayoutColumnsChange = (value) => {
    updateActiveBlock((block) => ({
      ...block,
      layoutColumns: Number(value),
    }));
  };

  const handleAutoArrange = () => {
    updateActiveBlock((block) => ({
      ...block,
      racks: block.racks.map((rack, index) => ({
        ...rack,
        layoutPosition: getDefaultRackLayoutPosition(rack, index, block),
      })),
    }));
  };

  const handleRackPropertyChange = (field, value) => {
    if (!selectedRack) return;

    updateActiveBlock((block) => ({
      ...block,
      racks: block.racks.map((rack, index) =>
        rack.id === selectedRack.id
          ? {
              ...rack,
              layoutPosition: {
                ...resolveRackLayoutPosition(rack, index, block),
                [field]: Number(value),
              },
            }
          : rack
      ),
    }));
  };

  const beginRackInteraction = (event, rack, rackIndex, mode, direction = "") => {
    if (!canvasRef.current) return;
    if (event.button !== undefined && event.button !== 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    dragStateRef.current = {
      mode,
      direction,
      rackId: rack.id,
      rect,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: resolveRackLayoutPosition(rack, rackIndex, activeBlock),
    };
    setSelectedRackId(rack.id);
    setDraggedRackId(rack.id);
    setInteractionMode(mode);
    event.stopPropagation();
    event.preventDefault();
  };

  if (!isOpen) return null;

  return (
    <div
      className="gudang-layout-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="gudang-layout-modal" role="dialog" aria-modal="true">
        <div className="gudang-layout-modal-head">
          <div>
            <h2>Edit Layout Rak</h2>
            <p>
              Posisi rak sekarang bisa bebas diatur di dalam kanvas blok. Drag aset untuk
              memindahkan rak, lalu tarik handle sisi atau sudutnya untuk mengubah lebar dan
              tinggi langsung dengan mouse.
            </p>
          </div>

          <button type="button" className="gudang-ui-icon-button" onClick={() => onClose?.()}>
            <FaTimes />
          </button>
        </div>

        {draftLayout && activeFloor && activeBlock ? (
          <>
            <div className="gudang-layout-modal-body">
              <aside className="gudang-layout-modal-sidebar">
                <div className="gudang-layout-modal-section">
                  <h4>Pilih Blok</h4>
                  <div className="gudang-layout-modal-floor-list">
                    {floors.map((floor) => (
                      <div key={floor.id} className="gudang-layout-modal-floor-group">
                        <strong>{floor.label}</strong>
                        <div className="gudang-layout-modal-block-list">
                          {(floor.blocks || []).map((block) => (
                            <button
                              key={block.id}
                              type="button"
                              className={[
                                "gudang-layout-modal-block-button",
                                block.id === activeBlock.id ? "active" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => {
                                setActiveFloorId(floor.id);
                                setActiveBlockId(block.id);
                              }}
                            >
                              <span>{block.label || `Blok ${block.code}`}</span>
                              <small>{(block.racks || []).length} rak</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="gudang-layout-modal-section">
                  <div className="gudang-layout-modal-section-head">
                    <h4>Aset Rak</h4>
                    <button
                      type="button"
                      className="gudang-ui-button-secondary"
                      onClick={handleAutoArrange}
                    >
                      <FaUndo /> Susun Otomatis
                    </button>
                  </div>

                  <div className="gudang-layout-modal-asset-list">
                    {(activeBlock.racks || []).map((rack) => {
                      const position =
                        activeBlock.racks.find((item) => item.id === rack.id)?.layoutPosition ||
                        null;

                      return (
                        <button
                          key={rack.id}
                          type="button"
                          className={[
                            "gudang-layout-modal-asset-card",
                            rack.id === selectedRack?.id ? "active" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => setSelectedRackId(rack.id)}
                        >
                          <strong>Rak {String(rack.number).padStart(2, "0")}</strong>
                          <span>{rack.label || "Tanpa label"}</span>
                          <small>
                            {rack.rows} baris | x{position?.x || 1} y{position?.y || 1}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedRack ? (
                  <div className="gudang-layout-modal-section">
                    <h4>Properti Rak</h4>
                    <div className="gudang-ui-form-grid">
                      <div className="gudang-ui-field">
                        <label>Posisi X</label>
                        <input
                          type="number"
                          min="1"
                          max={canvas.columns}
                          value={selectedRack.layoutPosition?.x || 1}
                          onChange={(event) =>
                            handleRackPropertyChange("x", event.target.value)
                          }
                        />
                      </div>
                      <div className="gudang-ui-field">
                        <label>Posisi Y</label>
                        <input
                          type="number"
                          min="1"
                          max={canvas.rows}
                          value={selectedRack.layoutPosition?.y || 1}
                          onChange={(event) =>
                            handleRackPropertyChange("y", event.target.value)
                          }
                        />
                      </div>
                      <div className="gudang-ui-field">
                        <label>Lebar</label>
                        <input
                          type="number"
                          min="2"
                          max={canvas.columns}
                          value={selectedRack.layoutPosition?.w || 2}
                          onChange={(event) =>
                            handleRackPropertyChange("w", event.target.value)
                          }
                        />
                      </div>
                      <div className="gudang-ui-field">
                        <label>Tinggi</label>
                        <input
                          type="number"
                          min="2"
                          max={canvas.rows}
                          value={selectedRack.layoutPosition?.h || 2}
                          onChange={(event) =>
                            handleRackPropertyChange("h", event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </aside>

              <section className="gudang-layout-modal-canvas-panel">
                <div className="gudang-layout-modal-toolbar">
                  <div className="gudang-layout-modal-toolbar-group">
                    <div className="gudang-ui-field">
                      <label>Auto Grid Kolom</label>
                      <select
                        value={activeBlock.layoutColumns || 3}
                        onChange={(event) => handleLayoutColumnsChange(event.target.value)}
                      >
                        {[1, 2, 3, 4].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="gudang-ui-field">
                      <label>Grid Kanvas X</label>
                      <select
                        value={canvas.columns}
                        onChange={(event) =>
                          handleCanvasSettingChange("columns", event.target.value)
                        }
                      >
                        {[8, 10, 12, 16, 20].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="gudang-ui-field">
                      <label>Grid Kanvas Y</label>
                      <select
                        value={canvas.rows}
                        onChange={(event) => handleCanvasSettingChange("rows", event.target.value)}
                      >
                        {[6, 8, 10, 12, 14].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="gudang-layout-modal-toolbar-note">
                    <FaLayerGroup />
                    <span>
                      Sedang edit {activeFloor.label} / {activeBlock.label || `Blok ${activeBlock.code}`}
                    </span>
                  </div>
                </div>

                <div className="gudang-layout-editor-shell">
                  <div className="gudang-layout-editor-note">
                    Drag rak dari header kartunya. Untuk resize, tarik titik di atas, bawah,
                    kiri, kanan, atau sudut rak. Semua gerakan akan snap ke grid supaya tetap
                    rapi saat dibuka di layar kecil.
                  </div>

                  <div
                    ref={canvasRef}
                    className="gudang-layout-editor-canvas"
                    style={buildCanvasStyle(canvas)}
                  >
                    {(activeBlock.racks || []).map((rack, rackIndex) => (
                      <div
                        key={rack.id}
                        className={[
                          "gudang-layout-rack-card",
                          "freeform",
                          "editor",
                          rack.id === selectedRack?.id ? "selected" : "",
                          rack.id === draggedRackId && interactionMode === "move"
                            ? "dragging"
                            : "",
                          rack.id === draggedRackId && interactionMode === "resize"
                            ? "resizing"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={buildRackCardStyle(rack.layoutPosition, canvas)}
                        onClick={() => setSelectedRackId(rack.id)}
                      >
                        <div
                          className="gudang-layout-rack-head editable"
                          onPointerDown={(event) =>
                            beginRackInteraction(event, rack, rackIndex, "move")
                          }
                        >
                          <strong>Rak {String(rack.number).padStart(2, "0")}</strong>
                          <span>Drag aset</span>
                        </div>

                        <div className="gudang-layout-slot-grid compact">
                          {Array.from({ length: rack.rows }, (_, slotIndex) => {
                            const rowNumber = slotIndex + 1;

                            return (
                              <div key={`${rack.id}_${rowNumber}`} className="gudang-layout-slot-chip">
                                {`L${activeFloor.number}${String(activeBlock.code).toUpperCase()}${String(
                                  rack.number
                                ).padStart(2, "0")}${rowNumber}`}
                              </div>
                            );
                          })}
                        </div>

                        {resizeHandles.map((handle) => (
                          <button
                            key={`${rack.id}_${handle.key}`}
                            type="button"
                            className={[
                              "gudang-layout-rack-resize-handle",
                              handle.className,
                            ].join(" ")}
                            onPointerDown={(event) =>
                              beginRackInteraction(event, rack, rackIndex, "resize", handle.key)
                            }
                            aria-label={`Resize rak ${rack.number} ${handle.key}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="gudang-layout-modal-footer">
              <button type="button" className="gudang-ui-button-secondary" onClick={() => onClose?.()}>
                <FaTimes /> Batal
              </button>
              <button
                type="button"
                className="gudang-ui-button"
                onClick={() => onSave?.(draftLayout)}
              >
                <FaSave /> Simpan Layout
              </button>
            </div>
          </>
        ) : (
          <div className="gudang-ui-empty-panel" style={{ margin: 20 }}>
            Layout belum punya lantai dan blok yang bisa diedit.
          </div>
        )}
      </div>
    </div>
  );
};

export default GudangLayoutEditorModal;
