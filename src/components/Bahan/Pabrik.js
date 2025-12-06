import React, { useEffect, useState } from "react";
import API from "../../api";
import "./Pabrik.css";
import { FaPlus, FaEdit, FaEye, FaBuilding, FaUpload, FaTrash } from "react-icons/fa";

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

  const [newFileName, setNewFileName] = useState("");
  const [editFileName, setEditFileName] = useState("");

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

  const filteredPabriks = pabriks.filter((p) => p.nama_pabrik.toLowerCase().includes(searchTerm.toLowerCase()));

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
    if (file) {
      if (showEditForm) {
        setEditPabrik((prev) => ({ ...prev, ktp: file }));
        setEditFileName(file.name);
      } else {
        setNewPabrik((prev) => ({ ...prev, ktp: file }));
        setNewFileName(file.name);
      }
    }
  };

  const handleRemoveFile = () => {
    if (showEditForm) {
      setEditPabrik((prev) => ({ ...prev, ktp: null }));
      setEditFileName("");
    } else {
      setNewPabrik((prev) => ({ ...prev, ktp: null }));
      setNewFileName("");
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
      setNewFileName("");
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
      setPabriks((prev) => prev.map((p) => (p.id === editPabrik.id ? response.data : p)));
      setEditFileName("");
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
    setNewFileName("");
    setEditFileName("");
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
    setEditFileName("");
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
    <div className="pabrik-page">
      <div className="pabrik-header">
        <div className="pabrik-header-icon">
          <FaBuilding />
        </div>
        <h1>Data Pabrik</h1>
      </div>

      <div className="pabrik-table-container">
        <div className="pabrik-filter-header">
          <button className="pabrik-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah Pabrik
          </button>
          <div className="pabrik-search-bar">
            <input type="text" placeholder="Cari nama pabrik..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p className="pabrik-loading">Memuat data...</p>
        ) : error ? (
          <p className="pabrik-error">{error}</p>
        ) : filteredPabriks.length === 0 ? (
          <p className="pabrik-loading">Belum ada data pabrik</p>
        ) : (
          <table className="pabrik-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Pabrik</th>
                  <th>Lokasi</th>
                  <th>Kontak</th>
                  <th>KTP</th>
                  <th style={{ textAlign: "center" }}>Aksi</th>
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
                          className="pabrik-btn-icon download"
                          onClick={() => {
                            const url = getKtpUrl(pabrik.ktp);
                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                          }}
                        >
                          📄 Lihat KTP
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <button className="pabrik-btn-icon view" onClick={() => handleDetailClick(pabrik)} title="Detail" style={{ marginRight: "8px" }}>
                        <FaEye />
                      </button>
                      <button className="pabrik-btn-icon edit" onClick={() => handleEditClick(pabrik)} title="Edit">
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
        <div className="pabrik-modal">
          <div className="pabrik-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Tambah Pabrik Baru</h2>
            <form onSubmit={handleFormSubmit} className="pabrik-form">
              <div className="pabrik-form-group">
                <label>Nama Pabrik *</label>
                <input type="text" name="nama_pabrik" value={newPabrik.nama_pabrik} onChange={handleInputChange} placeholder="Masukkan nama pabrik" required />
              </div>
              <div className="pabrik-form-row">
                <div className="pabrik-form-group">
                  <label>Lokasi</label>
                  <input type="text" name="lokasi" value={newPabrik.lokasi} onChange={handleInputChange} placeholder="Alamat lokasi pabrik" />
                </div>
                <div className="pabrik-form-group">
                  <label>Kontak</label>
                  <input type="text" name="kontak" value={newPabrik.kontak} onChange={handleInputChange} placeholder="Nomor telepon / WhatsApp" />
                </div>
              </div>
              <div className="pabrik-form-group">
                <label>Upload KTP (opsional)</label>
                <div className="file-upload-wrapper">
                  <div className={`file-upload-area ${newFileName ? "has-file" : ""}`}>
                    <div className="file-upload-icon">
                      <FaUpload />
                    </div>
                    <div className="file-upload-text">Upload File</div>
                    <div className="file-upload-hint">JPG, PNG, atau PDF (Max 5MB)</div>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} className="file-upload-input" />
                  </div>
                  {newFileName && (
                    <div className="uploaded-file">
                      <span className="uploaded-file-name">{newFileName}</span>
                      <button type="button" onClick={handleRemoveFile} className="pabrik-btn pabrik-btn-danger" title="Hapus file">
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="pabrik-form-actions">
                <button type="submit" className="pabrik-btn pabrik-btn-primary">
                  Simpan
                </button>
                <button type="button" onClick={resetAndCloseForm} className="pabrik-btn pabrik-btn-secondary">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {showEditForm && (
        <div className="pabrik-modal">
          <div className="pabrik-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Pabrik</h2>
            <form onSubmit={handleFormUpdate} className="pabrik-form">
              <div className="pabrik-form-group">
                <label>Nama Pabrik *</label>
                <input type="text" name="nama_pabrik" value={editPabrik.nama_pabrik} onChange={handleInputChange} placeholder="Masukkan nama pabrik" required />
              </div>
              <div className="pabrik-form-row">
                <div className="pabrik-form-group">
                  <label>Lokasi</label>
                  <input type="text" name="lokasi" value={editPabrik.lokasi} onChange={handleInputChange} placeholder="Alamat lokasi pabrik" />
                </div>
                <div className="pabrik-form-group">
                  <label>Kontak</label>
                  <input type="text" name="kontak" value={editPabrik.kontak} onChange={handleInputChange} placeholder="Nomor telepon / WhatsApp" />
                </div>
              </div>
              <div className="pabrik-form-group">
                <label>Upload KTP Baru (opsional)</label>
                <div className="file-upload-wrapper">
                  <div className={`file-upload-area ${editFileName ? "has-file" : ""}`}>
                    <div className="file-upload-icon">
                      <FaUpload />
                    </div>
                    <div className="file-upload-text">Upload File</div>
                    <div className="file-upload-hint">JPG, PNG, atau PDF (Max 5MB)</div>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} className="file-upload-input" />
                  </div>
                  {editFileName && (
                    <div className="uploaded-file">
                      <span className="uploaded-file-name">{editFileName}</span>
                      <button type="button" onClick={handleRemoveFile} className="pabrik-btn pabrik-btn-danger" title="Hapus file">
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </div>
                {editPabrik.ktp_path && !editFileName && (
                  <div className="file-preview">
                    <p>KTP saat ini:</p>
                    <a href={getKtpUrl(editPabrik.ktp_path)} target="_blank" rel="noopener noreferrer" style={{ color: "#17457c" }}>
                      📄 Lihat File
                    </a>
                  </div>
                )}
              </div>
              <div className="pabrik-form-actions">
                <button type="submit" className="pabrik-btn pabrik-btn-primary">
                  Perbarui
                </button>
                <button type="button" onClick={resetAndCloseForm} className="pabrik-btn pabrik-btn-secondary">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {isDetailOpen && selectedPabrik && (
        <div className="pabrik-modal">
          <div className="pabrik-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Detail Pabrik</h2>
            <div className="pabrik-detail-grid">
              <div className="pabrik-detail-item">
                <strong>ID</strong>
                <span>{selectedPabrik.id}</span>
              </div>
              <div className="pabrik-detail-item">
                <strong>Nama Pabrik</strong>
                <span>{selectedPabrik.nama_pabrik}</span>
              </div>
              <div className="pabrik-detail-item">
                <strong>Lokasi</strong>
                <span>{selectedPabrik.lokasi || "-"}</span>
              </div>
              <div className="pabrik-detail-item">
                <strong>Kontak</strong>
                <span>{selectedPabrik.kontak || "-"}</span>
              </div>
              <div className="pabrik-detail-item">
                <strong>KTP</strong>
                <span>
                  {selectedPabrik.ktp ? (
                    <a href={getKtpUrl(selectedPabrik.ktp)} target="_blank" rel="noopener noreferrer" style={{ color: "#17457c" }}>
                      📄 Lihat Dokumen
                    </a>
                  ) : (
                    "-"
                  )}
                </span>
              </div>
            </div>
            <div className="pabrik-form-actions">
              <button onClick={closeDetail} className="pabrik-btn pabrik-btn-secondary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PabrikList;
