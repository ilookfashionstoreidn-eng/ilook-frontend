import React, { useEffect, useMemo, useState } from "react";
import {
  FaCheck,
  FaEdit,
  FaLayerGroup,
  FaMap,
  FaPen,
  FaPlus,
  FaSave,
  FaSitemap,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaWarehouse,
} from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import "./MasterGudangProduk.css";
import {
  DEFAULT_BLOCK_CANVAS,
  buildSlotsFromLayout,
  createId,
  getSlotStockSummaryMap,
} from "./GudangProdukMockStore";
import {
  GudangLayoutMap,
  buildGlobalSummary,
  buildLayoutOptionLabel,
  buildSlotHeadline,
  countLayoutSummary,
} from "./GudangProdukSharedV2";
import GudangLayoutEditorModal from "./GudangLayoutEditorModal";
import useGudangProdukWorkspace from "./useGudangProdukWorkspace";
import {
  buildGudangWorkspaceErrorMessage,
  createGudangProdukLayout,
  saveGudangProdukLayout,
} from "./GudangProdukWorkspaceApi";
import {
  confirmGudangAction,
  showGudangError,
  showGudangSuccess,
  showGudangWarning,
} from "./GudangProdukAlerts";

const emptyWarehouseForm = {
  name: "",
  address: "",
  pic: "",
  description: "",
};

const emptyFloorForm = {
  number: "",
  label: "",
};

const emptyBlockForm = {
  code: "",
  label: "",
};

const emptyRackForm = {
  number: "",
  rows: 3,
  label: "",
};

const MasterGudangProduk = () => {
  const { state, setState, isLoading, error, refresh } = useGudangProdukWorkspace();
  const [activeTab, setActiveTab] = useState("gudang");
  const [selectedLayoutId, setSelectedLayoutId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState(emptyWarehouseForm);
  const [floorForm, setFloorForm] = useState(emptyFloorForm);
  const [blockForm, setBlockForm] = useState(emptyBlockForm);
  const [rackForm, setRackForm] = useState(emptyRackForm);
  const [slotAliasDraft, setSlotAliasDraft] = useState("");
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Inline editing state
  const [editingLayout, setEditingLayout] = useState(null); // { name, address, pic, description }
  const [editingFloorId, setEditingFloorId] = useState(null);
  const [editingFloorLabel, setEditingFloorLabel] = useState("");
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [editingBlockLabel, setEditingBlockLabel] = useState("");
  const [editingRackId, setEditingRackId] = useState(null);
  const [editingRackLabel, setEditingRackLabel] = useState("");

  useEffect(() => {
    if (!selectedLayoutId && state.layouts.length) {
      setSelectedLayoutId(state.layouts[0].id);
      return;
    }

    if (selectedLayoutId && !state.layouts.some((layout) => layout.id === selectedLayoutId)) {
      setSelectedLayoutId(state.layouts[0]?.id || "");
    }
  }, [selectedLayoutId, state.layouts]);

  const selectedLayout = useMemo(
    () => state.layouts.find((layout) => layout.id === selectedLayoutId) || state.layouts[0] || null,
    [selectedLayoutId, state.layouts]
  );

  useEffect(() => {
    if (!selectedLayout) {
      setSelectedFloorId("");
      setSelectedBlockId("");
      setSelectedSlot(null);
      return;
    }

    const firstFloor = selectedLayout.floors?.[0];
    const floorExists = selectedLayout.floors?.some((floor) => floor.id === selectedFloorId);
    if (!floorExists) {
      setSelectedFloorId(firstFloor?.id || "");
    }

    const activeFloor = selectedLayout.floors?.find(
      (floor) => floor.id === (floorExists ? selectedFloorId : firstFloor?.id)
    );
    const firstBlock = activeFloor?.blocks?.[0];
    const blockExists = activeFloor?.blocks?.some((block) => block.id === selectedBlockId);
    if (!blockExists) {
      setSelectedBlockId(firstBlock?.id || "");
    }
  }, [selectedBlockId, selectedFloorId, selectedLayout]);

  useEffect(() => {
    if (!selectedLayout || !selectedSlot) return;

    const slotStillExists = buildSlotsFromLayout(selectedLayout).find((slot) => slot.id === selectedSlot.id);
    if (!slotStillExists) {
      setSelectedSlot(null);
      setSlotAliasDraft("");
      return;
    }

    setSelectedSlot(slotStillExists);
    setSlotAliasDraft(slotStillExists.alias || "");
  }, [selectedLayout, selectedSlot]);

  const selectedFloor = selectedLayout?.floors?.find((floor) => floor.id === selectedFloorId) || null;
  const selectedBlock = selectedFloor?.blocks?.find((block) => block.id === selectedBlockId) || null;
  const stockSummaryBySlot = getSlotStockSummaryMap(state);
  const globalSummary = buildGlobalSummary(state);
  const selectedLayoutSummary = selectedLayout
    ? countLayoutSummary(selectedLayout, stockSummaryBySlot)
    : { slotCount: 0, filledSlotCount: 0, totalQty: 0 };
  const selectedLayoutStructure = selectedLayout
    ? selectedLayout.floors.reduce(
        (summary, floor) => {
          const blockCount = floor.blocks?.length || 0;
          const rackCount = (floor.blocks || []).reduce(
            (rackTotal, block) => rackTotal + (block.racks?.length || 0),
            0
          );

          return {
            blockCount: summary.blockCount + blockCount,
            rackCount: summary.rackCount + rackCount,
          };
        },
        { blockCount: 0, rackCount: 0 }
      )
    : { blockCount: 0, rackCount: 0 };
  const selectedFloorRackCount = (selectedFloor?.blocks || []).reduce(
    (rackTotal, block) => rackTotal + (block.racks?.length || 0),
    0
  );
  const selectedBlockRackCount = selectedBlock?.racks?.length || 0;

  const persistSelectedLayout = async (updater, successMessage = "") => {
    if (!selectedLayout) return;

    try {
      setIsSaving(true);
      const nextLayout = typeof updater === "function" ? updater(selectedLayout) : updater;
      const response = await saveGudangProdukLayout(nextLayout);
      setState(response.workspace);
      if (successMessage) {
        await showGudangSuccess("Perubahan tersimpan", successMessage);
      }
      return response.workspace;
    } catch (saveError) {
      await showGudangError(
        "Gagal menyimpan layout",
        buildGudangWorkspaceErrorMessage(
          saveError,
          "Gagal menyimpan perubahan layout gudang."
        )
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLayoutEditor = async (nextLayout) => {
    if (!nextLayout) return;

    try {
      setIsSaving(true);
      const response = await saveGudangProdukLayout(nextLayout);
      setState(response.workspace);
      setIsLayoutEditorOpen(false);
      await showGudangSuccess(
        "Layout visual tersimpan",
        response.message || "Posisi rak berhasil diperbarui."
      );
    } catch (saveError) {
      await showGudangError(
        "Gagal menyimpan layout visual",
        buildGudangWorkspaceErrorMessage(
          saveError,
          "Gagal menyimpan perubahan visual layout."
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateWarehouse = async (event) => {
    event.preventDefault();

    if (!warehouseForm.name.trim()) {
      await showGudangWarning("Nama gudang wajib diisi");
      return;
    }

    const newLayout = {
      id: createId("layout"),
      name: warehouseForm.name.trim(),
      address: warehouseForm.address.trim(),
      pic: warehouseForm.pic.trim(),
      description: warehouseForm.description.trim(),
      floors: [],
      slotAliases: {},
    };

    try {
      setIsSaving(true);
      const response = await createGudangProdukLayout(newLayout);
      setState(response.workspace);
      setSelectedLayoutId(response.layout?.id || newLayout.id);
      setWarehouseForm(emptyWarehouseForm);
      await showGudangSuccess(
        "Gudang berhasil dibuat",
        response.message || "Master gudang baru sudah tersimpan."
      );
    } catch (createError) {
      await showGudangError(
        "Gagal membuat gudang",
        buildGudangWorkspaceErrorMessage(
          createError,
          "Gagal membuat master gudang baru."
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFloor = async (event) => {
    event.preventDefault();
    if (!selectedLayout) return;

    const floorNumber = Number(floorForm.number);
    if (!Number.isFinite(floorNumber) || floorNumber <= 0) {
      await showGudangWarning("Nomor lantai tidak valid", "Nomor lantai harus lebih besar dari 0.");
      return;
    }

    if (selectedLayout.floors.some((floor) => floor.number === floorNumber)) {
      await showGudangWarning("Nomor lantai sudah dipakai");
      return;
    }

    const nextState = await persistSelectedLayout((layout) => ({
      ...layout,
      floors: [
        ...layout.floors,
        {
          id: createId("floor"),
          number: floorNumber,
          label: floorForm.label.trim() || `Lantai ${floorNumber}`,
          blocks: [],
        },
      ].sort((a, b) => a.number - b.number),
    }), `Lantai ${floorNumber} berhasil ditambahkan.`);

    if (nextState) {
      setFloorForm(emptyFloorForm);
    }
  };

  const handleAddBlock = async (event) => {
    event.preventDefault();
    if (!selectedLayout || !selectedFloor) return;

    const code = blockForm.code.trim().toUpperCase();
    if (!code) {
      await showGudangWarning("Kode blok wajib diisi");
      return;
    }

    if (selectedFloor.blocks.some((block) => block.code === code)) {
      await showGudangWarning("Kode blok sudah dipakai di lantai ini");
      return;
    }

    const nextState = await persistSelectedLayout((layout) => ({
      ...layout,
      floors: layout.floors.map((floor) =>
        floor.id === selectedFloor.id
          ? {
              ...floor,
              blocks: [
                ...floor.blocks,
                {
                  id: createId("block"),
                  code,
                  label: blockForm.label.trim() || `Blok ${code}`,
                  layoutColumns: 3,
                  layoutCanvas: { ...DEFAULT_BLOCK_CANVAS },
                  racks: [],
                },
              ].sort((a, b) => String(a.code).localeCompare(String(b.code))),
            }
          : floor
      ),
    }), `Blok ${code} berhasil ditambahkan.`);

    if (nextState) {
      setBlockForm(emptyBlockForm);
    }
  };

  const handleAddRack = async (event) => {
    event.preventDefault();
    if (!selectedLayout || !selectedFloor || !selectedBlock) return;

    const rackNumber = Number(rackForm.number);
    const rows = Number(rackForm.rows);
    if (!Number.isFinite(rackNumber) || rackNumber <= 0) {
      await showGudangWarning("Nomor rak tidak valid", "Nomor rak harus lebih besar dari 0.");
      return;
    }
    if (!Number.isFinite(rows) || rows <= 0) {
      await showGudangWarning("Jumlah baris tidak valid", "Jumlah baris harus lebih besar dari 0.");
      return;
    }

    if (selectedBlock.racks.some((rack) => rack.number === rackNumber)) {
      await showGudangWarning("Nomor rak sudah dipakai di blok ini");
      return;
    }

    const nextState = await persistSelectedLayout((layout) => ({
      ...layout,
      floors: layout.floors.map((floor) =>
        floor.id === selectedFloor.id
          ? {
              ...floor,
              blocks: floor.blocks.map((block) =>
                block.id === selectedBlock.id
                  ? {
                      ...block,
                      racks: [
                        ...block.racks,
                        {
                          id: createId("rack"),
                          number: rackNumber,
                          rows,
                          label: rackForm.label.trim() || `Rak ${String(rackNumber).padStart(2, "0")}`,
                          layoutPosition: null,
                        },
                      ],
                    }
                  : block
              ),
            }
          : floor
      ),
    }), `Rak ${String(rackNumber).padStart(2, "0")} berhasil ditambahkan.`);

    if (nextState) {
      setRackForm(emptyRackForm);
    }
  };

  const deleteFloor = async (floorId) => {
    if (!selectedLayout) return;
    const confirmed = await confirmGudangAction({
      title: "Hapus lantai ini?",
      text: "Semua blok, rak, dan slot di lantai ini akan ikut terhapus dari layout.",
      confirmButtonText: "Ya, hapus lantai",
      icon: "warning",
    });
    if (!confirmed) return;

    await persistSelectedLayout((layout) => ({
      ...layout,
      floors: layout.floors.filter((floor) => floor.id !== floorId),
    }), "Lantai berhasil dihapus.");
  };

  const deleteBlock = async (blockId) => {
    if (!selectedLayout || !selectedFloor) return;
    const confirmed = await confirmGudangAction({
      title: "Hapus blok ini?",
      text: "Semua rak dan slot di blok ini akan ikut terhapus dari layout.",
      confirmButtonText: "Ya, hapus blok",
      icon: "warning",
    });
    if (!confirmed) return;

    await persistSelectedLayout((layout) => ({
      ...layout,
      floors: layout.floors.map((floor) =>
        floor.id === selectedFloor.id
          ? {
              ...floor,
              blocks: floor.blocks.filter((block) => block.id !== blockId),
            }
          : floor
      ),
    }), "Blok berhasil dihapus.");
  };

  const deleteRack = async (rackId) => {
    if (!selectedLayout || !selectedFloor || !selectedBlock) return;
    const confirmed = await confirmGudangAction({
      title: "Hapus rak ini?",
      text: "Slot yang berada di rak ini akan ikut hilang dari layout.",
      confirmButtonText: "Ya, hapus rak",
      icon: "warning",
    });
    if (!confirmed) return;

    await persistSelectedLayout((layout) => ({
      ...layout,
      floors: layout.floors.map((floor) =>
        floor.id === selectedFloor.id
          ? {
              ...floor,
              blocks: floor.blocks.map((block) =>
                block.id === selectedBlock.id
                  ? {
                      ...block,
                      racks: block.racks.filter((rack) => rack.id !== rackId),
                    }
                  : block
              ),
            }
          : floor
      ),
    }), "Rak berhasil dihapus.");
  };

  const saveSlotAlias = async () => {
    if (!selectedLayout || !selectedSlot) return;

    await persistSelectedLayout((layout) => ({
      ...layout,
      slotAliases: {
        ...(layout.slotAliases || {}),
        [selectedSlot.id]: slotAliasDraft.trim(),
      },
    }), "Alias slot berhasil disimpan.");
  };

  // ── Edit Handlers ───────────────────────────────────────────────────────────

  const startEditLayout = () => {
    if (!selectedLayout) return;
    setEditingLayout({
      name: selectedLayout.name || "",
      address: selectedLayout.address || "",
      pic: selectedLayout.pic || "",
      description: selectedLayout.description || "",
    });
  };

  const cancelEditLayout = () => setEditingLayout(null);

  const saveEditLayout = async () => {
    if (!editingLayout || !selectedLayout) return;
    if (!editingLayout.name.trim()) {
      await showGudangWarning("Nama gudang tidak boleh kosong");
      return;
    }
    await persistSelectedLayout((layout) => ({
      ...layout,
      name: editingLayout.name.trim(),
      address: editingLayout.address.trim(),
      pic: editingLayout.pic.trim(),
      description: editingLayout.description.trim(),
    }), "Informasi gudang berhasil diperbarui.");
    setEditingLayout(null);
  };

  const startEditFloor = (floor) => {
    setEditingFloorId(floor.id);
    setEditingFloorLabel(floor.label || "");
  };

  const cancelEditFloor = () => {
    setEditingFloorId(null);
    setEditingFloorLabel("");
  };

  const saveEditFloor = async () => {
    if (!editingFloorId || !selectedLayout) return;
    if (!editingFloorLabel.trim()) {
      await showGudangWarning("Label lantai tidak boleh kosong");
      return;
    }
    await persistSelectedLayout((layout) => ({
      ...layout,
      floors: layout.floors.map((floor) =>
        floor.id === editingFloorId
          ? { ...floor, label: editingFloorLabel.trim() }
          : floor
      ),
    }), "Label lantai berhasil diperbarui.");
    cancelEditFloor();
  };

  const startEditBlock = (block) => {
    setEditingBlockId(block.id);
    setEditingBlockLabel(block.label || "");
  };

  const cancelEditBlock = () => {
    setEditingBlockId(null);
    setEditingBlockLabel("");
  };

  const saveEditBlock = async () => {
    if (!editingBlockId || !selectedLayout || !selectedFloor) return;
    if (!editingBlockLabel.trim()) {
      await showGudangWarning("Label blok tidak boleh kosong");
      return;
    }
    await persistSelectedLayout((layout) => ({
      ...layout,
      floors: layout.floors.map((floor) =>
        floor.id === selectedFloor.id
          ? {
              ...floor,
              blocks: floor.blocks.map((block) =>
                block.id === editingBlockId
                  ? { ...block, label: editingBlockLabel.trim() }
                  : block
              ),
            }
          : floor
      ),
    }), "Label blok berhasil diperbarui.");
    cancelEditBlock();
  };

  const startEditRack = (rack) => {
    setEditingRackId(rack.id);
    setEditingRackLabel(rack.label || "");
  };

  const cancelEditRack = () => {
    setEditingRackId(null);
    setEditingRackLabel("");
  };

  const saveEditRack = async () => {
    if (!editingRackId || !selectedLayout || !selectedFloor || !selectedBlock) return;
    if (!editingRackLabel.trim()) {
      await showGudangWarning("Label rak tidak boleh kosong");
      return;
    }
    await persistSelectedLayout((layout) => ({
      ...layout,
      floors: layout.floors.map((floor) =>
        floor.id === selectedFloor.id
          ? {
              ...floor,
              blocks: floor.blocks.map((block) =>
                block.id === selectedBlock.id
                  ? {
                      ...block,
                      racks: block.racks.map((rack) =>
                        rack.id === editingRackId
                          ? { ...rack, label: editingRackLabel.trim() }
                          : rack
                      ),
                    }
                  : block
              ),
            }
          : floor
      ),
    }), "Label rak berhasil diperbarui.");
    cancelEditRack();
  };

  const reloadWorkspace = async () => {
    try {
      setIsLayoutEditorOpen(false);
      const nextState = await refresh();
      setSelectedLayoutId(nextState.layouts[0]?.id || "");
      setSelectedSlot(null);
      await showGudangSuccess("Workspace berhasil dimuat ulang");
    } catch (refreshError) {
      await showGudangError(
        "Gagal memuat ulang data",
        buildGudangWorkspaceErrorMessage(
          refreshError,
          "Gagal memuat ulang data Gudang Produk."
        )
      );
    }
  };

  const selectLayoutCard = (layoutId) => {
    setSelectedLayoutId(layoutId);
    setSelectedSlot(null);
  };

  const handleLayoutCardKeyDown = (event, layoutId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectLayoutCard(layoutId);
    }
  };

  const statusLabel = isLoading
    ? "Memuat workspace…"
    : isSaving
      ? "Menyimpan…"
      : `${globalSummary.layoutCount} gudang aktif`;

  const tabItems = [
    { key: "gudang", label: "Gudang", icon: FaWarehouse, count: state.layouts.length },
    {
      key: "struktur",
      label: "Struktur",
      icon: FaSitemap,
      count: selectedLayout ? selectedLayoutStructure.blockCount : 0,
    },
    { key: "peta", label: "Peta & Slot", icon: FaMap, count: selectedLayoutSummary.slotCount },
  ];

  const noWarehouseHint = (
    <div className="mgp-empty" style={{ minHeight: 280 }}>
      Belum ada gudang dipilih. Buka tab
      <button type="button" className="mgp-link-tab" onClick={() => setActiveTab("gudang")}>
        Gudang
      </button>
      untuk memilih atau membuat gudang.
    </div>
  );

  return (
    <div className="ks-page mgp-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Master Gudang Produk</h1>
          <span className="ks-header-sub">
            Kelola gudang, lantai, blok, rak, dan alias slot dalam satu workspace.
          </span>
        </div>
        <div className="ks-header-actions">
          {selectedLayout ? (
            <span className="mgp-active-pill" title={selectedLayout.name}>
              <span className="mgp-active-dot" />
              Aktif:&nbsp;<strong>{selectedLayout.name}</strong>
            </span>
          ) : null}
          <span className="mgp-active-pill" style={{ background: "transparent", border: "none" }}>
            {statusLabel}
          </span>
          <button type="button" className="ks-btn" onClick={reloadWorkspace}>
            <FaSyncAlt className={isLoading ? "is-spinning" : ""} /> Muat Ulang
          </button>
        </div>
      </header>

      <div className="ks-statrail">
        <div className="ks-stat">
          <span className="ks-stat-label">Total Gudang</span>
          <span className="ks-stat-value">{globalSummary.layoutCount}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Total Slot</span>
          <span className="ks-stat-value">{globalSummary.slotCount}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Slot Terisi</span>
          <span className="ks-stat-value tone-safe">{globalSummary.filledSlots}</span>
        </div>
        <div className="ks-stat">
          <span className="ks-stat-label">Total Qty</span>
          <span className="ks-stat-value">{globalSummary.totalQty}</span>
        </div>
      </div>

      <div className="mgp-tabbar">
        <div className="ks-segment">
          {tabItems.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                className={`ks-seg-btn ${activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <TabIcon size={12} /> {tab.label} <em>{tab.count}</em>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <div className="mgp-error">{error}</div> : null}

      <section className="ks-board mgp-board">
        <div className="mgp-scroll">
          {/* ─────────────── TAB: GUDANG ─────────────── */}
          {activeTab === "gudang" && (
            <div className="mgp-cols">
              <div className="mgp-card">
                <div className="mgp-card-head">
                  <div>
                    <h3>Daftar Gudang</h3>
                    <p>Pilih master yang akan dikelola pada workspace aktif.</p>
                  </div>
                  <span className="mgp-chip accent">{state.layouts.length} gudang</span>
                </div>
                {state.layouts.length ? (
                  <div className="mgp-list mgp-list-scroll">
                    {state.layouts.map((layout) => (
                      <div
                        key={layout.id}
                        className={`mgp-item clickable ${layout.id === selectedLayout?.id ? "active" : ""}`}
                        onClick={() => selectLayoutCard(layout.id)}
                        onKeyDown={(event) => handleLayoutCardKeyDown(event, layout.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="mgp-item-head">
                          <h4>{layout.name}</h4>
                          <span className="mgp-chip">{buildLayoutOptionLabel(layout)}</span>
                        </div>
                        <p>{layout.description || layout.address || "Belum ada catatan gudang."}</p>
                        <small>PIC: {layout.pic || "-"}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mgp-empty">
                    Belum ada gudang. Tambahkan gudang baru pada panel di samping.
                  </div>
                )}
              </div>

              <div className="mgp-stack">
                {selectedLayout ? (
                  <div className="mgp-card">
                    <div className="mgp-card-head">
                      <div>
                        <h3>Informasi Gudang Aktif</h3>
                        <p>Detail master gudang yang sedang dipilih.</p>
                      </div>
                      {!editingLayout && (
                        <button
                          type="button"
                          className="mgp-icon-btn"
                          onClick={startEditLayout}
                          title="Edit Gudang"
                        >
                          <FaPen size={12} />
                        </button>
                      )}
                    </div>

                    {editingLayout ? (
                      <>
                        <div className="mgp-form-grid">
                          <div className="mgp-field span-2">
                            <label>Nama Gudang</label>
                            <input
                              className="mgp-input"
                              value={editingLayout.name}
                              onChange={(e) =>
                                setEditingLayout((prev) => ({ ...prev, name: e.target.value }))
                              }
                            />
                          </div>
                          <div className="mgp-field">
                            <label>Alamat</label>
                            <input
                              className="mgp-input"
                              value={editingLayout.address}
                              onChange={(e) =>
                                setEditingLayout((prev) => ({ ...prev, address: e.target.value }))
                              }
                            />
                          </div>
                          <div className="mgp-field">
                            <label>PIC</label>
                            <input
                              className="mgp-input"
                              value={editingLayout.pic}
                              onChange={(e) =>
                                setEditingLayout((prev) => ({ ...prev, pic: e.target.value }))
                              }
                            />
                          </div>
                          <div className="mgp-field span-2">
                            <label>Deskripsi</label>
                            <textarea
                              className="mgp-textarea"
                              rows={2}
                              value={editingLayout.description}
                              onChange={(e) =>
                                setEditingLayout((prev) => ({ ...prev, description: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <div className="mgp-form-actions">
                          <button type="button" className="ks-btn is-primary" onClick={saveEditLayout}>
                            <FaCheck /> Simpan
                          </button>
                          <button type="button" className="ks-btn" onClick={cancelEditLayout}>
                            <FaTimes /> Batal
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mgp-mini-stats">
                          <div className="mgp-mini-stat">
                            <span>Lantai</span>
                            <strong>{selectedLayout.floors.length}</strong>
                          </div>
                          <div className="mgp-mini-stat">
                            <span>Blok</span>
                            <strong>{selectedLayoutStructure.blockCount}</strong>
                          </div>
                          <div className="mgp-mini-stat">
                            <span>Rak</span>
                            <strong>{selectedLayoutStructure.rackCount}</strong>
                          </div>
                          <div className="mgp-mini-stat">
                            <span>Slot</span>
                            <strong>{selectedLayoutSummary.slotCount}</strong>
                          </div>
                        </div>
                        <div className="mgp-slot-meta" style={{ marginTop: 14 }}>
                          <div>
                            <strong>Alamat</strong>
                            <span>{selectedLayout.address || "-"}</span>
                          </div>
                          <div>
                            <strong>PIC</strong>
                            <span>{selectedLayout.pic || "-"}</span>
                          </div>
                          <div>
                            <strong>Deskripsi</strong>
                            <span>{selectedLayout.description || "-"}</span>
                          </div>
                        </div>
                        <div className="mgp-chip-row">
                          <span className="mgp-chip safe">
                            {selectedLayoutSummary.filledSlotCount} slot terisi
                          </span>
                          <span className="mgp-chip">{selectedLayoutSummary.totalQty} qty aktif</span>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}

                <div className="mgp-card">
                  <div className="mgp-card-head">
                    <div>
                      <h3>Gudang Baru</h3>
                      <p>Tambahkan master baru tanpa meninggalkan halaman ini.</p>
                    </div>
                  </div>
                  <form onSubmit={handleCreateWarehouse}>
                    <div className="mgp-form-grid">
                      <div className="mgp-field span-2">
                        <label>Nama Gudang</label>
                        <input
                          className="mgp-input"
                          value={warehouseForm.name}
                          onChange={(event) =>
                            setWarehouseForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                          placeholder="Contoh: Gudang Rumah Besar"
                        />
                      </div>
                      <div className="mgp-field">
                        <label>Alamat</label>
                        <input
                          className="mgp-input"
                          value={warehouseForm.address}
                          onChange={(event) =>
                            setWarehouseForm((prev) => ({ ...prev, address: event.target.value }))
                          }
                          placeholder="Alamat singkat gudang"
                        />
                      </div>
                      <div className="mgp-field">
                        <label>PIC</label>
                        <input
                          className="mgp-input"
                          value={warehouseForm.pic}
                          onChange={(event) =>
                            setWarehouseForm((prev) => ({ ...prev, pic: event.target.value }))
                          }
                          placeholder="Nama penanggung jawab"
                        />
                      </div>
                      <div className="mgp-field span-2">
                        <label>Deskripsi</label>
                        <textarea
                          className="mgp-textarea"
                          value={warehouseForm.description}
                          onChange={(event) =>
                            setWarehouseForm((prev) => ({ ...prev, description: event.target.value }))
                          }
                          placeholder="Catatan singkat penggunaan gudang"
                        />
                      </div>
                    </div>
                    <div className="mgp-form-actions">
                      <button type="submit" className="ks-btn is-primary">
                        <FaPlus /> Buat Gudang
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────── TAB: STRUKTUR ─────────────── */}
          {activeTab === "struktur" &&
            (selectedLayout ? (
              <>
                <div className="mgp-mini-stats" style={{ marginBottom: 14 }}>
                  <div className="mgp-mini-stat">
                    <span>Lantai</span>
                    <strong>{selectedLayout.floors.length}</strong>
                    <small>total lantai</small>
                  </div>
                  <div className="mgp-mini-stat">
                    <span>Blok</span>
                    <strong>{selectedLayoutStructure.blockCount}</strong>
                    <small>semua lantai</small>
                  </div>
                  <div className="mgp-mini-stat">
                    <span>Rak</span>
                    <strong>{selectedLayoutStructure.rackCount}</strong>
                    <small>semua blok</small>
                  </div>
                  <div className="mgp-mini-stat">
                    <span>Lantai Aktif</span>
                    <strong>{selectedFloor ? selectedFloor.number : "-"}</strong>
                    <small>{selectedFloorRackCount} rak</small>
                  </div>
                  <div className="mgp-mini-stat">
                    <span>Blok Aktif</span>
                    <strong>{selectedBlock?.code || "-"}</strong>
                    <small>{selectedBlockRackCount} rak</small>
                  </div>
                </div>

                <div className="mgp-cols-struktur">
                  {/* LEFT — Lantai */}
                  <div className="mgp-stack">
                    <div className="mgp-card">
                      <div className="mgp-card-head">
                        <div>
                          <h3>Tambah Lantai</h3>
                          <p>Nomor lantai jadi struktur dasar gudang.</p>
                        </div>
                      </div>
                      <form onSubmit={handleAddFloor}>
                        <div className="mgp-inline-form">
                          <div className="mgp-field">
                            <label>Nomor</label>
                            <input
                              type="number"
                              min="1"
                              className="mgp-input"
                              value={floorForm.number}
                              onChange={(event) =>
                                setFloorForm((prev) => ({ ...prev, number: event.target.value }))
                              }
                            />
                          </div>
                          <div className="mgp-field">
                            <label>Label</label>
                            <input
                              className="mgp-input"
                              value={floorForm.label}
                              onChange={(event) =>
                                setFloorForm((prev) => ({ ...prev, label: event.target.value }))
                              }
                              placeholder="Contoh: Lantai Display"
                            />
                          </div>
                          <button type="submit" className="ks-btn is-primary">
                            <FaPlus /> Tambah
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="mgp-card">
                      <div className="mgp-card-head">
                        <div>
                          <h3>Daftar Lantai</h3>
                          <p>Pilih lantai kerja untuk kelola blok &amp; rak.</p>
                        </div>
                      </div>
                      {(selectedLayout.floors || []).length ? (
                        <div className="mgp-list">
                          {(selectedLayout.floors || []).map((floor) => (
                            <div
                              key={floor.id}
                              className={`mgp-item ${floor.id === selectedFloor?.id ? "active" : ""}`}
                            >
                              <div className="mgp-item-head">
                                {editingFloorId === floor.id ? (
                                  <div className="mgp-inline-edit">
                                    <input
                                      className="mgp-input"
                                      value={editingFloorLabel}
                                      onChange={(e) => setEditingFloorLabel(e.target.value)}
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveEditFloor();
                                        if (e.key === "Escape") cancelEditFloor();
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="mgp-icon-btn ok"
                                      onClick={saveEditFloor}
                                      title="Simpan"
                                    >
                                      <FaCheck size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      className="mgp-icon-btn"
                                      onClick={cancelEditFloor}
                                      title="Batal"
                                    >
                                      <FaTimes size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="mgp-select-btn"
                                      onClick={() => setSelectedFloorId(floor.id)}
                                    >
                                      {floor.label}
                                    </button>
                                    <div className="mgp-icon-actions">
                                      <button
                                        type="button"
                                        className="mgp-icon-btn"
                                        onClick={() => startEditFloor(floor)}
                                        title="Edit nama lantai"
                                      >
                                        <FaPen size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        className="mgp-icon-btn danger"
                                        onClick={() => deleteFloor(floor.id)}
                                        title="Hapus lantai"
                                      >
                                        <FaTrash size={11} />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                              <small>{(floor.blocks || []).length} blok aktif</small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mgp-empty">Belum ada lantai. Tambahkan lantai di atas.</div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT — Blok & Rak */}
                  <div className="mgp-stack">
                    <div className="mgp-card">
                      <div className="mgp-card-head">
                        <div>
                          <h3>Tambah Blok</h3>
                          <p>Blok ditempatkan pada lantai yang sedang dipilih.</p>
                        </div>
                      </div>
                      <form onSubmit={handleAddBlock}>
                        <div className="mgp-form-grid">
                          <div className="mgp-field">
                            <label>Kode Blok</label>
                            <input
                              className="mgp-input"
                              value={blockForm.code}
                              onChange={(event) =>
                                setBlockForm((prev) => ({ ...prev, code: event.target.value }))
                              }
                              placeholder="A / B / C"
                              disabled={!selectedFloor}
                            />
                          </div>
                          <div className="mgp-field">
                            <label>Label Blok</label>
                            <input
                              className="mgp-input"
                              value={blockForm.label}
                              onChange={(event) =>
                                setBlockForm((prev) => ({ ...prev, label: event.target.value }))
                              }
                              placeholder="Contoh: Blok Besar"
                              disabled={!selectedFloor}
                            />
                          </div>
                        </div>
                        <div className="mgp-form-actions">
                          <button type="submit" className="ks-btn is-primary" disabled={!selectedFloor}>
                            <FaPlus /> Tambah Blok
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="mgp-card">
                      <div className="mgp-card-head">
                        <div>
                          <h3>Tambah Rak</h3>
                          <p>Rak baru otomatis menyiapkan slot sesuai jumlah baris.</p>
                        </div>
                      </div>
                      <form onSubmit={handleAddRack}>
                        <div className="mgp-form-grid">
                          <div className="mgp-field">
                            <label>Nomor Rak</label>
                            <input
                              type="number"
                              min="1"
                              className="mgp-input"
                              value={rackForm.number}
                              onChange={(event) =>
                                setRackForm((prev) => ({ ...prev, number: event.target.value }))
                              }
                              disabled={!selectedBlock}
                            />
                          </div>
                          <div className="mgp-field">
                            <label>Jumlah Baris</label>
                            <input
                              type="number"
                              min="1"
                              className="mgp-input"
                              value={rackForm.rows}
                              onChange={(event) =>
                                setRackForm((prev) => ({ ...prev, rows: event.target.value }))
                              }
                              disabled={!selectedBlock}
                            />
                          </div>
                          <div className="mgp-field span-2">
                            <label>Label Rak</label>
                            <input
                              className="mgp-input"
                              value={rackForm.label}
                              onChange={(event) =>
                                setRackForm((prev) => ({ ...prev, label: event.target.value }))
                              }
                              placeholder="Contoh: Rak Bestseller"
                              disabled={!selectedBlock}
                            />
                          </div>
                        </div>
                        <div className="mgp-form-actions">
                          <button type="submit" className="ks-btn is-primary" disabled={!selectedBlock}>
                            <FaLayerGroup /> Tambah Rak
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="mgp-card">
                      <div className="mgp-card-head">
                        <div>
                          <h3>Struktur Blok &amp; Rak</h3>
                          <p>
                            Kelola isi lantai aktif
                            {selectedFloor ? ` — ${selectedFloor.label}` : ""}.
                          </p>
                        </div>
                      </div>
                      {selectedFloor ? (
                        (selectedFloor.blocks || []).length ? (
                          <div className="mgp-list">
                            {(selectedFloor.blocks || []).map((block) => (
                              <div
                                key={block.id}
                                className={`mgp-item ${block.id === selectedBlock?.id ? "active" : ""}`}
                              >
                                <div className="mgp-item-head">
                                  {editingBlockId === block.id ? (
                                    <div className="mgp-inline-edit">
                                      <input
                                        className="mgp-input"
                                        value={editingBlockLabel}
                                        onChange={(e) => setEditingBlockLabel(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") saveEditBlock();
                                          if (e.key === "Escape") cancelEditBlock();
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className="mgp-icon-btn ok"
                                        onClick={saveEditBlock}
                                        title="Simpan"
                                      >
                                        <FaCheck size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        className="mgp-icon-btn"
                                        onClick={cancelEditBlock}
                                        title="Batal"
                                      >
                                        <FaTimes size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className="mgp-select-btn"
                                        onClick={() => setSelectedBlockId(block.id)}
                                      >
                                        {block.label}
                                      </button>
                                      <div className="mgp-icon-actions">
                                        <span className="mgp-chip">{(block.racks || []).length} rak</span>
                                        <button
                                          type="button"
                                          className="mgp-icon-btn"
                                          onClick={() => startEditBlock(block)}
                                          title="Edit nama blok"
                                        >
                                          <FaPen size={11} />
                                        </button>
                                        <button
                                          type="button"
                                          className="mgp-icon-btn danger"
                                          onClick={() => deleteBlock(block.id)}
                                          title="Hapus blok"
                                        >
                                          <FaTrash size={11} />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {block.id === selectedBlock?.id ? (
                                  block.racks?.length ? (
                                    <div className="mgp-rack-wrap">
                                      <div className="mgp-rack-wrap-head">
                                        <span className="mgp-chip accent">
                                          {block.racks.length} rak aktif
                                        </span>
                                      </div>
                                      <div className="mgp-rack-grid">
                                        {block.racks
                                          .slice()
                                          .sort((left, right) => left.number - right.number)
                                          .map((rack) => (
                                            <div key={rack.id} className="mgp-rack-card">
                                              <div className="mgp-rack-top">
                                                {editingRackId === rack.id ? (
                                                  <div className="mgp-inline-edit">
                                                    <input
                                                      className="mgp-input"
                                                      value={editingRackLabel}
                                                      onChange={(e) => setEditingRackLabel(e.target.value)}
                                                      autoFocus
                                                      onKeyDown={(e) => {
                                                        if (e.key === "Enter") saveEditRack();
                                                        if (e.key === "Escape") cancelEditRack();
                                                      }}
                                                    />
                                                    <button
                                                      type="button"
                                                      className="mgp-icon-btn ok"
                                                      onClick={saveEditRack}
                                                      title="Simpan"
                                                    >
                                                      <FaCheck size={10} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      className="mgp-icon-btn"
                                                      onClick={cancelEditRack}
                                                      title="Batal"
                                                    >
                                                      <FaTimes size={10} />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <>
                                                    <div className="mgp-rack-main">
                                                      <strong>
                                                        Rak {String(rack.number).padStart(2, "0")}
                                                      </strong>
                                                      <span>
                                                        {rack.label ||
                                                          `Rak ${String(rack.number).padStart(2, "0")}`}
                                                      </span>
                                                    </div>
                                                    <div className="mgp-icon-actions">
                                                      <button
                                                        type="button"
                                                        className="mgp-icon-btn"
                                                        onClick={() => startEditRack(rack)}
                                                        title="Edit nama rak"
                                                      >
                                                        <FaPen size={10} />
                                                      </button>
                                                      <button
                                                        type="button"
                                                        className="mgp-icon-btn danger"
                                                        onClick={() => deleteRack(rack.id)}
                                                        title={`Hapus Rak ${String(rack.number).padStart(2, "0")}`}
                                                      >
                                                        <FaTrash size={10} />
                                                      </button>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                              <div className="mgp-rack-meta">
                                                <span className="mgp-chip">{rack.rows} baris</span>
                                                <span className="mgp-chip">
                                                  Kode {String(rack.number).padStart(2, "0")}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mgp-empty" style={{ marginTop: 10 }}>
                                      Blok ini belum punya rak. Tambahkan rak dari panel di atas.
                                    </div>
                                  )
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mgp-empty">
                            Lantai ini belum punya blok. Tambahkan blok dari panel di atas.
                          </div>
                        )
                      ) : (
                        <div className="mgp-empty">
                          Tambahkan atau pilih lantai dulu untuk mulai mengatur blok.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              noWarehouseHint
            ))}

          {/* ─────────────── TAB: PETA & SLOT ─────────────── */}
          {activeTab === "peta" &&
            (selectedLayout ? (
              <div className="mgp-cols-peta">
                <div className="mgp-card">
                  <div className="mgp-card-head">
                    <div>
                      <h3>Nama Tampil Slot</h3>
                      <p>Beri alias agar lokasi mudah dikenali tim gudang.</p>
                    </div>
                  </div>
                  {selectedSlot ? (
                    <>
                      <div className="mgp-callout">{buildSlotHeadline(selectedSlot)}</div>
                      <div className="mgp-slot-meta">
                        <div>
                          <strong>Kode Sistem</strong>
                          <span>{selectedSlot.slotCode}</span>
                        </div>
                        <div>
                          <strong>Lokasi</strong>
                          <span>
                            {selectedLayout.name} | Blok {selectedSlot.blockCode} | Rak{" "}
                            {String(selectedSlot.rackNumber).padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                      <div className="mgp-field" style={{ marginTop: 14 }}>
                        <label>Alias Lokasi</label>
                        <input
                          className="mgp-input"
                          value={slotAliasDraft}
                          onChange={(event) => setSlotAliasDraft(event.target.value)}
                          placeholder="Contoh: Rak bestseller lantai 3"
                        />
                      </div>
                      <div className="mgp-form-actions">
                        <button type="button" className="ks-btn is-primary" onClick={saveSlotAlias}>
                          <FaSave /> Simpan Alias
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mgp-empty">
                      Belum ada slot dipilih. Klik slot pada peta untuk mengisi alias lokasi.
                    </div>
                  )}
                </div>

                <div className="mgp-card">
                  <div className="mgp-card-head">
                    <div>
                      <h3>Peta Layout</h3>
                      <p>Preview posisi blok, rak, dan slot yang tersimpan pada gudang aktif.</p>
                    </div>
                    <button
                      type="button"
                      className="ks-btn"
                      onClick={() => setIsLayoutEditorOpen(true)}
                      disabled={!selectedLayout?.floors?.some((floor) => floor.blocks?.length)}
                    >
                      <FaEdit /> Edit Layout
                    </button>
                  </div>
                  <p className="mgp-note">
                    Gunakan editor layout untuk mengatur posisi rak secara visual. Preview menampilkan
                    posisi terakhir yang sudah disimpan.
                  </p>
                  <div className="mgp-map-host">
                    <GudangLayoutMap
                      layout={selectedLayout}
                      selectedSlotId={selectedSlot?.id}
                      onSelectSlot={(slot) => {
                        setSelectedSlot(slot);
                        setSlotAliasDraft(slot?.alias || "");
                      }}
                      stockSummaryBySlot={stockSummaryBySlot}
                    />
                  </div>
                </div>
              </div>
            ) : (
              noWarehouseHint
            ))}
        </div>
      </section>

      <GudangLayoutEditorModal
        isOpen={isLayoutEditorOpen}
        layout={selectedLayout}
        initialFloorId={selectedFloorId}
        initialBlockId={selectedBlockId}
        onClose={() => setIsLayoutEditorOpen(false)}
        onSave={handleSaveLayoutEditor}
      />
    </div>
  );
};

export default MasterGudangProduk;
