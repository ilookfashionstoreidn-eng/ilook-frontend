import React, { useEffect, useState } from "react";
import "../Jahit/Penjahit.css";
import "../Cutting/SpkCutting/SpkCuting.css";
import API from "../../api";
import { FaPlus, FaEdit, FaEye, FaTrash } from "react-icons/fa";

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
    <div>
      <div className="penjahit-container">
        <h1>Data Gudang</h1>
      </div>

      <div className="table-container">
        <div className="filter-header1">
          <button onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah
          </button>
          <div className="search-bar1">
            <input
              type="text"
              placeholder="Cari nama gudang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p>Memuat data...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <table className="penjahit-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Gudang</th>
                <th>Alamat</th>
                <th>PIC</th>
                <th>Aksi</th>
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
                    <button className="btn-icon" onClick={() => handleEditClick(g)}>
                      <FaEdit />
                    </button>
                    <button className="btn-icon" onClick={() => handleDelete(g)}>
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
        <div className="modal">
          <div className="modal-content">
            <h2>Tambah Gudang</h2>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
                <label>Nama Gudang *</label>
                <input type="text" name="nama_gudang" value={newGudang.nama_gudang} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Alamat</label>
                <input type="text" name="alamat" value={newGudang.alamat} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>PIC</label>
                <input type="text" name="pic" value={newGudang.pic} onChange={handleInputChange} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-submit">Simpan</button>
                <button type="button" className="btn btn-cancel" onClick={() => setShowForm(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edit Gudang</h2>
            <form onSubmit={handleFormUpdate} className="modern-form">
              <div className="form-group">
                <label>Nama Gudang *</label>
                <input type="text" name="nama_gudang" value={editGudang.nama_gudang} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Alamat</label>
                <input type="text" name="alamat" value={editGudang.alamat} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>PIC</label>
                <input type="text" name="pic" value={editGudang.pic} onChange={handleInputChange} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-submit">Perbarui</button>
                <button type="button" className="btn btn-cancel" onClick={() => setShowEditForm(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailOpen && selectedGudang && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Detail Gudang</h2>
            <div className="detail-content">
              <p><strong>ID:</strong> {selectedGudang.id}</p>
              <p><strong>Nama Gudang:</strong> {selectedGudang.nama_gudang}</p>
              <p><strong>Alamat:</strong> {selectedGudang.alamat || "-"}</p>
              <p><strong>PIC:</strong> {selectedGudang.pic || "-"}</p>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-cancel" onClick={closeDetail}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gudang