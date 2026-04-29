import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ProductList.css";
import API from "../../api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import {
  FaChevronDown,
  FaEdit,
  FaFileExcel,
  FaInfoCircle,
  FaLayerGroup,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

const emptyMaterial = {
  material: "",
  colour: "",
  material_group: "",
};

const initialForm = {
  product: "",
  sku_name: "",
  product_group: "",
  product_size: "",
  product_source: "",
  product_colour: "",
  materials: [{ ...emptyMaterial }],
  estimasi_cutting: "",
  estimasi_combi: "",
  id_s: "",
  id_m: "",
  id_l: "",
  id_xl: "",
  pj_dress: "",
  pj_celana: "",
  pj_baju: "",
  price_cmt: "",
  price_cutting: "",
  notes_spk: "",
};

const numericFields = [
  "estimasi_cutting",
  "estimasi_combi",
  "pj_dress",
  "pj_celana",
  "pj_baju",
  "price_cmt",
  "price_cutting",
];

const ProductList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    total: 0,
    groups: [],
    sources: [],
    material_rows: 0,
  });
  const [modalMode, setModalMode] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState(initialForm);
  const importInputRef = useRef(null);
  const groupDropdownRef = useRef(null);

  const groupOptions = useMemo(() => (summary.groups || []).filter(Boolean), [summary.groups]);
  const filteredGroupOptions = useMemo(() => {
    const term = groupSearchTerm.trim().toLowerCase();

    if (!term) {
      return groupOptions;
    }

    return groupOptions.filter((group) => String(group).toLowerCase().includes(term));
  }, [groupOptions, groupSearchTerm]);

  const showSuccessAlert = (title, text) => {
    return Swal.fire({
      icon: "success",
      title,
      text,
      timer: 1800,
      showConfirmButton: false,
      timerProgressBar: true,
    });
  };

  const showErrorAlert = (title, text) => {
    return Swal.fire({
      icon: "error",
      title,
      text,
      confirmButtonText: "Mengerti",
      confirmButtonColor: "#2563eb",
    });
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const normalizeMaterials = (materials) => {
    const source = Array.isArray(materials) ? materials : [];
    const normalized = source.map((item) => ({
      material: String(item?.material || "").trim(),
      colour: String(item?.colour || "").trim(),
      material_group: String(item?.material_group || "").trim(),
    }));

    const filled = normalized.filter((item) => item.material || item.colour || item.material_group);
    return filled.length ? filled : [{ ...emptyMaterial }];
  };

  const toForm = (item = {}) => ({
    product: item.product || "",
    sku_name: item.sku_name || "",
    product_group: item.product_group || "",
    product_size: item.product_size || "",
    product_source: item.product_source || "",
    product_colour: item.product_colour || "",
    materials: normalizeMaterials(item.materials),
    estimasi_cutting: item.estimasi_cutting ?? "",
    estimasi_combi: item.estimasi_combi ?? "",
    id_s: item.id_s || "",
    id_m: item.id_m || "",
    id_l: item.id_l || "",
    id_xl: item.id_xl || "",
    pj_dress: item.pj_dress ?? "",
    pj_celana: item.pj_celana ?? "",
    pj_baju: item.pj_baju ?? "",
    price_cmt: item.price_cmt ?? "",
    price_cutting: item.price_cutting ?? "",
    notes_spk: item.notes_spk || "",
  });

  const buildPayload = () => {
    const payload = {
      ...form,
      materials: normalizeMaterials(form.materials).filter(
        (item) => item.material || item.colour || item.material_group
      ),
    };

    numericFields.forEach((field) => {
      payload[field] = payload[field] === "" || payload[field] === null ? null : payload[field];
    });

    return payload;
  };

  const getApiErrorMessage = (err, fallback) => {
    if (!err?.response) {
      return "Gagal menghubungi backend API. Pastikan Laravel berjalan di http://localhost:8000.";
    }

    const validationErrors = err?.response?.data?.errors;
    if (validationErrors && typeof validationErrors === "object") {
      const firstError = Object.values(validationErrors)[0];
      if (Array.isArray(firstError) && firstError.length) {
        return firstError[0];
      }
    }

    const status = err.response?.status;
    const message = err?.response?.data?.message || fallback;

    return status ? `${message} (HTTP ${status})` : message;
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    const numeric = Number(value);

    if (Number.isNaN(numeric)) {
      return value;
    }

    return numeric.toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });
  };

  const fetchProductLists = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/product-list", {
        params: {
          search: debouncedSearchTerm || "",
          product_group: selectedGroup || "",
          page: currentPage,
          per_page: 10,
        },
      });

      setItems(response.data.data || []);
      setCurrentPage(response.data.current_page || 1);
      setLastPage(response.data.last_page || 1);
      setTotal(response.data.total || 0);
      setSummary(
        response.data.summary || {
          total: response.data.total || 0,
          groups: [],
          sources: [],
          material_rows: 0,
        }
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Gagal mengambil data Product List."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductLists();
  }, [debouncedSearchTerm, selectedGroup, currentPage]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchInput.trim());
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target)) {
        setGroupDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGroupSelect = (value) => {
    setCurrentPage(1);
    setSelectedGroup(value);
    setGroupSearchTerm("");
    setGroupDropdownOpen(false);
  };

  const openAddModal = () => {
    setSelectedItem(null);
    setForm(initialForm);
    setModalMode("add");
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setForm(toForm(item));
    setModalMode("edit");
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setModalMode("detail");
  };

  const closeModal = (force = false) => {
    if (saving && !force) return;
    setModalMode(null);
    setSelectedItem(null);
    setForm(initialForm);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMaterialChange = (index, field, value) => {
    setForm((prev) => {
      const nextMaterials = [...prev.materials];
      nextMaterials[index] = {
        ...nextMaterials[index],
        [field]: value,
      };
      return { ...prev, materials: nextMaterials };
    });
  };

  const addMaterialRow = () => {
    setForm((prev) => ({
      ...prev,
      materials: [...prev.materials, { ...emptyMaterial }],
    }));
  };

  const removeMaterialRow = (index) => {
    setForm((prev) => {
      if (prev.materials.length === 1) {
        return { ...prev, materials: [{ ...emptyMaterial }] };
      }

      return {
        ...prev,
        materials: prev.materials.filter((_, materialIndex) => materialIndex !== index),
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      const payload = buildPayload();

      if (modalMode === "edit" && selectedItem?.id) {
        await API.put(`/product-list/${selectedItem.id}`, payload);
        closeModal(true);
        await fetchProductLists();
        await showSuccessAlert("Berhasil", "Product List berhasil diperbarui.");
      } else {
        await API.post("/product-list", payload);
        closeModal(true);
        await fetchProductLists();
        await showSuccessAlert("Berhasil", "Product List berhasil ditambahkan.");
      }
    } catch (err) {
      await showErrorAlert("Gagal Menyimpan", getApiErrorMessage(err, "Data Product List gagal disimpan."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus Product List?",
      text: `Data "${item.product}"${item.sku_name ? ` / ${item.sku_name}` : ""} akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#be123c",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await API.delete(`/product-list/${item.id}`);
      await fetchProductLists();
      await showSuccessAlert("Terhapus", "Product List berhasil dihapus.");
    } catch (err) {
      await showErrorAlert("Gagal Menghapus", getApiErrorMessage(err, "Product List gagal dihapus."));
    }
  };

  const handleImportButtonClick = () => {
    importInputRef.current?.click();
  };

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const confirm = await Swal.fire({
      icon: "question",
      title: "Import Product List?",
      text: `File "${file.name}" akan diproses ke database Product List.`,
      showCancelButton: true,
      confirmButtonText: "Import",
      cancelButtonText: "Batal",
      confirmButtonColor: "#047857",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setImporting(true);
      Swal.fire({
        title: "Mengimport data...",
        text: "Mohon tunggu sampai proses selesai.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await API.post("/product-list/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchProductLists();

      const result = response.data || {};
      const errors = Array.isArray(result.errors) ? result.errors : [];
      const errorList = errors
        .slice(0, 8)
        .map((item) => `<li>Row ${escapeHtml(item.row)}: ${escapeHtml(item.message)}</li>`)
        .join("");

      await Swal.fire({
        icon: result.total_errors > 0 ? "warning" : "success",
        title: "Import Selesai",
        html: `
          <div class="product-list-import-result">
            <div><strong>${Number(result.processed || 0).toLocaleString("id-ID")}</strong><span>Diproses</span></div>
            <div><strong>${Number(result.created || 0).toLocaleString("id-ID")}</strong><span>Data baru</span></div>
            <div><strong>${Number(result.updated || 0).toLocaleString("id-ID")}</strong><span>Update</span></div>
            <div><strong>${Number(result.skipped || 0).toLocaleString("id-ID")}</strong><span>Skip</span></div>
            <div><strong>${Number(result.empty_sku_rows || 0).toLocaleString("id-ID")}</strong><span>SKU kosong</span></div>
            <div><strong>${Number(result.duplicate_sku_rows || 0).toLocaleString("id-ID")}</strong><span>SKU duplikat</span></div>
          </div>
          ${
            errorList
              ? `<div class="product-list-import-errors"><p>Catatan:</p><ul>${errorList}</ul></div>`
              : ""
          }
        `,
        confirmButtonText: "Selesai",
        confirmButtonColor: "#2563eb",
      });
    } catch (err) {
      Swal.close();
      await showErrorAlert("Import Gagal", getApiErrorMessage(err, "File Excel gagal diimport."));
    } finally {
      setImporting(false);
    }
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > lastPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderMaterialChips = (materials) => {
    const normalized = normalizeMaterials(materials).filter(
      (item) => item.material || item.colour || item.material_group
    );

    if (!normalized.length) {
      return <span className="product-list-muted">-</span>;
    }

    return (
      <div className="product-list-material-chips">
        {normalized.slice(0, 3).map((material, index) => (
          <span className="product-list-material-chip" key={`${material.material}-${index}`}>
            {material.material_group ? `${material.material_group}: ` : ""}
            {material.material || "-"}
            {material.colour ? ` / ${material.colour}` : ""}
          </span>
        ))}
        {normalized.length > 3 && (
          <span className="product-list-material-more">+{normalized.length - 3}</span>
        )}
      </div>
    );
  };

  const renderModal = () => {
    if (!modalMode) return null;

    if (modalMode === "detail") {
      const materials = normalizeMaterials(selectedItem?.materials).filter(
        (item) => item.material || item.colour || item.material_group
      );

      return (
        <div className="product-list-modal-backdrop" onClick={closeModal}>
          <div className="product-list-modal detail" onClick={(event) => event.stopPropagation()}>
            <div className="product-list-modal-header">
              <div>
                <p className="product-list-modal-kicker">Detail Product List</p>
                <h2>{selectedItem?.product || "-"}</h2>
              </div>
              <button className="product-list-icon-button" onClick={closeModal} type="button">
                <FaTimes />
              </button>
            </div>

            <div className="product-list-detail-grid">
              <DetailItem label="Product Group" value={selectedItem?.product_group} />
              <DetailItem label="SKU Name" value={selectedItem?.sku_name} />
              <DetailItem label="Product Size" value={selectedItem?.product_size} />
              <DetailItem label="Product Source" value={selectedItem?.product_source} />
              <DetailItem label="Product Colour" value={selectedItem?.product_colour} />
              <DetailItem label="Estimasi Cutting" value={selectedItem?.estimasi_cutting} suffix=" pcs" />
              <DetailItem label="Estimasi Combi" value={selectedItem?.estimasi_combi} suffix=" pcs" />
              <DetailItem label="ID S" value={selectedItem?.id_s} />
              <DetailItem label="ID M" value={selectedItem?.id_m} />
              <DetailItem label="ID L" value={selectedItem?.id_l} />
              <DetailItem label="ID XL" value={selectedItem?.id_xl} />
              <DetailItem label="PJ Dress" value={selectedItem?.pj_dress} />
              <DetailItem label="PJ Celana" value={selectedItem?.pj_celana} />
              <DetailItem label="PJ Baju" value={selectedItem?.pj_baju} />
              <DetailItem label="Price CMT" value={formatCurrency(selectedItem?.price_cmt)} />
              <DetailItem label="Price Cutting" value={formatCurrency(selectedItem?.price_cutting)} />
            </div>

            <div className="product-list-detail-section">
              <h3>Material</h3>
              {materials.length ? (
                <div className="product-list-detail-materials">
                  {materials.map((material, index) => (
                    <div className="product-list-detail-material" key={`${material.material}-${index}`}>
                      <span>#{index + 1}</span>
                      <strong>{material.material || "-"}</strong>
                      <small>{material.colour || "-"} / {material.material_group || "-"}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="product-list-empty-note">Belum ada material.</p>
              )}
            </div>

            <div className="product-list-detail-section">
              <h3>Notes SPK</h3>
              <p className="product-list-notes">{selectedItem?.notes_spk || "-"}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="product-list-modal-backdrop" onClick={closeModal}>
        <form className="product-list-modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
          <div className="product-list-modal-header">
            <div>
              <p className="product-list-modal-kicker">
                {modalMode === "edit" ? "Edit Product List" : "Tambah Product List"}
              </p>
              <h2>{modalMode === "edit" ? form.product || "Edit data" : "Data produk baru"}</h2>
            </div>
            <button className="product-list-icon-button" onClick={closeModal} type="button">
              <FaTimes />
            </button>
          </div>

          <div className="product-list-form-section">
            <h3>Informasi Produk</h3>
            <div className="product-list-form-grid">
              <Field label="Product" name="product" value={form.product} onChange={handleInputChange} required />
              <Field label="SKU Name" name="sku_name" value={form.sku_name} onChange={handleInputChange} />
              <Field label="Product Group" name="product_group" value={form.product_group} onChange={handleInputChange} />
              <Field label="Product Size" name="product_size" value={form.product_size} onChange={handleInputChange} />
              <Field label="Product Source" name="product_source" value={form.product_source} onChange={handleInputChange} />
              <Field label="Product Colour" name="product_colour" value={form.product_colour} onChange={handleInputChange} />
            </div>
          </div>

          <div className="product-list-form-section">
            <div className="product-list-section-heading">
              <h3>Material Produk</h3>
              <button className="product-list-secondary-button" type="button" onClick={addMaterialRow}>
                <FaPlus /> Material
              </button>
            </div>
            <div className="product-list-material-editor">
              {form.materials.map((material, index) => (
                <div className="product-list-material-row" key={`material-row-${index}`}>
                  <span className="product-list-row-index">{index + 1}</span>
                  <Field
                    label="Product Material"
                    value={material.material}
                    onChange={(event) => handleMaterialChange(index, "material", event.target.value)}
                  />
                  <Field
                    label="Product Colour"
                    value={material.colour}
                    onChange={(event) => handleMaterialChange(index, "colour", event.target.value)}
                  />
                  <Field
                    label="Material Group"
                    value={material.material_group}
                    onChange={(event) => handleMaterialChange(index, "material_group", event.target.value)}
                  />
                  <button
                    className="product-list-icon-button danger"
                    type="button"
                    onClick={() => removeMaterialRow(index)}
                    title="Hapus material"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="product-list-form-section">
            <h3>Estimasi, ID Size, dan Price</h3>
            <div className="product-list-form-grid">
              <Field
                label="Estimasi Cutting"
                name="estimasi_cutting"
                type="number"
                value={form.estimasi_cutting}
                onChange={handleInputChange}
              />
              <Field
                label="Estimasi Combi"
                name="estimasi_combi"
                type="number"
                value={form.estimasi_combi}
                onChange={handleInputChange}
              />
              <Field label="ID S" name="id_s" value={form.id_s} onChange={handleInputChange} />
              <Field label="ID M" name="id_m" value={form.id_m} onChange={handleInputChange} />
              <Field label="ID L" name="id_l" value={form.id_l} onChange={handleInputChange} />
              <Field label="ID XL" name="id_xl" value={form.id_xl} onChange={handleInputChange} />
              <Field label="PJ Dress" name="pj_dress" type="number" value={form.pj_dress} onChange={handleInputChange} />
              <Field label="PJ Celana" name="pj_celana" type="number" value={form.pj_celana} onChange={handleInputChange} />
              <Field label="PJ Baju" name="pj_baju" type="number" value={form.pj_baju} onChange={handleInputChange} />
              <Field label="Price CMT" name="price_cmt" type="number" value={form.price_cmt} onChange={handleInputChange} />
              <Field
                label="Price Cutting"
                name="price_cutting"
                type="number"
                value={form.price_cutting}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="product-list-form-section">
            <label className="product-list-field full">
              <span>Notes SPK</span>
              <textarea
                name="notes_spk"
                value={form.notes_spk}
                onChange={handleInputChange}
                placeholder="Catatan tambahan untuk SPK"
                rows={4}
              />
            </label>
          </div>

          <div className="product-list-modal-actions">
            <button className="product-list-ghost-button" type="button" onClick={closeModal}>
              Batal
            </button>
            <button className="product-list-primary-button" type="submit" disabled={saving}>
              <FaSave /> {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="product-list-page">
      <header className="product-list-header">
        <div className="product-list-title-group">
          <div className="product-list-brand-icon">
            <FaLayerGroup />
          </div>
          <div>
            <p className="product-list-pill">Produk</p>
            <h1>Product List</h1>
            <span>Database detail produk, material, estimasi, ID size, price, dan notes SPK.</span>
          </div>
        </div>

        <div className="product-list-search">
          <FaSearch />
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari product, SKU name, group, colour, ID size..."
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput("")}>
              <FaTimes />
            </button>
          )}
        </div>
      </header>

      <main className="product-list-main">
        <section className="product-list-stats">
          <div className="product-list-stat">
            <span>Total Data</span>
            <strong>{summary.total || total}</strong>
          </div>
          <div className="product-list-stat">
            <span>Product Group</span>
            <strong>{summary.groups?.length || 0}</strong>
          </div>
          <div className="product-list-stat">
            <span>Product Source</span>
            <strong>{summary.sources?.length || 0}</strong>
          </div>
          <div className="product-list-stat accent">
            <span>Material Row</span>
            <strong>{summary.material_rows || 0}</strong>
          </div>
        </section>

        <section className="product-list-table-card">
          <div className="product-list-table-header">
            <div>
              <h2>Semua Data Product List</h2>
              <p>{total} data ditemukan</p>
            </div>
            <div className="product-list-table-actions">
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportChange}
                className="product-list-file-input"
              />
              <button
                className="product-list-secondary-button import"
                type="button"
                onClick={handleImportButtonClick}
                disabled={importing}
              >
                <FaFileExcel /> {importing ? "Import..." : "Import Excel"}
              </button>
              <button
                className="product-list-primary-button product-list-add-button"
                type="button"
                onClick={openAddModal}
              >
                <FaPlus /> Tambah Data
              </button>
            </div>
          </div>

          <div className="product-list-filter-bar">
            <div
              className={`product-list-searchable-select${groupDropdownOpen ? " open" : ""}`}
              ref={groupDropdownRef}
            >
              <button
                className="product-list-searchable-select-trigger"
                type="button"
                onClick={() => setGroupDropdownOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={groupDropdownOpen}
              >
                <span>{selectedGroup || "Semua Product Group"}</span>
                <FaChevronDown />
              </button>

              {groupDropdownOpen && (
                <div className="product-list-searchable-select-menu">
                  <div className="product-list-searchable-select-search">
                    <FaSearch />
                    <input
                      type="text"
                      value={groupSearchTerm}
                      onChange={(event) => setGroupSearchTerm(event.target.value)}
                      placeholder="Cari product group..."
                      autoFocus
                    />
                    {groupSearchTerm && (
                      <button type="button" onClick={() => setGroupSearchTerm("")}>
                        <FaTimes />
                      </button>
                    )}
                  </div>

                  <div className="product-list-searchable-select-options" role="listbox">
                    <button
                      className={`product-list-searchable-option${selectedGroup === "" ? " selected" : ""}`}
                      type="button"
                      onClick={() => handleGroupSelect("")}
                      role="option"
                      aria-selected={selectedGroup === ""}
                    >
                      Semua Product Group
                    </button>

                    {filteredGroupOptions.length ? (
                      filteredGroupOptions.map((group) => (
                        <button
                          className={`product-list-searchable-option${selectedGroup === group ? " selected" : ""}`}
                          type="button"
                          key={group}
                          onClick={() => handleGroupSelect(group)}
                          role="option"
                          aria-selected={selectedGroup === group}
                        >
                          {group}
                        </button>
                      ))
                    ) : (
                      <div className="product-list-searchable-empty">Product Group tidak ditemukan.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <div className="product-list-error">{error}</div>}

          <div className="product-list-table-scroll">
            <table className="product-list-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU Name</th>
                  <th>Group / Source</th>
                  <th>Colour / Size</th>
                  <th>Material</th>
                  <th>Estimasi</th>
                  <th>ID S</th>
                  <th>ID M</th>
                  <th>ID L</th>
                  <th>ID XL</th>
                  <th>PJ</th>
                  <th>Price</th>
                  <th>Notes SPK</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="14" className="product-list-state-cell">
                      Memuat data Product List...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="product-list-state-cell">
                      Belum ada data Product List.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.product || "-"}</strong>
                        <span className="product-list-muted">#{item.id}</span>
                      </td>
                      <td>
                        <strong>{item.sku_name || "-"}</strong>
                      </td>
                      <td>
                        <span>{item.product_group || "-"}</span>
                        <span className="product-list-muted">{item.product_source || "-"}</span>
                      </td>
                      <td>
                        <span>{item.product_colour || "-"}</span>
                        <span className="product-list-muted">{item.product_size || "-"}</span>
                      </td>
                      <td>{renderMaterialChips(item.materials)}</td>
                      <td>
                        <span>Cutting: {item.estimasi_cutting ?? "-"}</span>
                        <span className="product-list-muted">Combi: {item.estimasi_combi ?? "-"}</span>
                      </td>
                      <td>{item.id_s || "-"}</td>
                      <td>{item.id_m || "-"}</td>
                      <td>{item.id_l || "-"}</td>
                      <td>{item.id_xl || "-"}</td>
                      <td>
                        <span className="product-list-muted">
                          D {item.pj_dress ?? "-"} / C {item.pj_celana ?? "-"} / B {item.pj_baju ?? "-"}
                        </span>
                      </td>
                      <td>
                        <span>CMT: {formatCurrency(item.price_cmt)}</span>
                        <span className="product-list-muted">Cutting: {formatCurrency(item.price_cutting)}</span>
                      </td>
                      <td className="product-list-notes-cell">{item.notes_spk || "-"}</td>
                      <td>
                        <div className="product-list-actions">
                          <button className="product-list-icon-button info" type="button" onClick={() => openDetailModal(item)} title="Detail">
                            <FaInfoCircle />
                          </button>
                          <button className="product-list-icon-button" type="button" onClick={() => openEditModal(item)} title="Edit">
                            <FaEdit />
                          </button>
                          <button className="product-list-icon-button danger" type="button" onClick={() => handleDelete(item)} title="Hapus">
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="product-list-pagination">
            <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
              Sebelumnya
            </button>
            <span>
              Halaman {currentPage} dari {lastPage}
            </span>
            <button type="button" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= lastPage}>
              Berikutnya
            </button>
          </div>
        </section>
      </main>

      {renderModal()}
    </div>
  );
};

const Field = ({ label, name, value, onChange, type = "text", required = false }) => (
  <label className="product-list-field">
    <span>{label}</span>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      step={type === "number" ? "0.01" : undefined}
      placeholder={label}
    />
  </label>
);

const DetailItem = ({ label, value, suffix = "" }) => (
  <div className="product-list-detail-item">
    <span>{label}</span>
    <strong>{value !== null && value !== undefined && value !== "" ? `${value}${suffix}` : "-"}</strong>
  </div>
);

export default ProductList;
