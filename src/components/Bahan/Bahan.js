import React, { useEffect, useState } from "react";
import "../Jahit/Penjahit.css";
import "../Cutting/SpkCutting/SpkCuting.css";
import API from "../../api";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

const Bahan = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Opsi satuan
  const SATUAN_OPTIONS = [
    { value: "kg", label: "Kilogram (kg)" },
    { value: "yard", label: "Yard" },
  ];

  const [newItem, setNewItem] = useState({
    nama_bahan: "",
    deskripsi: "",
    harga: "",
    satuan: "kg", // default
  });

  const [editItem, setEditItem] = useState({
    id: null,
    nama_bahan: "",
    deskripsi: "",
    harga: "",
    satuan: "kg",
  });

  // === FETCH DATA ===
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await API.get("/bahan");
        setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch (e) {
        setError("Gagal memuat data bahan.");
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
  const filtered = items.filter(
    (b) => (b.nama_bahan || "").toLowerCase().includes(searchTerm.toLowerCase()) || (b.deskripsi || "").toLowerCase().includes(searchTerm.toLowerCase()) || (b.satuan || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
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
    const { name, value } = e.target;
    if (name === "harga") {
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        if (showEditForm) {
          setEditItem((prev) => ({ ...prev, [name]: value }));
        } else {
          setNewItem((prev) => ({ ...prev, [name]: value }));
        }
      }
    } else {
      if (showEditForm) {
        setEditItem((prev) => ({ ...prev, [name]: value }));
      } else {
        setNewItem((prev) => ({ ...prev, [name]: value }));
      }
    }
  };

  const resetForm = () => {
    setNewItem({ nama_bahan: "", deskripsi: "", harga: "", satuan: "kg" });
    setEditItem({ id: null, nama_bahan: "", deskripsi: "", harga: "", satuan: "kg" });
    setShowForm(false);
    setShowEditForm(false);
  };

  // === TAMBAH ===
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!newItem.harga || parseFloat(newItem.harga) < 0) {
        alert("Harga harus diisi dan tidak boleh negatif.");
        return;
      }

      const payload = {
        nama_bahan: newItem.nama_bahan,
        deskripsi: newItem.deskripsi || undefined,
        harga: parseFloat(newItem.harga),
        satuan: newItem.satuan,
      };

      const response = await API.post("/bahan", payload);
      const data = response.data;
      setItems((prev) => [...prev, data]);
      resetForm();
      alert("Bahan berhasil ditambahkan!");
    } catch (error) {
      const errMsg = error.response?.data?.message || "Gagal menambah bahan.";
      alert(errMsg);
    }
  };

  // === EDIT ===
  const handleEditClick = (item) => {
    setEditItem({
      id: item.id,
      nama_bahan: item.nama_bahan || "",
      deskripsi: item.deskripsi || "",
      harga: item.harga?.toString() || "",
      satuan: item.satuan || "kg",
    });
    setShowEditForm(true);
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();
    try {
      if (!editItem.harga || parseFloat(editItem.harga) < 0) {
        alert("Harga harus diisi dan tidak boleh negatif.");
        return;
      }

      const payload = {
        nama_bahan: editItem.nama_bahan,
        deskripsi: editItem.deskripsi || undefined,
        harga: parseFloat(editItem.harga),
        satuan: editItem.satuan,
      };

      const response = await API.put(`/bahan/${editItem.id}`, payload);
      const updatedData = response.data;

      setItems((prev) => prev.map((b) => (b.id === editItem.id ? updatedData : b)));
      resetForm();
      alert("Bahan berhasil diperbarui!");
    } catch (error) {
      const errMsg = error.response?.data?.message || "Gagal memperbarui bahan.";
      alert(errMsg);
    }
  };

  // === HAPUS ===
  
  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Yakin ingin menghapus bahan "${nama}"?`)) return;

    try {
      await API.delete(`/bahan/${id}`); // ✅ Sudah diperbaiki: tambahkan " di akhir
      setItems((prev) => prev.filter((b) => b.id !== id));
      alert("Bahan berhasil dihapus!");
    } catch (error) {
      const errMsg = error.response?.data?.message || "Gagal menghapus bahan.";
      alert(errMsg);
    }
  };
  // === FORMAT RUPIAH ===
  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  return (
    <div>
      <div className="penjahit-container">
        <h1>Master Bahan</h1>
      </div>

      <div className="table-container">
        <div className="filter-header1">
          <button onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah
          </button>
          <div className="search-bar1">
            <input type="text" placeholder="Cari nama bahan, deskripsi, atau satuan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p>Memuat data...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <>
            <table className="penjahit-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Bahan</th>
                  <th>Deskripsi</th>
                  <th>Harga</th>
                  <th>Satuan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((b, index) => (
                  <tr key={b.id}>
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td>{b.nama_bahan}</td>
                    <td>{b.deskripsi || "-"}</td>
                    <td>{formatRupiah(b.harga)}</td>
                    <td>{b.satuan === "kg" ? "Kilogram (kg)" : b.satuan === "yard" ? "Yard" : b.satuan}</td>
                    <td>
                      <button className="btn-icon" title="Edit" onClick={() => handleEditClick(b)} style={{ marginRight: "8px" }}>
                        <FaEdit />
                      </button>
                      <button className="btn-icon" title="Hapus" onClick={() => handleDelete(b.id, b.nama_bahan)} style={{ color: "#dc3545" }}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination" style={{ marginTop: "20px", textAlign: "center" }}>
                <button className="btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button key={page} className={`btn ${currentPage === page ? "btn-primary" : ""}`} onClick={() => goToPage(page)} style={{ margin: "0 4px" }}>
                      {page}
                    </button>
                  );
                })}

                <button className="btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Tambah */}
      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Tambah Bahan</h2>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
                <label>Nama Bahan</label>
                <input type="text" name="nama_bahan" value={newItem.nama_bahan} onChange={handleInputChange} required placeholder="Contoh: Katun, Polyester" />
              </div>
              <div className="form-group">
                <label>Deskripsi (Opsional)</label>
                <textarea name="deskripsi" value={newItem.deskripsi} onChange={handleInputChange} rows="3" placeholder="Deskripsi tambahan tentang bahan ini" />
              </div>
              <div className="form-group">
                <label>Harga (Rp)</label>
                <input type="text" name="harga" value={newItem.harga} onChange={handleInputChange} required placeholder="Contoh: 50000" />
              </div>
              <div className="form-group">
                <label>Satuan</label>
                <select name="satuan" value={newItem.satuan} onChange={handleInputChange} required>
                  {SATUAN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-submit">
                  Simpan
                </button>
                <button type="button" className="btn btn-cancel" onClick={() => setShowForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {showEditForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edit Bahan</h2>
            <form onSubmit={handleFormUpdate} className="modern-form">
              <div className="form-group">
                <label>Nama Bahan</label>
                <input type="text" name="nama_bahan" value={editItem.nama_bahan} onChange={handleInputChange} required placeholder="Contoh: Katun, Polyester" />
              </div>
              <div className="form-group">
                <label>Deskripsi (Opsional)</label>
                <textarea name="deskripsi" value={editItem.deskripsi} onChange={handleInputChange} rows="3" placeholder="Deskripsi tambahan tentang bahan ini" />
              </div>
              <div className="form-group">
                <label>Harga (Rp)</label>
                <input type="text" name="harga" value={editItem.harga} onChange={handleInputChange} required placeholder="Contoh: 50000" />
              </div>
              <div className="form-group">
                <label>Satuan</label>
                <select name="satuan" value={editItem.satuan} onChange={handleInputChange} required>
                  {SATUAN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-submit">
                  Perbarui
                </button>
                <button type="button" className="btn btn-cancel" onClick={() => setShowEditForm(false)}>
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

export default Bahan;
