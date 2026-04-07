import React, { useEffect, useMemo, useState } from "react";
import { FaEdit, FaLayerGroup, FaPlus, FaSave, FaSyncAlt, FaTrash } from "react-icons/fa";
import "./GudangProdukWorkspace.css";
import {
  DEFAULT_BLOCK_CANVAS,
  buildSlotsFromLayout,
  createId,
  getSlotStockSummaryMap,
} from "./GudangProdukMockStore";
import {
  GudangLayoutMap,
  GudangStatCard,
  buildGlobalSummary,
  buildLayoutOptionLabel,
  buildSlotHeadline,
  countLayoutSummary,
} from "./GudangProdukSharedV2";
import GudangProdukBaseShell from "./GudangProdukBaseShell";
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

  return (
    <GudangProdukBaseShell
      title="Master Gudang Produk"
      subtitle="Buat gudang, lantai, blok, rak, dan alias slot secara visual. Peta ini akan dipakai ulang oleh input SKU, stok per lokasi, dan mutasi."
      icon={FaLayerGroup}
      statusLabel={
        isLoading
          ? "Memuat workspace..."
          : isSaving
            ? "Menyimpan perubahan..."
            : `${globalSummary.layoutCount} gudang aktif`
      }
      headerActions={[
        {
          key: "reload-workspace",
          label: "Muat Ulang",
          onClick: reloadWorkspace,
          variant: "secondary",
          icon: FaSyncAlt,
        },
      ]}
    >
      {error ? (
        <div className="gudang-ui-empty-panel" style={{ marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      <div className="gudang-ui-stat-grid">
        <GudangStatCard label="Total Gudang" value={globalSummary.layoutCount} helper="master aktif" />
        <GudangStatCard label="Total Slot" value={globalSummary.slotCount} helper="hasil generate layout" />
        <GudangStatCard label="Slot Terisi" value={globalSummary.filledSlots} helper="punya stok aktif" />
        <GudangStatCard label="Total Qty" value={globalSummary.totalQty} helper="stok aktif saat ini" />
      </div>

      <div className="gudang-ui-grid two-columns">
        <div className="gudang-ui-grid">
          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>Gudang Produk</h2>
                <p>Pilih gudang untuk mengedit layout visualnya.</p>
              </div>
            </div>

            <div className="gudang-ui-list">
              {state.layouts.map((layout) => (
                <div
                  key={layout.id}
                  className={`gudang-ui-list-item clickable ${layout.id === selectedLayout?.id ? "active" : ""}`}
                  onClick={() => selectLayoutCard(layout.id)}
                  onKeyDown={(event) => handleLayoutCardKeyDown(event, layout.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="gudang-ui-list-item-head">
                    <h4>{layout.name}</h4>
                    <span className="gudang-ui-badge placement">
                      {buildLayoutOptionLabel(layout)}
                    </span>
                  </div>
                  <p>{layout.description || layout.address || "Belum ada deskripsi."}</p>
                  <small>PIC: {layout.pic || "-"}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="gudang-ui-form-card">
            <div className="gudang-ui-panel-head">
              <div>
                <h3>Tambah Gudang Baru</h3>
                <p>Data akan langsung disimpan ke backend sebagai master baru.</p>
              </div>
            </div>

            <form onSubmit={handleCreateWarehouse}>
              <div className="gudang-ui-form-grid single">
                <div className="gudang-ui-field">
                  <label>Nama Gudang</label>
                  <input
                    value={warehouseForm.name}
                    onChange={(event) =>
                      setWarehouseForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Contoh: Gudang Rumah Besar"
                  />
                </div>
                <div className="gudang-ui-field">
                  <label>Alamat</label>
                  <input
                    value={warehouseForm.address}
                    onChange={(event) =>
                      setWarehouseForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                    placeholder="Alamat singkat gudang"
                  />
                </div>
                <div className="gudang-ui-field">
                  <label>PIC</label>
                  <input
                    value={warehouseForm.pic}
                    onChange={(event) =>
                      setWarehouseForm((prev) => ({ ...prev, pic: event.target.value }))
                    }
                    placeholder="Nama penanggung jawab"
                  />
                </div>
                <div className="gudang-ui-field">
                  <label>Deskripsi</label>
                  <textarea
                    value={warehouseForm.description}
                    onChange={(event) =>
                      setWarehouseForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Catatan singkat penggunaan gudang"
                  />
                </div>
              </div>

              <div className="gudang-ui-form-actions">
                <button type="submit" className="gudang-ui-button">
                  <FaPlus /> Buat Gudang
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="gudang-ui-grid">
          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>{selectedLayout?.name || "Belum ada gudang dipilih"}</h2>
                <p>
                  {selectedLayout?.description || selectedLayout?.address || "Pilih gudang untuk mulai mengatur layout."}
                </p>
              </div>
            </div>

            {selectedLayout ? (
              <>
                <div className="gudang-ui-chip-row">
                  <span className="gudang-ui-chip">{selectedLayout.floors.length} lantai</span>
                  <span className="gudang-ui-chip">{selectedLayoutSummary.slotCount} slot</span>
                  <span className="gudang-ui-chip">{selectedLayoutSummary.filledSlotCount} slot terisi</span>
                  <span className="gudang-ui-chip">{selectedLayoutSummary.totalQty} pcs aktif</span>
                </div>

                <div className="gudang-ui-grid split-hero" style={{ marginTop: 18 }}>
                  <div className="gudang-ui-grid">
                    <section className="gudang-ui-form-card">
                      <div className="gudang-ui-section-head">
                        <div>
                          <h3>Tambah Lantai</h3>
                          <p>Setiap lantai bisa punya beberapa blok.</p>
                        </div>
                      </div>
                      <form onSubmit={handleAddFloor}>
                        <div className="gudang-ui-inline-selects">
                          <div className="gudang-ui-field">
                            <label>Nomor Lantai</label>
                            <input
                              type="number"
                              min="1"
                              value={floorForm.number}
                              onChange={(event) =>
                                setFloorForm((prev) => ({ ...prev, number: event.target.value }))
                              }
                            />
                          </div>
                          <div className="gudang-ui-field">
                            <label>Label</label>
                            <input
                              value={floorForm.label}
                              onChange={(event) =>
                                setFloorForm((prev) => ({ ...prev, label: event.target.value }))
                              }
                              placeholder="Contoh: Lantai Display"
                            />
                          </div>
                          <div className="gudang-ui-form-actions" style={{ alignItems: "end" }}>
                            <button type="submit" className="gudang-ui-button">
                              <FaPlus /> Tambah
                            </button>
                          </div>
                        </div>
                      </form>
                    </section>

                    <section className="gudang-ui-form-card">
                      <div className="gudang-ui-section-head">
                        <div>
                          <h3>Lantai Aktif</h3>
                          <p>Pilih lantai untuk menambahkan blok dan rak.</p>
                        </div>
                      </div>
                      <div className="gudang-ui-list">
                        {(selectedLayout.floors || []).map((floor) => (
                          <div
                            key={floor.id}
                            className={`gudang-ui-list-item ${floor.id === selectedFloor?.id ? "active" : ""}`}
                          >
                            <div className="gudang-ui-list-item-head">
                              <button
                                type="button"
                                className="gudang-ui-button-secondary"
                                onClick={() => setSelectedFloorId(floor.id)}
                              >
                                {floor.label}
                              </button>
                              <button
                                type="button"
                                className="gudang-ui-icon-button"
                                onClick={() => deleteFloor(floor.id)}
                                title="Hapus lantai"
                              >
                                <FaTrash />
                              </button>
                            </div>
                            <small>{(floor.blocks || []).length} blok aktif</small>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="gudang-ui-grid">
                    <section className="gudang-ui-form-card">
                      <div className="gudang-ui-section-head">
                        <div>
                          <h3>Tambah Blok</h3>
                          <p>Tambahkan blok di lantai yang sedang dipilih.</p>
                        </div>
                      </div>
                      <form onSubmit={handleAddBlock}>
                        <div className="gudang-ui-form-grid">
                          <div className="gudang-ui-field">
                            <label>Kode Blok</label>
                            <input
                              value={blockForm.code}
                              onChange={(event) =>
                                setBlockForm((prev) => ({ ...prev, code: event.target.value }))
                              }
                              placeholder="A / B / C"
                              disabled={!selectedFloor}
                            />
                          </div>
                          <div className="gudang-ui-field">
                            <label>Label Blok</label>
                            <input
                              value={blockForm.label}
                              onChange={(event) =>
                                setBlockForm((prev) => ({ ...prev, label: event.target.value }))
                              }
                              placeholder="Contoh: Blok Besar"
                              disabled={!selectedFloor}
                            />
                          </div>
                        </div>
                        <div className="gudang-ui-form-actions">
                          <button type="submit" className="gudang-ui-button" disabled={!selectedFloor}>
                            <FaPlus /> Tambah Blok
                          </button>
                        </div>
                      </form>
                    </section>

                    <section className="gudang-ui-form-card">
                      <div className="gudang-ui-section-head">
                        <div>
                          <h3>Tambah Rak</h3>
                          <p>Set jumlah baris, lalu sistem generate slot otomatis.</p>
                        </div>
                      </div>
                      <form onSubmit={handleAddRack}>
                        <div className="gudang-ui-form-grid">
                          <div className="gudang-ui-field">
                            <label>Nomor Rak</label>
                            <input
                              type="number"
                              min="1"
                              value={rackForm.number}
                              onChange={(event) =>
                                setRackForm((prev) => ({ ...prev, number: event.target.value }))
                              }
                              disabled={!selectedBlock}
                            />
                          </div>
                          <div className="gudang-ui-field">
                            <label>Jumlah Baris</label>
                            <input
                              type="number"
                              min="1"
                              value={rackForm.rows}
                              onChange={(event) =>
                                setRackForm((prev) => ({ ...prev, rows: event.target.value }))
                              }
                              disabled={!selectedBlock}
                            />
                          </div>
                          <div className="gudang-ui-field">
                            <label>Label Rak</label>
                            <input
                              value={rackForm.label}
                              onChange={(event) =>
                                setRackForm((prev) => ({ ...prev, label: event.target.value }))
                              }
                              placeholder="Contoh: Rak Bestseller"
                              disabled={!selectedBlock}
                            />
                          </div>
                        </div>
                        <div className="gudang-ui-form-actions">
                          <button type="submit" className="gudang-ui-button" disabled={!selectedBlock}>
                            <FaLayerGroup /> Tambah Rak
                          </button>
                        </div>
                      </form>
                    </section>
                  </div>
                </div>

                <div className="gudang-ui-grid split-hero" style={{ marginTop: 18 }}>
                  <section className="gudang-ui-panel">
                    <div className="gudang-ui-section-head">
                      <div>
                        <h3>Blok dan Rak Aktif</h3>
                        <p>Kelola blok pada lantai yang sedang dipilih.</p>
                      </div>
                    </div>

                    {selectedFloor ? (
                      <div className="gudang-ui-grid">
                        <div className="gudang-ui-list">
                          {(selectedFloor.blocks || []).map((block) => (
                            <div
                              key={block.id}
                              className={`gudang-ui-list-item ${block.id === selectedBlock?.id ? "active" : ""}`}
                            >
                              <div className="gudang-ui-list-item-head">
                                <button
                                  type="button"
                                  className="gudang-ui-button-secondary"
                                  onClick={() => setSelectedBlockId(block.id)}
                                >
                                  {block.label}
                                </button>
                                <button
                                  type="button"
                                  className="gudang-ui-icon-button"
                                  onClick={() => deleteBlock(block.id)}
                                >
                                  <FaTrash />
                                </button>
                              </div>
                              <small>{(block.racks || []).length} rak</small>

                              {block.id === selectedBlock?.id && block.racks?.length ? (
                                <div className="gudang-ui-list" style={{ marginTop: 10 }}>
                                  {block.racks.map((rack) => (
                                    <div key={rack.id} className="gudang-ui-detail-box">
                                      <div className="gudang-ui-list-item-head">
                                        <div>
                                          <h4>
                                            Rak {String(rack.number).padStart(2, "0")}
                                          </h4>
                                          <small>{rack.rows} baris | {rack.label}</small>
                                        </div>
                                        <button
                                          type="button"
                                          className="gudang-ui-icon-button"
                                          onClick={() => deleteRack(rack.id)}
                                        >
                                          <FaTrash />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="gudang-ui-empty-panel">
                        Tambahkan lantai terlebih dahulu untuk mulai mengisi blok.
                      </div>
                    )}
                  </section>

                  <section className="gudang-ui-panel">
                    <div className="gudang-ui-section-head">
                      <div>
                        <h3>Alias Slot</h3>
                        <p>Klik salah satu slot di peta lalu simpan nama tampilannya.</p>
                      </div>
                    </div>

                    {selectedSlot ? (
                      <>
                        <div className="gudang-ui-callout" style={{ marginBottom: 14 }}>
                          <strong>{buildSlotHeadline(selectedSlot)}</strong>
                        </div>
                        <div className="gudang-ui-slot-meta">
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

                        <div className="gudang-ui-field" style={{ marginTop: 14 }}>
                          <label>Alias Lokasi</label>
                          <input
                            value={slotAliasDraft}
                            onChange={(event) => setSlotAliasDraft(event.target.value)}
                            placeholder="Contoh: Rak bestseller lantai 3"
                          />
                        </div>
                        <div className="gudang-ui-form-actions">
                          <button type="button" className="gudang-ui-button" onClick={saveSlotAlias}>
                            <FaSave /> Simpan Alias
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="gudang-ui-empty-panel">
                        Belum ada slot dipilih. Klik salah satu slot di peta untuk mengisi alias.
                      </div>
                    )}
                  </section>
                </div>
              </>
            ) : (
              <div className="gudang-ui-empty-panel">
                Belum ada gudang. Buat gudang baru di panel kiri untuk mulai menyusun layout.
              </div>
            )}
          </section>

          <section className="gudang-ui-panel">
            <div className="gudang-ui-panel-head">
              <div>
                <h2>Preview Layout Visual</h2>
                <p>Slot akan otomatis menghasilkan kode lokasi seperti `L3B043`.</p>
              </div>
              <button
                type="button"
                className="gudang-ui-button-secondary"
                onClick={() => setIsLayoutEditorOpen(true)}
                disabled={!selectedLayout?.floors?.some((floor) => floor.blocks?.length)}
              >
                <FaEdit /> Edit Layout
              </button>
            </div>

            <div className="gudang-layout-designer-note">
              Edit layout membuka modal khusus agar rak berubah jadi aset yang bisa diposisikan
              bebas di dalam blok. Preview di bawah ini akan ikut menampilkan posisi terakhir
              yang tersimpan.
            </div>

            <GudangLayoutMap
              layout={selectedLayout}
              selectedSlotId={selectedSlot?.id}
              onSelectSlot={(slot) => {
                setSelectedSlot(slot);
                setSlotAliasDraft(slot?.alias || "");
              }}
              stockSummaryBySlot={stockSummaryBySlot}
            />
          </section>
        </div>
      </div>

      <GudangLayoutEditorModal
        isOpen={isLayoutEditorOpen}
        layout={selectedLayout}
        initialFloorId={selectedFloorId}
        initialBlockId={selectedBlockId}
        onClose={() => setIsLayoutEditorOpen(false)}
        onSave={handleSaveLayoutEditor}
      />
    </GudangProdukBaseShell>
  );
};

export default MasterGudangProduk;
