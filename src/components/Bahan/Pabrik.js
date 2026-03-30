import React, { useEffect, useState } from "react";
import API from "../../api";
import "./Pabrik.css";
import {
  FaPlus,
  FaEdit,
  FaEye,
  FaBuilding,
  FaUpload,
  FaTrash,
  FaSearch,
  FaIdCard,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PabrikList = () => {
  const [pabriks, setPabriks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedPabrik, setSelectedPabrik] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

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
    ktp_path: "",
  });

  const [newFileName, setNewFileName] = useState("");
  const [editFileName, setEditFileName] = useState("");

  useEffect(() => {
    const fetchPabriks = async () => {
      try {
        setLoading(true);
        const response = await API.get("/pabrik");
        setPabriks(response.data);
      } catch (err) {
        setError("Gagal memuat data pabrik.");
        toast.error("Gagal memuat data pabrik.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPabriks();
  }, []);

  const filteredPabriks = pabriks.filter((p) => p.nama_pabrik.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPabrik = pabriks.length;
  const withContact = pabriks.filter((p) => Boolean(p.kontak && p.kontak.trim())).length;
  const withKtp = pabriks.filter((p) => Boolean(p.ktp)).length;

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
      toast.success("Pabrik berhasil ditambahkan!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menambah pabrik.");
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
      toast.success("Pabrik berhasil diperbarui!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui pabrik.");
      console.error(err);
    }
  };

  const openDeleteModal = (pabrik) => {
    setItemToDelete(pabrik);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const handleDeletePabrik = async () => {
    if (!itemToDelete) return;

    try {
      await API.delete(`/pabrik/${itemToDelete.id}`);
      setPabriks((prev) => prev.filter((p) => p.id !== itemToDelete.id));

      if (selectedPabrik?.id === itemToDelete.id) {
        closeDetail();
      }

      closeDeleteModal();
      toast.success("Data pabrik berhasil dihapus.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus data pabrik.");
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

  const getKtpUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const base = (process.env.REACT_APP_API_URL || "").replace(/\/api\/?$/, "");
    return `${base}/storage/${path}`;
  };

  return (
    <div className="pabrik-page">
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar theme="colored" />

      <header className="pabrik-header">
        <div className="pabrik-title-group">
          <div className="pabrik-header-icon">
            <FaBuilding />
          </div>
          <div>
            <h1>Master Data Pabrik</h1>
            <p>Kelola data pabrik pemasok, kontak operasional, dan dokumen pendukung.</p>
          </div>
        </div>
        <button className="pabrik-btn-add" onClick={() => setShowForm(true)}>
          <FaPlus /> Tambah Pabrik
        </button>
      </header>

      <section className="pabrik-kpi-grid">
        <article className="pabrik-kpi-card">
          <span>Total Pabrik</span>
          <strong>{totalPabrik}</strong>
          <p>Data terdaftar di sistem</p>
        </article>
        <article className="pabrik-kpi-card">
          <span>Kontak Tersedia</span>
          <strong>{withContact}</strong>
          <p>Siap dihubungi tim procurement</p>
        </article>
        <article className="pabrik-kpi-card">
          <span>Dokumen KTP</span>
          <strong>{withKtp}</strong>
          <p>File identitas sudah diunggah</p>
        </article>
      </section>

      <section className="pabrik-table-container">
        <div className="pabrik-filter-header">
          <div className="pabrik-table-title">
            <h2>Daftar Pabrik</h2>
            <p>{filteredPabriks.length} data ditampilkan</p>
          </div>
          <div className="pabrik-search-bar">
            <FaSearch className="pabrik-search-icon" />
            <input type="text" placeholder="Cari nama pabrik..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="pabrik-state">
            <p className="pabrik-loading">Memuat data pabrik...</p>
          </div>
        ) : error ? (
          <div className="pabrik-state">
            <p className="pabrik-error">{error}</p>
          </div>
        ) : filteredPabriks.length === 0 ? (
          <div className="pabrik-state">
            <p className="pabrik-loading">Belum ada data pabrik yang sesuai pencarian.</p>
          </div>
        ) : (
          <table className="pabrik-table">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Nama Pabrik</th>
                <th>Lokasi</th>
                <th>Kontak</th>
                <th>Dokumen KTP</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPabriks.map((pabrik, index) => (
                <tr key={pabrik.id}>
                  <td className="pabrik-id-cell">{index + 1}</td>
                  <td>
                    <div className="pabrik-name-cell">
                      <span>{pabrik.nama_pabrik}</span>
                    </div>
                  </td>
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
                        <FaIdCard /> Lihat
                      </button>
                    ) : (
                      <span className="pabrik-empty-mark">Tidak ada</span>
                    )}
                  </td>
                  <td>
                    <div className="pabrik-actions">
                      <button className="pabrik-btn-icon view" onClick={() => handleDetailClick(pabrik)} title="Detail">
                        <FaEye />
                      </button>
                      <button className="pabrik-btn-icon edit" onClick={() => handleEditClick(pabrik)} title="Edit">
                        <FaEdit />
                      </button>
                      <button className="pabrik-btn-icon delete" onClick={() => openDeleteModal(pabrik)} title="Hapus">
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showForm && (
        <div className="pabrik-modal" onClick={resetAndCloseForm}>
          <div className="pabrik-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pabrik-modal-header">
              <div>
                <h2>Tambah Pabrik Baru</h2>
                <p>Isi data pabrik untuk menambah master data supplier.</p>
              </div>
              <button type="button" className="pabrik-close-btn" onClick={resetAndCloseForm} title="Tutup">
                <FaTimes />
              </button>
            </div>
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

      {showEditForm && (
        <div className="pabrik-modal" onClick={resetAndCloseForm}>
          <div className="pabrik-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pabrik-modal-header">
              <div>
                <h2>Edit Pabrik</h2>
                <p>Perbarui data pabrik tanpa mengubah histori transaksi.</p>
              </div>
              <button type="button" className="pabrik-close-btn" onClick={resetAndCloseForm} title="Tutup">
                <FaTimes />
              </button>
            </div>
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
                    <a href={getKtpUrl(editPabrik.ktp_path)} target="_blank" rel="noopener noreferrer">
                      Lihat File
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

      {isDetailOpen && selectedPabrik && (
        <div className="pabrik-modal" onClick={closeDetail}>
          <div className="pabrik-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pabrik-modal-header">
              <div>
                <h2>Detail Pabrik</h2>
                <p>Ringkasan informasi legal dan operasional pabrik.</p>
              </div>
              <button type="button" className="pabrik-close-btn" onClick={closeDetail} title="Tutup">
                <FaTimes />
              </button>
            </div>
            <div className="pabrik-detail-grid">
              <div className="pabrik-detail-item">
                <strong>Nomor</strong>
                <span>{selectedPabrik.id}</span>
              </div>
              <div className="pabrik-detail-item">
                <strong>Nama Pabrik</strong>
                <span>{selectedPabrik.nama_pabrik}</span>
              </div>
              <div className="pabrik-detail-item">
                <strong>Lokasi</strong>
                <span>{selectedPabrik.lokasi || <span className="pabrik-empty-mark">Tidak ada</span>}</span>
              </div>
              <div className="pabrik-detail-item">
                <strong>Kontak</strong>
                <span>{selectedPabrik.kontak || <span className="pabrik-empty-mark">Tidak ada</span>}</span>
              </div>
              <div className="pabrik-detail-item">
                <strong>KTP</strong>
                <span>
                  {selectedPabrik.ktp ? (
                    <a href={getKtpUrl(selectedPabrik.ktp)} target="_blank" rel="noopener noreferrer">
                      Lihat Dokumen
                    </a>
                  ) : (
                    <span className="pabrik-empty-mark">Tidak ada</span>
                  )}
                </span>
              </div>
            </div>
            <div className="pabrik-detail-metadata">
              <div>
                <FaMapMarkerAlt />
                <span>Lokasi terverifikasi jika alamat terisi lengkap.</span>
              </div>
              <div>
                <FaPhoneAlt />
                <span>Kontak digunakan untuk koordinasi operasional harian.</span>
              </div>
              <div>
                <FaIdCard />
                <span>Dokumen KTP mendukung validasi data mitra.</span>
              </div>
            </div>
            <div className="pabrik-form-actions pabrik-detail-actions">
              <button onClick={closeDetail} className="pabrik-btn pabrik-btn-secondary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && itemToDelete && (
        <div className="pabrik-modal" onClick={closeDeleteModal}>
          <div className="pabrik-modal-content pabrik-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pabrik-delete-icon">
              <FaExclamationTriangle />
            </div>
            <h3>Konfirmasi Hapus Data</h3>
            <p className="pabrik-delete-text">
              Data pabrik <strong>{itemToDelete.nama_pabrik}</strong> akan dihapus permanen. Lanjutkan?
            </p>
            <div className="pabrik-delete-actions">
              <button type="button" className="pabrik-btn pabrik-btn-secondary" onClick={closeDeleteModal}>
                Batal
              </button>
              <button type="button" className="pabrik-btn pabrik-btn-danger-solid" onClick={handleDeletePabrik}>
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PabrikList;
