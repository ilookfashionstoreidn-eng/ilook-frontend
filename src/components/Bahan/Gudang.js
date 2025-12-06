import React, { useEffect, useState } from "react";
import "./Gudang.css";
import API from "../../api";
import { FaPlus, FaEdit, FaEye, FaTrash, FaWarehouse } from "react-icons/fa";

const Gudang = () => {
  const [gudangs, setGudangs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedGudang, setSelectedGudang] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [newGudang, setNewGudang] = useState({ nama_gudang: "", alamat: "", pic: "" });
  const [editGudang, setEditGudang] = useState({ id: null, nama_gudang: "", alamat: "", pic: "" });

  useEffect(() => {
    const fetchGudangs = async () => {
      try {
        setLoading(true);
        const res = await API.get("/gudang");
        setGudangs(res.data || []);
      } catch (e) {
        setError("Gagal memuat data gudang.");
      } finally {
        setLoading(false);
      }
    };
    fetchGudangs();
  }, []);

  const filtered = gudangs.filter((g) => (g.nama_gudang || "").toLowerCase().includes(searchTerm.toLowerCase()));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (showEditForm) {
      setEditGudang((prev) => ({ ...prev, [name]: value }));
    } else {
      setNewGudang((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setNewGudang({ nama_gudang: "", alamat: "", pic: "" });
    setEditGudang({ id: null, nama_gudang: "", alamat: "", pic: "" });
    setShowForm(false);
    setShowEditForm(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/gudang", newGudang);
      setGudangs((prev) => [...prev, res.data]);
      resetForm();
      alert("Gudang berhasil ditambahkan!");
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menambah gudang.");
    }
  };

  const handleEditClick = (g) => {
    setEditGudang({ id: g.id, nama_gudang: g.nama_gudang || "", alamat: g.alamat || "", pic: g.pic || "" });
    setShowEditForm(true);
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post(`/gudang/${editGudang.id}`, { ...editGudang, _method: "PUT" });
      setGudangs((prev) => prev.map((x) => (x.id === editGudang.id ? res.data : x)));
      resetForm();
      alert("Gudang berhasil diperbarui!");
    } catch (err) {
      alert(err.response?.data?.message || "Gagal memperbarui gudang.");
    }
  };

  const handleDelete = async (g) => {
    if (!window.confirm(`Hapus gudang "${g.nama_gudang}"?`)) return;
    try {
      await API.delete(`/gudang/${g.id}`);
      setGudangs((prev) => prev.filter((x) => x.id !== g.id));
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menghapus gudang.");
    }
  };

  const handleDetailClick = async (g) => {
    try {
      const res = await API.get(`/gudang/${g.id}`);
      setSelectedGudang(res.data || g);
    } catch (_) {
      setSelectedGudang(g);
    } finally {
      setIsDetailOpen(true);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedGudang(null);
  };

  return (
    <div className="gudang-page">
      <div className="gudang-header">
        <div className="gudang-header-icon">
          <FaWarehouse />
        </div>
        <h1>Data Gudang</h1>
      </div>

      <div className="gudang-table-container">
        <div className="gudang-filter-header">
          <button className="gudang-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah Gudang
          </button>
          <div className="gudang-search-bar">
            <input type="text" placeholder="Cari nama gudang..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p className="gudang-loading">Memuat data...</p>
        ) : error ? (
          <p className="gudang-error">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="gudang-loading">Belum ada data gudang</p>
        ) : (
          <table className="gudang-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Gudang</th>
                <th>Alamat</th>
                <th>PIC</th>
                <th style={{ textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id}>
                  <td>{g.id}</td>
                  <td>{g.nama_gudang}</td>
                  <td>{g.alamat || "-"}</td>
                  <td>{g.pic || "-"}</td>
                  <td>
                    <button className="gudang-btn-icon view" onClick={() => handleDetailClick(g)} title="Detail" style={{ marginRight: "8px" }}>
                      <FaEye />
                    </button>
                    <button className="gudang-btn-icon edit" onClick={() => handleEditClick(g)} title="Edit" style={{ marginRight: "8px" }}>
                      <FaEdit />
                    </button>
                    <button className="gudang-btn-icon delete" onClick={() => handleDelete(g)} title="Hapus">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="gudang-modal">
          <div className="gudang-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Tambah Gudang Baru</h2>
            <form onSubmit={handleFormSubmit} className="gudang-form">
              <div className="gudang-form-group">
                <label>Nama Gudang *</label>
                <input type="text" name="nama_gudang" value={newGudang.nama_gudang} onChange={handleInputChange} placeholder="Masukkan nama gudang" required />
              </div>
              <div className="gudang-form-group">
                <label>Alamat</label>
                <textarea name="alamat" value={newGudang.alamat} onChange={handleInputChange} placeholder="Alamat lengkap gudang" rows="3" />
              </div>
              <div className="gudang-form-group">
                <label>PIC (Person In Charge)</label>
                <input type="text" name="pic" value={newGudang.pic} onChange={handleInputChange} placeholder="Nama penanggung jawab gudang" />
              </div>
              <div className="gudang-form-actions">
                <button type="submit" className="gudang-btn gudang-btn-primary">
                  Simpan
                </button>
                <button type="button" className="gudang-btn gudang-btn-secondary" onClick={resetForm}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="gudang-modal">
          <div className="gudang-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Gudang</h2>
            <form onSubmit={handleFormUpdate} className="gudang-form">
              <div className="gudang-form-group">
                <label>Nama Gudang *</label>
                <input type="text" name="nama_gudang" value={editGudang.nama_gudang} onChange={handleInputChange} placeholder="Masukkan nama gudang" required />
              </div>
              <div className="gudang-form-group">
                <label>Alamat</label>
                <textarea name="alamat" value={editGudang.alamat} onChange={handleInputChange} placeholder="Alamat lengkap gudang" rows="3" />
              </div>
              <div className="gudang-form-group">
                <label>PIC (Person In Charge)</label>
                <input type="text" name="pic" value={editGudang.pic} onChange={handleInputChange} placeholder="Nama penanggung jawab gudang" />
              </div>
              <div className="gudang-form-actions">
                <button type="submit" className="gudang-btn gudang-btn-primary">
                  Perbarui
                </button>
                <button type="button" className="gudang-btn gudang-btn-secondary" onClick={resetForm}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailOpen && selectedGudang && (
        <div className="gudang-modal">
          <div className="gudang-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Detail Gudang</h2>
            <div className="gudang-detail-grid">
              <div className="gudang-detail-item">
                <strong>ID</strong>
                <span>{selectedGudang.id}</span>
              </div>
              <div className="gudang-detail-item">
                <strong>Nama Gudang</strong>
                <span>{selectedGudang.nama_gudang}</span>
              </div>
              <div className="gudang-detail-item">
                <strong>Alamat</strong>
                <span>{selectedGudang.alamat || "-"}</span>
              </div>
              <div className="gudang-detail-item">
                <strong>PIC (Person In Charge)</strong>
                <span>{selectedGudang.pic || "-"}</span>
              </div>
            </div>
            <div className="gudang-form-actions">
              <button onClick={closeDetail} className="gudang-btn gudang-btn-secondary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gudang;
