import React, { useEffect, useMemo, useState } from "react";
import "./SPKSample.css";
import API from "../../api";
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiImage,
  FiEye,
  FiTag,
  FiFileText,
  FiAlignLeft,
  FiAlertCircle,
  FiLayers,
  FiActivity,
  FiInfo,
  FiUserPlus,
  FiUser,
  FiPhone,
} from "react-icons/fi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const initialForm = {
  id: null,
  nama_sample: "",
  kategori_sample: "SET CELANA PANJANG",
  detail: "",
  status_spk: "Normal",
  status_proses: "Belum Kerjain Pola",
  tahap_proses: "Pola Sample",
  keterangan_sample: "",
};

const kategoriOptions = [
  "SET CELANA PANJANG",
  "SET CELANA PENDEK",
  "SET ROK",
  "DASTER",
  "DRESS",
  "BLOUSE",
  "GAMIS",
  "KAOS",
];

const statusOptions = ["Urgent", "Normal"];
const statusProsesOptions = [
  "Belum Kerjain Pola",
  "Menunggu ACC",
  "Revisi",
  "ACC",
];
const tahapProsesOptions = [
  "Pola Sample",
  "Cutting",
  "Cutting Sample",
  "Jahit Sample",
  "Pengiriman",
];

const SPKSample = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [tukangList, setTukangList] = useState([]);
  const [selectedTukangId, setSelectedTukangId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [updatingTahapId, setUpdatingTahapId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    return () => {
      if (fotoPreview && fotoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(fotoPreview);
      }
    };
  }, [fotoPreview]);

  const getFotoUrl = (path) => {
    if (!path) {
      return "";
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const baseStorage = process.env.REACT_APP_STORAGE_URL || "http://localhost:8000/storage";
    return `${baseStorage}/${path}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await API.get("/spk-sample");
      setData(response.data?.data || []);
    } catch (error) {
      toast.error("Gagal mengambil data SPK Sample.");
    } finally {
      setLoading(false);
    }
  };

  const calculateLamaPengerjaan = (createdAt) => {
    if (!createdAt) return "-";
    const start = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} hari`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredData = useMemo(() => {
    const keyword = search.toLowerCase();

    return data.filter((item) => {
      const nama = item.nama_sample?.toLowerCase() || "";
      const kategori = item.kategori_sample?.toLowerCase() || "";
      const status = item.status_spk?.toLowerCase() || "";
      const statusProses = item.status_proses?.toLowerCase() || "";

      return (
        nama.includes(keyword) ||
        kategori.includes(keyword) ||
        status.includes(keyword) ||
        statusProses.includes(keyword)
      );
    });
  }, [data, search]);

  const openAddModal = () => {
    setIsEdit(false);
    setFormData(initialForm);
    setFotoFile(null);
    setFotoPreview("");
    setShowForm(true);
  };

  const openEditModal = (item) => {
    setIsEdit(true);
    setFormData({
      id: item.id,
      nama_sample: item.nama_sample || "",
      kategori_sample: item.kategori_sample || "SET CELANA PANJANG",
      detail: item.detail || "",
      status_spk: item.status_spk || "Normal",
      status_proses: item.status_proses || "Belum Kerjain Pola",
      tahap_proses: item.tahap_proses || "Pola Sample",
      keterangan_sample: item.keterangan_sample || "",
    });
    setFotoFile(null);
    setFotoPreview(getFotoUrl(item.foto));
    setShowForm(true);
  };

  const closeFormModal = () => {
    setShowForm(false);
    setIsEdit(false);
    setSubmitting(false);
    setFormData(initialForm);
    setFotoFile(null);
    setFotoPreview("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("File foto harus berupa gambar.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5 MB.");
      return;
    }

    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const payload = new FormData();
      payload.append("nama_sample", formData.nama_sample);
      payload.append("kategori_sample", formData.kategori_sample);
      payload.append("detail", formData.detail || "");
      payload.append("status_spk", formData.status_spk);
      payload.append("status_proses", formData.status_proses || "");
      payload.append("tahap_proses", formData.tahap_proses || "");
      payload.append("keterangan_sample", formData.keterangan_sample || "");

      if (fotoFile) {
        payload.append("foto", fotoFile);
      }

      if (isEdit && formData.id) {
        payload.append("_method", "PUT");
        await API.post(`/spk-sample/${formData.id}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("SPK Sample berhasil diperbarui.");
      } else {
        await API.post("/spk-sample", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("SPK Sample berhasil ditambahkan.");
      }

      closeFormModal();
      fetchData();
    } catch (error) {
      const message = error.response?.data?.message || "Gagal menyimpan data SPK Sample.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setSelectedItem(null);
    setShowDeleteModal(false);
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setSelectedItem(null);
    setShowDetailModal(false);
  };

  const fetchTukangList = async () => {
    try {
      const res = await API.get("/tukang-sample");
      setTukangList(res.data?.data || []);
    } catch {
      toast.error("Gagal mengambil daftar tukang.");
    }
  };

  const openAssignModal = (item) => {
    setSelectedItem(item);
    setSelectedTukangId(item.tukang_sample_id ? String(item.tukang_sample_id) : "");
    setShowAssignModal(true);
    fetchTukangList();
  };

  const closeAssignModal = () => {
    setSelectedItem(null);
    setSelectedTukangId("");
    setShowAssignModal(false);
  };

  const handleAssignTukang = async () => {
    if (!selectedItem) return;
    try {
      setAssigning(true);
      const res = await API.post(`/spk-sample/${selectedItem.id}/assign-tukang`, {
        tukang_sample_id: selectedTukangId === "" ? null : Number(selectedTukangId),
      });
      toast.success("Tukang pola berhasil ditetapkan.");
      setData((prev) =>
        prev.map((d) => (d.id === selectedItem.id ? res.data.data : d))
      );
      closeAssignModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menetapkan tukang pola.");
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusProsesChange = async (id, newStatus) => {
    try {
      setUpdatingStatusId(id);
      const res = await API.patch(`/spk-sample/${id}/status-proses`, { status_proses: newStatus });
      toast.success("Status proses berhasil diperbarui.");
      setData((prev) => prev.map((item) => item.id === id ? res.data.data : item));
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal memperbarui status proses.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleTahapProsesChange = async (id, newTahap) => {
    try {
      setUpdatingTahapId(id);
      const res = await API.patch(`/spk-sample/${id}/tahap-proses`, { tahap_proses: newTahap });
      toast.success("Tahap proses berhasil diperbarui.");
      setData((prev) => prev.map((item) => item.id === id ? res.data.data : item));
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal memperbarui tahap proses.");
    } finally {
      setUpdatingTahapId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) {
      return;
    }

    try {
      await API.delete(`/spk-sample/${selectedItem.id}`);
      toast.success("SPK Sample berhasil dihapus.");
      closeDeleteModal();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menghapus data SPK Sample.");
    }
  };

  return (
    <div className="spk-sample-container">
      <ToastContainer position="top-right" autoClose={2600} hideProgressBar theme="light" />

      <div className="spk-sample-header">
        <div>
          <h1 className="spk-sample-title">Management SPK Sample</h1>
          <p className="spk-sample-subtitle">Daftar SPK Sample dengan detail dan dokumentasi foto.</p>
        </div>
      </div>

      <div className="spk-sample-toolbar">
        <div className="spk-sample-search-wrap">
          <FiSearch className="spk-sample-search-icon" />
          <input
            type="text"
            className="spk-sample-search-input"
            placeholder="Cari nama, kategori, status, atau status proses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="spk-sample-toolbar-actions">
          <button className="spk-sample-btn-primary" onClick={openAddModal}>
            <FiPlus /> Tambah SPK Sample
          </button>
        </div>
      </div>

      <div className="spk-sample-table-wrap">
        <table className="spk-sample-table">
          <thead>
            <tr>
              <th style={{ width: "60px" }}>NO</th>
              <th>Nama Sample</th>
              <th>Foto</th>
              <th>Urgensi</th>
              <th>Status Proses</th>
              <th>Tahap Proses</th>
              <th>Lama Pengerjaan</th>
              <th>tgl SPK Turun</th>
              <th>Nama tukang sample</th>
              <th style={{ textAlign: "right", width: "140px" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10">
                  <div className="spk-sample-empty">
                    <p>Memuat data...</p>
                  </div>
                </td>
              </tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <tr key={item.id}>
                  <td><span className="spk-sample-muted">{index + 1}</span></td>
                  <td><strong>{item.nama_sample || "-"}</strong></td>
                  <td>
                    {item.foto ? (
                      <img className="spk-sample-photo" src={getFotoUrl(item.foto)} alt={item.nama_sample || "Foto sample"} />
                    ) : (
                      <span className="spk-sample-muted">Tidak ada foto</span>
                    )}
                  </td>
                  <td>
                    <span className={`spk-sample-status ${item.status_spk?.toLowerCase() === "urgent" ? "urgent" : ""}`}>
                      {item.status_spk || "-"}
                    </span>
                  </td>
                  <td>
                    <select 
                      className="spk-sample-select-inline"
                      value={item.status_proses || ""}
                      onChange={(e) => handleStatusProsesChange(item.id, e.target.value)}
                      disabled={updatingStatusId === item.id}
                      title="Ubah Status Proses"
                    >
                      <option value="" disabled>Pilih Status</option>
                      {statusProsesOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {item.status_proses === "ACC" ? (
                      <select
                        className="spk-sample-select-inline spk-sample-select-tahap"
                        value={item.tahap_proses || ""}
                        onChange={(e) => handleTahapProsesChange(item.id, e.target.value)}
                        disabled={updatingTahapId === item.id}
                        title="Ubah Tahap Proses"
                      >
                        <option value="" disabled>Pilih Tahap</option>
                        {tahapProsesOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="spk-sample-tahap-locked">
                        <span className="spk-sample-badge-tahap">{item.tahap_proses || "-"}</span>
                        <span className="spk-sample-lock-hint" title="ACC dahulu untuk mengubah tahap proses">🔒</span>
                      </div>
                    )}
                  </td>
                  <td>{calculateLamaPengerjaan(item.created_at)}</td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    {item.tukang_sample ? (
                      <div className="spk-sample-tukang-badge">
                        <FiUser size={12} />
                        <span>{item.tukang_sample.nama_tukang_sample}</span>
                      </div>
                    ) : (
                      <span className="spk-sample-muted spk-sample-unassigned">Belum ditentukan</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="spk-sample-action-group">
                      <button className="spk-sample-btn-icon spk-sample-btn-view" onClick={() => openDetailModal(item)} title="Detail">
                        <FiEye />
                      </button>
                      <button className="spk-sample-btn-icon spk-sample-btn-assign" onClick={() => openAssignModal(item)} title="Tetapkan Tukang Pola">
                        <FiUserPlus />
                      </button>
                      <button className="spk-sample-btn-icon spk-sample-btn-edit" onClick={() => openEditModal(item)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button className="spk-sample-btn-icon spk-sample-btn-delete" onClick={() => openDeleteModal(item)} title="Hapus">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10">
                  <div className="spk-sample-empty spk-sample-empty-content">
                    <FiImage style={{ fontSize: "2.5rem", marginBottom: "10px" }} />
                    <h3>Tidak ada data</h3>
                    <p>Belum ada rekaman SPK Sample yang tersimpan.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="spk-sample-modal-overlay">
          <div className="spk-sample-modal-content spk-sample-modal-pro">
            <div className="spk-sample-modal-topbar">
              <div>
                <h2>{isEdit ? "Edit SPK Sample" : "Tambah SPK Sample"}</h2>
                <p>Isi informasi utama di sebelah kiri dan unggah foto referensi di panel kanan.</p>
              </div>
              <button className="spk-sample-modal-close" onClick={closeFormModal}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="spk-sample-form-pro">
              <div className="spk-sample-form-main">
                <div className="spk-sample-form-row-2">
                  <div className="spk-sample-form-group">
                    <label><FiTag /> Nama sample</label>
                    <input name="nama_sample" value={formData.nama_sample} onChange={handleInputChange} required placeholder="Contoh: Dress Satin Merah" />
                  </div>

                  <div className="spk-sample-form-group">
                    <label><FiLayers /> Kategori Sample</label>
                    <select name="kategori_sample" value={formData.kategori_sample} onChange={handleInputChange} required>
                      {kategoriOptions.map((kategori) => (
                        <option key={kategori} value={kategori}>
                          {kategori}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="spk-sample-form-row-2">
                  <div className="spk-sample-form-group">
                    <label><FiAlertCircle /> Status SPK</label>
                    <select name="status_spk" value={formData.status_spk} onChange={handleInputChange}>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="spk-sample-form-group">
                    <label><FiActivity /> Tahap Proses</label>
                    <select name="tahap_proses" value={formData.tahap_proses} onChange={handleInputChange}>
                      {tahapProsesOptions.map((tahap) => (
                        <option key={tahap} value={tahap}>
                          {tahap}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="spk-sample-form-group">
                  <label><FiAlertCircle /> Status Proses</label>
                  <select name="status_proses" value={formData.status_proses} onChange={handleInputChange}>
                    {statusProsesOptions.map((statusProses) => (
                      <option key={statusProses} value={statusProses}>
                        {statusProses}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="spk-sample-form-group">
                  <label><FiInfo /> Detail</label>
                  <textarea rows="4" name="detail" value={formData.detail} onChange={handleInputChange} placeholder="Isi detail spesifikasi sample..." />
                </div>

                <div className="spk-sample-form-group">
                  <label><FiFileText /> Keterangan sample</label>
                  <textarea rows="4" name="keterangan_sample" value={formData.keterangan_sample} onChange={handleInputChange} placeholder="Catatan tambahan..." />
                </div>
              </div>

              <aside className="spk-sample-form-side">
                <div className="spk-sample-side-card">
                  <div className="spk-sample-side-head">
                    <FiImage />
                    <span>Foto Sample</span>
                  </div>

                  <div className="spk-sample-side-preview-wrap">
                    {fotoPreview ? (
                      <img className="spk-sample-photo-preview spk-sample-photo-preview-large" src={fotoPreview} alt="Preview" />
                    ) : (
                      <div className="spk-sample-photo-placeholder">
                        <FiImage size={48} strokeWidth={1} />
                        <span>Klik "Pilih Foto" untuk mengunggah gambar referensi</span>
                      </div>
                    )}
                  </div>

                  <label className="spk-sample-upload-btn spk-sample-upload-btn-full">
                    <FiImage /> Pilih Foto
                    <input type="file" accept="image/*" onChange={handleFotoChange} />
                  </label>
                  <small>Format JPG/PNG, maksimal 5 MB</small>
                </div>
              </aside>

              <div className="spk-sample-form-actions spk-sample-form-actions-pro">
                <button type="button" className="spk-sample-btn-secondary" onClick={closeFormModal}>
                  Batal
                </button>
                <button type="submit" className="spk-sample-btn-primary" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && selectedItem && (
        <div className="spk-sample-modal-overlay">
          <div className="spk-sample-modal-delete">
            <div className="spk-sample-modal-delete-header">
              <div className="spks-delete-icon-wrapper">
                <FiTrash2 className="spks-delete-icon-large" />
              </div>
              <button className="spk-sample-modal-close" onClick={closeDeleteModal}><FiX /></button>
            </div>
            <div className="spks-modal-body-center">
              <h2>Hapus SPK Sample?</h2>
              <p className="spks-delete-desc">
                Yakin ingin menghapus data <strong>{selectedItem.nama_sample}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="spks-form-actions-center">
              <button className="spk-sample-btn-secondary" onClick={closeDeleteModal}>Batal</button>
              <button className="spk-sample-btn-danger" onClick={handleDelete}>Ya, Hapus Data</button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedItem && (
        <div className="spk-sample-modal-overlay">
          <div className="spk-sample-modal-content spk-sample-modal-pro">
            <div className="spk-sample-modal-topbar">
              <div>
                <h2>Detail SPK Sample</h2>
                <p>Informasi detail dan dokumentasi foto referensi.</p>
              </div>
              <button className="spk-sample-modal-close" onClick={closeDetailModal}><FiX /></button>
            </div>

            <div className="spk-sample-detail-layout">
              <div className="spk-sample-detail-info">
                <h4 className="spk-sample-detail-section-title">Informasi Data</h4>
                <div className="spk-sample-detail-card">
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap"><FiTag /></div>
                    <div className="spk-sample-d-content">
                      <span>Nama sample</span>
                      <strong>{selectedItem.nama_sample || "-"}</strong>
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap"><FiAlignLeft /></div>
                    <div className="spk-sample-d-content">
                      <span>Kategori Sample</span>
                      <strong>{selectedItem.kategori_sample || "-"}</strong>
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className={`spk-sample-d-icon-wrap ${selectedItem.status_spk?.toLowerCase() === "urgent" ? "bg-danger" : "bg-primary"}`}>
                      <FiAlertCircle />
                    </div>
                    <div className="spk-sample-d-content">
                      <span>Status SPK</span>
                      <strong className={selectedItem.status_spk?.toLowerCase() === "urgent" ? "text-urgent" : "text-normal"}>
                        {selectedItem.status_spk || "-"}
                      </strong>
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap bg-primary"><FiTag /></div>
                    <div className="spk-sample-d-content">
                      <span>Tahap Proses</span>
                      <strong>{selectedItem.tahap_proses || "-"}</strong>
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap"><FiAlignLeft /></div>
                    <div className="spk-sample-d-content">
                      <span>Status Proses</span>
                      <strong>{selectedItem.status_proses || "-"}</strong>
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap"><FiFileText /></div>
                    <div className="spk-sample-d-content">
                      <span>Detail</span>
                      <p>{selectedItem.detail || "-"}</p>
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap"><FiFileText /></div>
                    <div className="spk-sample-d-content">
                      <span>Keterangan sample</span>
                      <p>{selectedItem.keterangan_sample || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="spk-sample-detail-photo-pane">
                 <h4 className="spk-sample-detail-section-title">Dokumentasi Foto</h4>
                 <div className="spk-sample-detail-photo-wrapper">
                  {selectedItem.foto ? (
                    <img className="spk-sample-detail-photo-view" src={getFotoUrl(selectedItem.foto)} alt={selectedItem.nama_sample || "Foto sample"} />
                  ) : (
                    <div className="spk-sample-photo-placeholder spk-sample-photo-placeholder-large">
                      <FiImage style={{ fontSize: "3rem", marginBottom: "12px", opacity: 0.5 }} />
                      Tidak ada foto tersimpan
                    </div>
                  )}
                 </div>
              </div>
            </div>

            <div className="spk-sample-form-actions spk-sample-form-actions-pro">
              <button className="spk-sample-btn-primary spk-sample-btn-block" onClick={closeDetailModal}>Tutup Halaman Detail</button>
            </div>
          </div>
        </div>
      )}
      {showAssignModal && selectedItem && (
        <div className="spk-sample-modal-overlay">
          <div className="spk-sample-modal-assign">
            <div className="spk-sample-modal-topbar">
              <div>
                <h2>Tetapkan Tukang Pola</h2>
                <p>Pilih tukang pola untuk <strong>{selectedItem.nama_sample}</strong></p>
              </div>
              <button className="spk-sample-modal-close" onClick={closeAssignModal}><FiX /></button>
            </div>

            <div className="spk-sample-assign-body">
              <div className="spk-sample-assign-list">
                <label className={`spk-sample-assign-card ${selectedTukangId === "" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="tukang"
                    value=""
                    checked={selectedTukangId === ""}
                    onChange={() => setSelectedTukangId("")}
                  />
                  <div className="spk-sample-assign-avatar unassigned">
                    <FiUser />
                  </div>
                  <div className="spk-sample-assign-info">
                    <strong>Tidak ada / Hapus penetapan</strong>
                    <span>Tukang pola belum ditetapkan</span>
                  </div>
                </label>

                {tukangList.map((t) => (
                  <label
                    key={t.id}
                    className={`spk-sample-assign-card ${selectedTukangId === String(t.id) ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="tukang"
                      value={t.id}
                      checked={selectedTukangId === String(t.id)}
                      onChange={() => setSelectedTukangId(String(t.id))}
                    />
                    <div className="spk-sample-assign-avatar">
                      {t.nama_tukang_sample?.charAt(0).toUpperCase()}
                    </div>
                    <div className="spk-sample-assign-info">
                      <strong>{t.nama_tukang_sample}</strong>
                      <span><FiPhone size={11} /> {t.nomor_hp || "Tidak ada nomor"}</span>
                    </div>
                  </label>
                ))}

                {tukangList.length === 0 && (
                  <div className="spk-sample-empty" style={{ padding: "30px" }}>
                    <p>Belum ada tukang sample terdaftar.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="spk-sample-form-actions spk-sample-assign-footer">
              <button className="spk-sample-btn-secondary" onClick={closeAssignModal}>Batal</button>
              <button className="spk-sample-btn-primary" onClick={handleAssignTukang} disabled={assigning}>
                {assigning ? "Menyimpan..." : "Tetapkan Tukang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SPKSample;
