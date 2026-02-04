import React, { useEffect, useState } from "react";
import "./Sku.css";
import API from "../../api";
import { FaPlus, FaEdit, FaBarcode } from "react-icons/fa";

const Sku = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [newItem, setNewItem] = useState({
    sku: "",
  });

  const [editItem, setEditItem] = useState({
    id: null,
    sku: "",
    is_active: true,
  });

  // === FETCH DATA ===
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await API.get("/skus");
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setItems(data);
      } catch (e) {
        setError("Gagal memuat data SKU.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // === PAGINATION ===
  const filtered = items.filter((s) => (s.sku || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // === HANDLERS ===
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    
    if (showEditForm) {
      setEditItem((prev) => ({ ...prev, [name]: val }));
    } else {
      setNewItem((prev) => ({ ...prev, [name]: val }));
    }
  };

  const resetForm = () => {
    setNewItem({ sku: "" });
    setEditItem({ id: null, sku: "", is_active: true });
    setShowForm(false);
    setShowEditForm(false);
  };

  // === TAMBAH ===
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!newItem.sku || newItem.sku.trim() === "") {
        alert("SKU wajib diisi.");
        return;
      }

      const payload = {
        sku: newItem.sku.trim(),
      };

      const response = await API.post("/skus", payload);
      const data = response.data?.data || response.data;
      setItems((prev) => [...prev, data].sort((a, b) => (a.sku || "").localeCompare(b.sku || "")));
      resetForm();
      alert(response.data?.message || "SKU berhasil ditambahkan!");
    } catch (error) {
      const errMsg = error.response?.data?.message || error.response?.data?.errors?.sku?.[0] || "Gagal menambah SKU.";
      alert(errMsg);
    }
  };

  // === EDIT ===
  const handleEditClick = (item) => {
    setEditItem({
      id: item.id,
      sku: item.sku || "",
      is_active: item.is_active !== undefined ? item.is_active : true,
    });
    setShowEditForm(true);
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();
    try {
      if (!editItem.sku || editItem.sku.trim() === "") {
        alert("SKU wajib diisi.");
        return;
      }

      const payload = {
        sku: editItem.sku.trim(),
        is_active: editItem.is_active,
      };

      const response = await API.patch(`/skus/${editItem.id}`, payload);
      const updatedData = response.data?.data || response.data;

      setItems((prev) =>
        prev
          .map((s) => (s.id === editItem.id ? updatedData : s))
          .sort((a, b) => (a.sku || "").localeCompare(b.sku || ""))
      );
      resetForm();
      alert(response.data?.message || "SKU berhasil diperbarui!");
    } catch (error) {
      const errMsg = error.response?.data?.message || error.response?.data?.errors?.sku?.[0] || "Gagal memperbarui SKU.";
      alert(errMsg);
    }
  };

  return (
    <div className="spkcmt-container">
      <div className="spkcmt-header">
        <h1>📋 Data SKU</h1>
      </div>

      <div className="sku-table-container">
        <div className="sku-filter-header">
          <button className="sku-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah SKU
          </button>
          <div className="sku-search-bar">
            <input type="text" placeholder="Cari SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p className="sku-loading">Memuat data...</p>
        ) : error ? (
          <p className="sku-error">{error}</p>
        ) : currentItems.length === 0 ? (
          <p className="sku-loading">Belum ada data SKU</p>
        ) : (
          <>
            <div className="sku-table-wrapper">
              <table className="sku-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>SKU</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((s, index) => (
                    <tr key={s.id}>
                      <td>{indexOfFirstItem + index + 1}</td>
                      <td className="sku-code">{s.sku}</td>
                      <td>
                        <span className={`sku-badge ${s.is_active ? "active" : "inactive"}`}>
                          {s.is_active ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </td>
                      <td>
                        <button className="sku-btn-icon edit" onClick={() => handleEditClick(s)} title="Edit">
                          <FaEdit />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="sku-pagination">
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button key={page} className={currentPage === page ? "active" : ""} onClick={() => goToPage(page)}>
                      {page}
                    </button>
                  );
                })}

                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Tambah */}
      {showForm && (
        <div className="sku-modal" onClick={resetForm}>
          <div className="sku-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Tambah SKU Baru</h2>
            <form onSubmit={handleFormSubmit} className="sku-form">
              <div className="sku-form-group">
                <label>SKU *</label>
                <input
                  type="text"
                  name="sku"
                  value={newItem.sku}
                  onChange={handleInputChange}
                  required
                  placeholder="Contoh : TSHRT-RED-M"
                />
              </div>
              <div className="sku-form-actions">
                <button type="submit" className="sku-btn sku-btn-primary">
                  Simpan
                </button>
                <button type="button" className="sku-btn sku-btn-secondary" onClick={resetForm}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {showEditForm && (
        <div className="sku-modal" onClick={resetForm}>
          <div className="sku-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit SKU</h2>
            <form onSubmit={handleFormUpdate} className="sku-form">
              <div className="sku-form-group">
                <label>SKU *</label>
                <input
                  type="text"
                  name="sku"
                  value={editItem.sku}
                  onChange={handleInputChange}
                  required
                  placeholder="TSHRT-RED-M"
                />
              </div>
              <div className="sku-form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={editItem.is_active}
                    onChange={handleInputChange}
                    style={{ width: "auto", cursor: "pointer" }}
                  />
                  <span>Aktif</span>
                </label>
              </div>
              <div className="sku-form-actions">
                <button type="submit" className="sku-btn sku-btn-primary">
                  Perbarui
                </button>
                <button type="button" className="sku-btn sku-btn-secondary" onClick={resetForm}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sku;
