import React, { useEffect, useState } from "react";
import "../../Jahit/Penjahit.css";
import "../../Jahit/SpkCmt.css";
import API from "../../../api";
import { FaPlus, FaSearch, FaEdit, FaTrash } from "react-icons/fa";

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
    <div className="spkcmt-container">
      {/* Header */}
      <div className="spkcmt-header">
        <h1>✂️ Data Tukang Pola</h1>
      </div>

      {/* Filters */}
      <div className="spkcmt-filters">
        <button
          className="spkcmt-btn-primary"
          onClick={() => {
            setEditingId(null);
            setFormData({ nama: "" });
            setShowForm(true);
          }}
        >
          <FaPlus /> Tambah Tukang Pola
        </button>
        <div className="spkcmt-search">
          <FaSearch className="spkcmt-search-icon" />
          <input
            type="text"
            placeholder="Cari nama tukang pola..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="spkcmt-table-container">
        {loading ? (
          <div className="loading">Memuat data...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : filteredTukangPola.length === 0 ? (
          <div className="empty-state">
            <p>Tidak ada data tukang pola</p>
          </div>
        ) : (
          <table className="spkcmt-table">
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
                  <td><strong>{tp.nama}</strong></td>
                  <td>
                    <div className="action-buttons" style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="spkcmt-btn-primary" 
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => handleEdit(tp)}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button 
                        className="spkcmt-btn-primary" 
                        style={{ padding: '5px 10px', fontSize: '12px', backgroundColor: '#dc3545' }}
                        onClick={() => handleDelete(tp.id)}
                      >
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
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? "Edit Tukang Pola" : "Tambah Tukang Pola"}</h2>
              <button className="close-btn" onClick={handleCancel}>&times;</button>
            </div>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
                <label>Nama Tukang Pola:</label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama tukang pola"
                  required
                  autoFocus
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="spkcmt-btn-primary" style={{ width: '100%' }}>
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
