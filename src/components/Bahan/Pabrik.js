import React, { useEffect, useState } from "react";
import API from "../../api";
import "../Jahit/Penjahit.css";
import "../Cutting/SpkCutting/SpkCuting.css";
import { FaPlus, FaEdit, FaEye } from "react-icons/fa";

const PabrikList = () => {
  const [pabriks, setPabriks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedPabrik, setSelectedPabrik] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [newPabrik, setNewPabrik] = useState({
    nama_pabrik: "",
    lokasi: "",
    kontak: "",
    ktp: null,
  });

  const [editPabrik, setEditPabrik] = useState({
    id: null,
    nama_pabrik: "",
    lokasi: "",
    kontak: "",
    ktp: null,
    ktp_path: "", // untuk menampilkan preview lama
  });

  // Fetch pabrik
  useEffect(() => {
    const fetchPabriks = async () => {
      try {
        setLoading(true);
        const response = await API.get("/pabrik");
        setPabriks(response.data);
      } catch (err) {
        setError("Gagal memuat data pabrik.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPabriks();
  }, []);

  const filteredPabriks = pabriks.filter((p) =>
    p.nama_pabrik.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (showEditForm) {
      setEditPabrik((prev) => ({ ...prev, [name]: value }));
    } else {
      setNewPabrik((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (showEditForm) {
      setEditPabrik((prev) => ({ ...prev, ktp: file }));
    } else {
      setNewPabrik((prev) => ({ ...prev, ktp: file }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("nama_pabrik", newPabrik.nama_pabrik);
    if (newPabrik.lokasi) formData.append("lokasi", newPabrik.lokasi);
    if (newPabrik.kontak) formData.append("kontak", newPabrik.kontak);
    if (newPabrik.ktp) formData.append("ktp", newPabrik.ktp);

    try {
      const response = await API.post("/pabrik", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPabriks((prev) => [...prev, response.data]);
      resetAndCloseForm();
      alert("Pabrik berhasil ditambahkan!");
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menambah pabrik.");
      console.error(err);
    }
  };

  const handleFormUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("nama_pabrik", editPabrik.nama_pabrik);
    if (editPabrik.lokasi) formData.append("lokasi", editPabrik.lokasi);
    if (editPabrik.kontak) formData.append("kontak", editPabrik.kontak);
    if (editPabrik.ktp) formData.append("ktp", editPabrik.ktp);
    formData.append("_method", "PUT");

    try {
      const response = await API.post(`/pabrik/${editPabrik.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPabriks((prev) =>
        prev.map((p) => (p.id === editPabrik.id ? response.data : p))
      );
      resetAndCloseForm();
      alert("Pabrik berhasil diperbarui!");
    } catch (err) {
      alert(err.response?.data?.message || "Gagal memperbarui pabrik.");
      console.error(err);
    }
  };

  const resetAndCloseForm = () => {
    setNewPabrik({ nama_pabrik: "", lokasi: "", kontak: "", ktp: null });
    setEditPabrik({
      id: null,
      nama_pabrik: "",
      lokasi: "",
      kontak: "",
      ktp: null,
      ktp_path: "",
    });
    setShowForm(false);
    setShowEditForm(false);
  };

  const handleEditClick = (pabrik) => {
    setEditPabrik({
      id: pabrik.id,
      nama_pabrik: pabrik.nama_pabrik,
      lokasi: pabrik.lokasi || "",
      kontak: pabrik.kontak || "",
      ktp: null,
      ktp_path: pabrik.ktp || "",
    });
    setShowEditForm(true);
  };

  const handleDetailClick = (pabrik) => {
    setSelectedPabrik(pabrik);
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedPabrik(null);
  };

  // Helper untuk menampilkan preview KTP
  const getKtpUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const base = (process.env.REACT_APP_API_URL || "").replace(/\/api\/?$/, "");
    return `${base}/storage/${path}`;
  };

  return (
    <div>
      <div className="penjahit-container">
        <h1>Data Pabrik</h1>
      </div>

      <div className="table-container">
        <div className="filter-header1">
          <button onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah
          </button>
          <div className="search-bar1">
            <input
              type="text"
              placeholder="Cari nama pabrik..."
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
              <th>Nama Pabrik</th>
              <th>Lokasi</th>
              <th>Kontak</th>
              <th>KTP</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredPabriks.map((pabrik) => (
              <tr key={pabrik.id}>
                <td>{pabrik.id}</td>
                <td>{pabrik.nama_pabrik}</td>
                <td>{pabrik.lokasi || "-"}</td>
                <td>{pabrik.kontak || "-"}</td>
                <td>
                  {pabrik.ktp ? (
                    <button
                      type="button"
                      className="btn"
                      style={{ backgroundColor: "#0d6efd", color: "#fff" }}
                      onClick={() => {
                        const url = getKtpUrl(pabrik.ktp);
                        if (url) window.open(url, "_blank", "noopener,noreferrer");
                      }}
                    >
                      Lihat KTP
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <button
                    onClick={() => handleEditClick(pabrik)}
                    className="btn-icon"
                  >
                    <FaEdit />
                  </button>
                 
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>

      {/* Modal Tambah */}
      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Tambah Pabrik Baru</h2>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
                <label>Nama Pabrik *</label>
                <input
                  type="text"
                  name="nama_pabrik"
                  value={newPabrik.nama_pabrik}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Lokasi</label>
                <input
                  type="text"
                  name="lokasi"
                  value={newPabrik.lokasi}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Kontak</label>
                <input
                  type="text"
                  name="kontak"
                  value={newPabrik.kontak}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Upload KTP (opsional)</label>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-submit">Simpan</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-cancel">
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
            <h2>Edit Pabrik</h2>
            <form onSubmit={handleFormUpdate} className="modern-form">
              <div className="form-group">
                <label>Nama Pabrik *</label>
                <input
                  type="text"
                  name="nama_pabrik"
                  value={editPabrik.nama_pabrik}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Lokasi</label>
                <input
                  type="text"
                  name="lokasi"
                  value={editPabrik.lokasi}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Kontak</label>
                <input
                  type="text"
                  name="kontak"
                  value={editPabrik.kontak}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Upload KTP Baru (opsional)</label>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
                {editPabrik.ktp_path && (
                  <div>
                    <p>KTP saat ini: </p>
                    <a
                      href={getKtpUrl(editPabrik.ktp_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link"
                    >
                      Lihat File
                    </a>
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-submit">Perbarui</button>
                <button type="button" onClick={() => setShowEditForm(false)} className="btn btn-cancel">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {isDetailOpen && selectedPabrik && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Detail Pabrik</h2>
            <div className="detail-content">
              <p><strong>ID:</strong> {selectedPabrik.id}</p>
              <p><strong>Nama Pabrik:</strong> {selectedPabrik.nama_pabrik}</p>
              <p><strong>Lokasi:</strong> {selectedPabrik.lokasi || "-"}</p>
              <p><strong>Kontak:</strong> {selectedPabrik.kontak || "-"}</p>
              <p>
                <strong>KTP:</strong>{" "}
                {selectedPabrik.ktp ? (
                  <a
                    href={getKtpUrl(selectedPabrik.ktp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                  >
                    Lihat Dokumen
                  </a>
                ) : (
                  "-"
                )}
              </p>
            </div>
            <button onClick={closeDetail} className="btn-close">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PabrikList;