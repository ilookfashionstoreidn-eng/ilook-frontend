import React, { useEffect, useState } from "react";
import "./TukangPola.css";
import API from "../../../api";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaUser } from "react-icons/fa";

const TukangPola = () => {
  const [tukangPola, setTukangPola] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nama: "",
  });

  useEffect(() => {
    fetchTukangPola();
  }, []);

  const fetchTukangPola = async () => {
    try {
      setLoading(true);
      const response = await API.get("/tukang_pola");
      setTukangPola(response.data);
    } catch (error) {
      setError("Gagal mengambil data tukang pola.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Update
        const response = await API.put(`/tukang_pola/${editingId}`, formData);
        alert("Tukang Pola berhasil diupdate!");
        setTukangPola(tukangPola.map((item) => (item.id === editingId ? response.data.data : item)));
      } else {
        // Create
        const response = await API.post("/tukang_pola", formData);
        alert("Tukang Pola berhasil ditambahkan!");
        setTukangPola([...tukangPola, response.data.data]);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ nama: "" });
      fetchTukangPola(); // Refresh data setelah create/update
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan tukang pola.");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ nama: item.nama });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus tukang pola ini?")) {
      try {
        await API.delete(`/tukang_pola/${id}`);
        alert("Tukang Pola berhasil dihapus!");
        fetchTukangPola(); // Refresh data setelah delete
      } catch (error) {
        console.error("Error:", error.response?.data?.message || error.message);
        alert(error.response?.data?.message || "Terjadi kesalahan saat menghapus tukang pola.");
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ nama: "" });
  };

  const filteredTukangPola = tukangPola.filter((item) => item.nama.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="tukang-pola-page">
      {/* Header */}
      <div className="tukang-pola-header">
        <div className="tukang-pola-header-icon">
          <FaUser />
        </div>
        <h1>Data Tukang Pola</h1>
      </div>

      {/* Action Bar */}
      <div className="tukang-pola-action-bar">
        <button
          className="tukang-pola-btn-add"
          onClick={() => {
            setEditingId(null);
            setFormData({ nama: "" });
            setShowForm(true);
          }}
        >
          <FaPlus /> Tambah Tukang Pola
        </button>
        <div className="tukang-pola-search-container">
          <FaSearch className="tukang-pola-search-icon" />
          <input type="text" className="tukang-pola-search-input" placeholder="Cari nama tukang pola..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Table Container */}
      <div className="tukang-pola-table-container">
        {loading ? (
          <div className="tukang-pola-loading">Memuat data...</div>
        ) : error ? (
          <div className="tukang-pola-error">{error}</div>
        ) : filteredTukangPola.length === 0 ? (
          <div className="tukang-pola-empty">
            <div className="tukang-pola-empty-icon">📋</div>
            <p>Tidak ada data tukang pola</p>
            {searchTerm && <p style={{ fontSize: "14px", marginTop: "8px" }}>Coba gunakan kata kunci lain</p>}
          </div>
        ) : (
          <table className="tukang-pola-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Tukang Pola</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTukangPola.map((tp, index) => (
                <tr key={tp.id}>
                  <td>{index + 1}</td>
                  <td>{tp.nama}</td>
                  <td>
                    <div className="tukang-pola-action-buttons">
                      <button className="tukang-pola-btn-edit" onClick={() => handleEdit(tp)}>
                        <FaEdit /> Edit
                      </button>
                      <button className="tukang-pola-btn-delete" onClick={() => handleDelete(tp.id)}>
                        <FaTrash /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="tukang-pola-modal-overlay" onClick={handleCancel}>
          <div className="tukang-pola-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tukang-pola-modal-header">
              <h2 className="tukang-pola-modal-title">
                <FaUser /> {editingId ? "Edit Tukang Pola" : "Tambah Tukang Pola"}
              </h2>
              <button className="tukang-pola-modal-close" onClick={handleCancel}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="tukang-pola-form-group">
                <label className="tukang-pola-form-label">Nama Tukang Pola</label>
                <input type="text" name="nama" className="tukang-pola-form-input" value={formData.nama} onChange={handleInputChange} placeholder="Masukkan nama tukang pola" required autoFocus />
              </div>

              <div className="tukang-pola-form-actions">
                <button type="button" className="tukang-pola-btn-cancel" onClick={handleCancel}>
                  Batal
                </button>
                <button type="submit" className="tukang-pola-btn-submit">
                  {editingId ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TukangPola;
