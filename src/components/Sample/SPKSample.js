import React, { useEffect, useMemo, useState } from "react";
import "./SPKSample.css";
import API from "../../api";
import { motion, AnimatePresence } from "framer-motion";
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
  FiCheckCircle,
} from "react-icons/fi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Select from "react-select";
import html2canvas from "html2canvas";
import CreatableSelect from "react-select/creatable";

const initialForm = {
  id: null,
  nama_sample: "",
  kategori_sample: "SET",
  detail: "",
  keterangan_sample: "",
  bahan_utama: { bahan: "", qty: "", satuan: "" },
  bahan_kombinasi: [],
  aksesoris: [],
  warna_yang_akan_dikeluarkan: [],
  harga_potong: "",
  harga_cmt: "",
};

const kategoriOptions = [
  "SET",
  "DASTER",
  "DRESS",
  "GAMIS",
  "KOKO",
  "KAOS",
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
  const [bahanList, setBahanList] = useState([]);

  useEffect(() => {
    fetchData();
    fetchBahans();
  }, []);

  const fetchBahans = async () => {
    try {
      const res = await API.get("/bahan", { params: { all: 1 } });
      setBahanList(res.data?.data || res.data || []);
    } catch (err) {
      toast.error("Gagal mengambil data bahan.");
    }
  };

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

    const baseStorage = process.env.REACT_APP_STORAGE_URL || "/storage";
    return `${baseStorage}/${path}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await API.get("/spk-sample");
      setData(response.data?.data || []);
    } catch (error) {
      toast.error("Gagal mengambil data Data Sample.");
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

      return (
        nama.includes(keyword) ||
        kategori.includes(keyword)
      );
    });
  }, [data, search]);

  const bahanOptions = useMemo(() => {
    const uniqueGroups = [...new Set(bahanList.map((b) => b.group_bahan).filter(Boolean))];
    return uniqueGroups.map((group) => ({ value: group, label: group }));
  }, [bahanList]);

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      border: state.isFocused ? '1px solid #6366f1' : '1px solid #cbd5e1',
      boxShadow: state.isFocused ? '0 0 0 4px rgba(99, 102, 241, 0.14)' : 'none',
      borderRadius: '12px',
      padding: '5px 4px',
      fontFamily: 'inherit',
      fontSize: '14px',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      '&:hover': {
        borderColor: state.isFocused ? '#6366f1' : '#cbd5e1'
      }
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '12px',
      overflow: 'hidden',
      zIndex: 10
    }),
    option: (provided) => ({
      ...provided,
      fontFamily: 'inherit',
      fontSize: '14px',
    }),
  };

  const handleBahanUtamaChange = (field, value) => {
    setFormData((prev) => ({ ...prev, bahan_utama: { ...prev.bahan_utama, [field]: value } }));
  };

  const addBahanKombinasi = () => {
    setFormData((prev) => ({ ...prev, bahan_kombinasi: [...prev.bahan_kombinasi, { bahan: "", qty: "", satuan: "" }] }));
  };
  const removeBahanKombinasi = (index) => {
    setFormData((prev) => {
      const newArr = [...prev.bahan_kombinasi];
      newArr.splice(index, 1);
      return { ...prev, bahan_kombinasi: newArr };
    });
  };
  const handleBahanKombinasiChange = (index, field, value) => {
    setFormData((prev) => {
      const newArr = [...prev.bahan_kombinasi];
      newArr[index] = { ...newArr[index], [field]: value };
      return { ...prev, bahan_kombinasi: newArr };
    });
  };

  const addAksesoris = () => {
    setFormData((prev) => ({ ...prev, aksesoris: [...prev.aksesoris, { tipe: "umum", warna: "", nama: "" }] }));
  };
  const removeAksesoris = (index) => {
    setFormData((prev) => {
      const newArr = [...prev.aksesoris];
      newArr.splice(index, 1);
      return { ...prev, aksesoris: newArr };
    });
  };
  const handleAksesorisChange = (index, field, value) => {
    setFormData((prev) => {
      const newArr = [...prev.aksesoris];
      newArr[index] = { ...newArr[index], [field]: value };
      if (field === 'tipe' && value === 'umum') newArr[index].warna = "";
      return { ...prev, aksesoris: newArr };
    });
  };

  const handleWarnaChange = (selectedOptions) => {
    setFormData((prev) => ({
      ...prev,
      warna_yang_akan_dikeluarkan: selectedOptions ? selectedOptions.map((o) => o.value) : []
    }));
  };

  const openAddModal = () => {
    setIsEdit(false);
    setFormData(initialForm);
    setFotoFile(null);
    setFotoPreview("");
    setShowForm(true);
  };

  const openEditModal = (item) => {
    setIsEdit(true);
    let cat = item.kategori_sample || "SET";
    let baseName = item.nama_sample || "";
    if (baseName.toUpperCase().startsWith(cat.toUpperCase() + " ")) {
      baseName = baseName.substring(cat.length).trim();
    }
    
    setFormData({
      id: item.id,
      nama_sample: baseName,
      kategori_sample: cat,
      detail: item.detail || "",
      keterangan_sample: item.keterangan_sample || "",
      bahan_utama: typeof item.bahan_utama === 'object' && item.bahan_utama !== null ? item.bahan_utama : { bahan: item.bahan_utama || "", qty: "", satuan: "" },
      bahan_kombinasi: Array.isArray(item.bahan_kombinasi) ? item.bahan_kombinasi : [],
      aksesoris: Array.isArray(item.aksesoris) ? item.aksesoris : [],
      warna_yang_akan_dikeluarkan: Array.isArray(item.warna_yang_akan_dikeluarkan) ? item.warna_yang_akan_dikeluarkan : [],
      harga_potong: item.harga_potong || "",
      harga_cmt: item.harga_cmt || "",
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
      let finalNama = formData.nama_sample.trim();
      for (let cat of kategoriOptions) {
        if (finalNama.toUpperCase().startsWith(cat.toUpperCase() + " ")) {
          finalNama = finalNama.substring(cat.length).trim();
          break;
        }
      }
      finalNama = `${formData.kategori_sample} ${finalNama}`;

      payload.append("nama_sample", finalNama);
      payload.append("kategori_sample", formData.kategori_sample);
      payload.append("detail", formData.detail || "");
      payload.append("keterangan_sample", formData.keterangan_sample || "");
      payload.append("bahan_utama", JSON.stringify(formData.bahan_utama));
      payload.append("bahan_kombinasi", JSON.stringify(formData.bahan_kombinasi));
      payload.append("aksesoris", JSON.stringify(formData.aksesoris));
      payload.append("warna_yang_akan_dikeluarkan", JSON.stringify(formData.warna_yang_akan_dikeluarkan));
      payload.append("harga_potong", formData.harga_potong || "");
      payload.append("harga_cmt", formData.harga_cmt || "");

      if (fotoFile) {
        payload.append("foto", fotoFile);
      }

      if (isEdit && formData.id) {
        payload.append("_method", "PUT");
        await API.post(`/spk-sample/${formData.id}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Data Sample berhasil diperbarui.");
      } else {
        await API.post("/spk-sample", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Data Sample berhasil ditambahkan.");
      }

      closeFormModal();
      fetchData();
    } catch (error) {
      const message = error.response?.data?.message || "Gagal menyimpan data Data Sample.";
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



  const handleDelete = async () => {
    if (!selectedItem) {
      return;
    }

    try {
      await API.delete(`/spk-sample/${selectedItem.id}`);
      toast.success("Data Sample berhasil dihapus.");
      closeDeleteModal();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menghapus data Data Sample.");
    }
  };

  const handleDownloadPng = async () => {
    if (!selectedItem) return;
    
    try {
      setLoading(true);
      toast.info("Sedang menyiapkan PNG...");
      
      const printArea = document.getElementById("spk-sample-printable-ticket");
      if (!printArea) {
        toast.error("Area print tidak ditemukan.");
        setLoading(false);
        return;
      }

      // We clone the node or just capture it directly
      const canvas = await html2canvas(printArea, { 
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgData;
      link.download = `Data_Sample_${selectedItem.nama_sample || "Download"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Berhasil mengunduh PNG.");
    } catch (error) {
      console.error("Gagal export PNG:", error);
      toast.error("Terjadi kesalahan saat mengunduh PNG.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ts-page spk-sample-page">
      <ToastContainer position="top-right" autoClose={2600} hideProgressBar theme="light" />

      <div className="ts-shell">
        <section className="ts-content">
          <header className="ts-topbar">
            <div className="ts-title-group">
              <div className="ts-brand-icon">
                <FiLayers size={24} color="#fff" />
              </div>
              <div className="ts-brand-text">
                <h1>Data Sample</h1>
                <p>Manajemen dan pencatatan document request Data Sample</p>
              </div>
            </div>

            <div className="ts-actions">
              <div className="ts-search-bar">
                <FiSearch className="ts-search-icon-inside" />
                <input
                  type="text"
                  placeholder="Cari Data sample..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </header>

          <main className="ts-main">
            <motion.div 
               className="ts-table-card"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, type: "spring" }}
            >
              <div className="ts-table-header">
                <div>
                  <h3>Daftar Data Sample</h3>
                  <p>Total SPK terdaftar: {filteredData.length}</p>
                </div>
                <button className="ts-btn-primary" onClick={openAddModal}>
                  <FiPlus size={18} /> Tambah Data Sample
                </button>
              </div>

      <div className="ts-table-container">
        <div className="spk-sample-scroll-x">
        <table className="ts-modern-table">
          <thead>
            <tr>
              <th style={{ minWidth: "60px", textAlign: "center" }}>No</th>
              <th style={{ minWidth: "200px", paddingLeft: "24px" }}>Nama Sample</th>
              <th style={{ minWidth: "100px" }}>Foto</th>
              <th style={{ minWidth: "140px" }}>Bahan Utama</th>
              <th style={{ minWidth: "140px" }}>Bahan Kombinasi</th>
              <th style={{ minWidth: "140px" }}>Aksesoris</th>
              <th style={{ minWidth: "140px" }}>Warna</th>
              <th style={{ minWidth: "120px" }}>Harga Potong</th>
              <th style={{ minWidth: "120px" }}>Harga CMT</th>
              <th style={{ minWidth: "180px" }}>Lama Pengerjaan</th>
              <th style={{ minWidth: "160px" }}>Tgl SPK Turun</th>
              <th style={{ minWidth: "240px" }}>Nama Tukang Sample</th>
              <th style={{ minWidth: "180px", textAlign: "right", paddingRight: "24px" }}>Aksi</th>
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
                <motion.tr 
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <td className="text-muted font-mono" style={{ textAlign: "center" }}>{index + 1}</td>
                  <td className="font-semibold text-accent" style={{ paddingLeft: "24px" }}>{item.nama_sample || "-"}</td>
                  <td>
                    {item.foto ? (
                      <img className="spk-sample-photo" src={getFotoUrl(item.foto)} alt={item.nama_sample || "Foto sample"} />
                    ) : (
                      <span className="spk-sample-muted">Tidak ada foto</span>
                    )}
                  </td>
                  <td>{item.bahan_utama ? `${item.bahan_utama.bahan} (${item.bahan_utama.qty} ${item.bahan_utama.satuan})` : "-"}</td>
                  <td>{item.bahan_kombinasi && item.bahan_kombinasi.length > 0 ? `${item.bahan_kombinasi.length} Bahan` : "-"}</td>
                  <td>{item.aksesoris && item.aksesoris.length > 0 ? `${item.aksesoris.length} Item` : "-"}</td>
                  <td>{item.warna_yang_akan_dikeluarkan && item.warna_yang_akan_dikeluarkan.length > 0 ? `${item.warna_yang_akan_dikeluarkan.length} Warna` : "-"}</td>
                  <td>{item.harga_potong ? `Rp ${item.harga_potong.toLocaleString("id-ID")}` : "-"}</td>
                  <td>{item.harga_cmt ? `Rp ${item.harga_cmt.toLocaleString("id-ID")}` : "-"}</td>
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
                  <td style={{ textAlign: "right", paddingRight: "24px" }}>
                    <div className="actions-cell">
                      <button className="action-btn view" onClick={() => openDetailModal(item)} title="Detail">
                        <FiEye />
                      </button>
                      <button className="action-btn assign" onClick={() => openAssignModal(item)} title="Tetapkan Tukang Pola">
                        <FiUserPlus />
                      </button>
                      <button className="action-btn edit" onClick={() => openEditModal(item)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button className="action-btn delete" onClick={() => openDeleteModal(item)} title="Hapus">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan="10">
                  <div className="spk-sample-empty spk-sample-empty-content">
                    <FiImage style={{ fontSize: "2.5rem", marginBottom: "10px" }} />
                    <h3>Tidak ada data</h3>
                    <p>Belum ada rekaman Data Sample yang tersimpan.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
          </motion.div>
          </main>
        </section>
      </div>

      <AnimatePresence>
      {showForm && (
        <div className="ts-modal-overlay">
          <motion.div className="ts-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeFormModal}/>
          <motion.div 
            className="ts-modal-box spk-sample-modal spk-sample-modal-form" style={{ maxWidth: "980px" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="ts-modal-top">
              <div>
                <h2>{isEdit ? "Edit Data Sample" : "Tambah Data Sample"}</h2>
                <p>Isi informasi utama di sebelah kiri dan unggah foto referensi di panel kanan.</p>
              </div>
              <button className="close-btn" onClick={closeFormModal}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="spk-sample-form-pro">
              <div className="spk-sample-form-main">
                <div className="spk-sample-form-row-2">
                  <div className="spk-sample-form-group">
                    <label><FiTag /> Nama sample</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0 14px', background: '#ffffff', transition: 'border-color 0.2s', height: '42px' }}>
                      <span style={{ fontWeight: 'bold', marginRight: '8px', color: '#6366f1', fontSize: '14px' }}>{formData.kategori_sample}</span>
                      <input 
                        name="nama_sample" 
                        value={formData.nama_sample} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="Contoh: MIKASA" 
                        style={{ border: 'none', padding: '0', outline: 'none', flex: 1, background: 'transparent', fontSize: '14px', color: '#0f172a' }}
                      />
                    </div>
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

                {/* Bahan Utama */}
                <div className="spk-sample-form-group">
                  <label><FiLayers /> Bahan Utama</label>
                  <div className="spk-sample-dynamic-row">
                    <div style={{ flex: 2, minWidth: '200px' }}>
                      <Select
                        options={bahanOptions}
                        isClearable
                        placeholder="Pilih Bahan Utama..."
                        value={bahanOptions.find((opt) => opt.value === formData.bahan_utama?.bahan) || null}
                        onChange={(selected) => handleBahanUtamaChange('bahan', selected ? selected.value : "")}
                        styles={customSelectStyles}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '100px' }}>
                      <input type="number" placeholder="Qty" value={formData.bahan_utama?.qty || ""} onChange={(e) => handleBahanUtamaChange('qty', e.target.value)} />
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <input type="text" placeholder="Satuan (KG/PCS)" value={formData.bahan_utama?.satuan || ""} onChange={(e) => handleBahanUtamaChange('satuan', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Bahan Kombinasi */}
                <div className="spk-sample-form-group">
                  <label><FiLayers /> Bahan Kombinasi</label>
                  {formData.bahan_kombinasi.map((item, index) => (
                    <div key={index} className="spk-sample-dynamic-row">
                      <div style={{ flex: 2, minWidth: '200px' }}>
                        <Select
                          options={bahanOptions}
                          isClearable
                          placeholder="Pilih Bahan..."
                          value={bahanOptions.find((opt) => opt.value === item.bahan) || null}
                          onChange={(selected) => handleBahanKombinasiChange(index, 'bahan', selected ? selected.value : "")}
                          styles={customSelectStyles}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: '100px' }}>
                        <input type="number" placeholder="Qty" value={item.qty} onChange={(e) => handleBahanKombinasiChange(index, 'qty', e.target.value)} />
                      </div>
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <input type="text" placeholder="Satuan (KG/PCS)" value={item.satuan} onChange={(e) => handleBahanKombinasiChange(index, 'satuan', e.target.value)} />
                      </div>
                      <button type="button" className="spk-sample-btn-remove" onClick={() => removeBahanKombinasi(index)}>
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="spk-sample-btn-add" onClick={addBahanKombinasi}>
                    <FiPlus size={16} /> Tambah Bahan Kombinasi
                  </button>
                </div>

                {/* Warna */}
                <div className="spk-sample-form-group">
                  <label><FiLayers /> Warna yang akan dikeluarkan</label>
                  <CreatableSelect
                    isMulti
                    placeholder="Ketik lalu Enter untuk menambah warna..."
                    options={[]} 
                    value={(formData.warna_yang_akan_dikeluarkan || []).map(w => ({ label: w, value: w }))}
                    onChange={handleWarnaChange}
                    styles={customSelectStyles}
                  />
                </div>

                {/* Aksesoris */}
                <div className="spk-sample-form-group">
                  <label><FiLayers /> Aksesoris</label>
                  {formData.aksesoris.map((item, index) => (
                    <div key={index} className="spk-sample-dynamic-row">
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <select value={item.tipe} onChange={(e) => handleAksesorisChange(index, 'tipe', e.target.value)}>
                          <option value="umum">Umum</option>
                          <option value="warna">Khusus Warna</option>
                        </select>
                      </div>
                      {item.tipe === 'warna' && (
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <select value={item.warna} onChange={(e) => handleAksesorisChange(index, 'warna', e.target.value)}>
                            <option value="">Pilih Warna...</option>
                            {(formData.warna_yang_akan_dikeluarkan || []).map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div style={{ flex: 2, minWidth: '180px' }}>
                        <input type="text" placeholder="Nama Aksesoris..." value={item.nama} onChange={(e) => handleAksesorisChange(index, 'nama', e.target.value)} />
                      </div>
                      <button type="button" className="spk-sample-btn-remove" onClick={() => removeAksesoris(index)}>
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="spk-sample-btn-add" onClick={addAksesoris}>
                    <FiPlus size={16} /> Tambah Aksesoris
                  </button>
                </div>

                <div className="spk-sample-form-row-2">
                  <div className="spk-sample-form-group">
                    <label><FiLayers /> Harga Potong</label>
                    <input type="number" name="harga_potong" value={formData.harga_potong} onChange={handleInputChange} placeholder="Harga Potong" />
                  </div>
                  <div className="spk-sample-form-group">
                    <label><FiLayers /> Harga CMT</label>
                    <input type="number" name="harga_cmt" value={formData.harga_cmt} onChange={handleInputChange} placeholder="Harga CMT" />
                  </div>
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

              <div className="spk-sample-form-actions-pro">
                <button type="button" className="ts-btn-secondary" onClick={closeFormModal}>
                  Batal
                </button>
                <button type="submit" className="ts-btn-primary" disabled={submitting}>
                  <FiCheckCircle size={18}/> {submitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showDeleteModal && selectedItem && (
        <div className="ts-modal-overlay">
          <motion.div className="ts-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDeleteModal}/>
          <motion.div 
            className="ts-modal-box small-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="ts-modal-top borderless center-header">
              <div className="danger-icon-wrap">
                <FiTrash2 size={28} />
              </div>
              <button className="close-btn absolute-right" onClick={closeDeleteModal}><FiX /></button>
            </div>
            <div className="ts-modal-form center-text pt-0">
              <h2>Hapus Data Sample?</h2>
              <p className="delete-desc">
                Yakin ingin menghapus <strong>{selectedItem.nama_sample}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="ts-modal-bottom evenly">
              <button className="ts-btn-secondary flex-1" onClick={closeDeleteModal}>Batal</button>
              <button className="ts-btn-danger flex-1" onClick={handleDelete}>Ya, Hapus</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showDetailModal && selectedItem && (
        <div className="ts-modal-overlay">
          <motion.div className="ts-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDetailModal}/>
          <motion.div 
            className="ts-modal-box spk-sample-modal spk-sample-modal-detail" style={{ maxWidth: "980px" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="ts-modal-top">
              <div>
                <h2>Detail Data Sample</h2>
                <p>Informasi detail dan dokumentasi foto referensi.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="ts-btn-primary" onClick={handleDownloadPng} disabled={loading}>
                  {loading ? "Menyiapkan..." : "Print PNG"}
                </button>
                <button className="close-btn" onClick={closeDetailModal}><FiX /></button>
              </div>
            </div>

            <div id="spk-sample-print-area" className="spk-sample-detail-layout" style={{ padding: '20px', background: '#fff' }}>
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
                    <div className="spk-sample-d-icon-wrap"><FiLayers /></div>
                    <div className="spk-sample-d-content">
                      <span>Bahan Utama</span>
                      {selectedItem.bahan_utama ? (
                        <strong>{selectedItem.bahan_utama.bahan} ({selectedItem.bahan_utama.qty} {selectedItem.bahan_utama.satuan})</strong>
                      ) : (
                        <strong>-</strong>
                      )}
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap"><FiLayers /></div>
                    <div className="spk-sample-d-content">
                      <span>Bahan Kombinasi</span>
                      {(selectedItem.bahan_kombinasi && selectedItem.bahan_kombinasi.length > 0) ? (
                        <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                          {selectedItem.bahan_kombinasi.map((bk, i) => (
                            <li key={i}>{bk.bahan} ({bk.qty} {bk.satuan})</li>
                          ))}
                        </ul>
                      ) : (
                        <strong>-</strong>
                      )}
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap"><FiLayers /></div>
                    <div className="spk-sample-d-content">
                      <span>Aksesoris</span>
                      {(selectedItem.aksesoris && selectedItem.aksesoris.length > 0) ? (
                        <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
                          {selectedItem.aksesoris.map((ak, i) => (
                            <li key={i}>{ak.tipe === 'warna' ? `[${ak.warna}] ` : ""}{ak.nama}</li>
                          ))}
                        </ul>
                      ) : (
                        <strong>-</strong>
                      )}
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap"><FiLayers /></div>
                    <div className="spk-sample-d-content">
                      <span>Warna</span>
                      <strong>{(selectedItem.warna_yang_akan_dikeluarkan && selectedItem.warna_yang_akan_dikeluarkan.length > 0) ? selectedItem.warna_yang_akan_dikeluarkan.join(", ") : "-"}</strong>
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap"><FiLayers /></div>
                    <div className="spk-sample-d-content">
                      <span>Harga Potong</span>
                      <strong>{selectedItem.harga_potong ? `Rp ${selectedItem.harga_potong.toLocaleString("id-ID")}` : "-"}</strong>
                    </div>
                  </div>
                  <div className="spk-sample-d-row">
                    <div className="spk-sample-d-icon-wrap"><FiLayers /></div>
                    <div className="spk-sample-d-content">
                      <span>Harga CMT</span>
                      <strong>{selectedItem.harga_cmt ? `Rp ${selectedItem.harga_cmt.toLocaleString("id-ID")}` : "-"}</strong>
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

            <div className="spk-sample-form-actions-pro">
              <button className="ts-btn-primary flex-1 spk-sample-full-btn" onClick={closeDetailModal}>Tutup Halaman Detail</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showAssignModal && selectedItem && (
        <div className="ts-modal-overlay">
          <motion.div className="ts-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeAssignModal}/>
          <motion.div 
            className="ts-modal-box spk-sample-modal spk-sample-modal-assign" style={{ maxWidth: "520px" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="ts-modal-top">
              <div>
                <h2>Tetapkan Tukang Pola</h2>
                <p>Pilih tukang pola untuk <strong>{selectedItem.nama_sample}</strong></p>
              </div>
              <button className="close-btn" onClick={closeAssignModal}><FiX /></button>
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

            <div className="spk-sample-form-actions-pro">
              <button className="ts-btn-secondary" onClick={closeAssignModal}>Batal</button>
              <button className="ts-btn-primary" onClick={handleAssignTukang} disabled={assigning}>
                <FiCheckCircle size={18}/> {assigning ? "Menyimpan..." : "Tetapkan"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Hidden Printable Ticket */}
      {selectedItem && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -100 }}>
          <div id="spk-sample-printable-ticket" style={{ width: '800px', background: '#fff', padding: '30px', color: '#000', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', gap: '30px' }}>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <strong style={{ marginBottom: '10px' }}>Foto Referensi Sample</strong>
                {selectedItem.foto ? (
                  <img src={getFotoUrl(selectedItem.foto)} alt="Sample" style={{ width: '100%', objectFit: 'contain', maxHeight: '450px' }} crossOrigin="anonymous" />
                ) : (
                  <div style={{ width: '100%', height: '300px', border: '1px dashed #000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>Tidak ada foto terlampir</div>
                )}
              </div>
              
              <div style={{ flex: 3 }}>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ margin: '0', fontSize: '24px' }}>{selectedItem.nama_sample || "-"}</h2>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '6px 0', width: '35%', verticalAlign: 'top' }}>Bahan Utama</td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>: {selectedItem.bahan_utama ? `${selectedItem.bahan_utama.bahan} (${selectedItem.bahan_utama.qty} ${selectedItem.bahan_utama.satuan})` : "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>Bahan Kombinasi</td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex' }}>
                          <span>:</span>
                          {selectedItem.bahan_kombinasi && selectedItem.bahan_kombinasi.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                              {selectedItem.bahan_kombinasi.map((bk, i) => <li key={i}>{bk.bahan} ({bk.qty} {bk.satuan})</li>)}
                            </ul>
                          ) : <span style={{ marginLeft: '4px' }}>-</span>}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>Aksesoris</td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex' }}>
                          <span>:</span>
                          {selectedItem.aksesoris && selectedItem.aksesoris.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '16px' }}>
                              {selectedItem.aksesoris.map((ak, i) => <li key={i}>{ak.nama} {ak.tipe === 'warna' ? `(${ak.warna})` : ''}</li>)}
                            </ul>
                          ) : <span style={{ marginLeft: '4px' }}>-</span>}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>Warna</td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex' }}>
                          <span>:</span>
                          {selectedItem.warna_yang_akan_dikeluarkan && selectedItem.warna_yang_akan_dikeluarkan.length > 0 ? (
                            <span style={{ marginLeft: '4px' }}>{selectedItem.warna_yang_akan_dikeluarkan.join(", ")}</span>
                          ) : <span style={{ marginLeft: '4px' }}>-</span>}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>Harga Potong</td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>: {selectedItem.harga_potong ? `Rp ${Number(selectedItem.harga_potong).toLocaleString('id-ID')}` : "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>Harga CMT</td>
                      <td style={{ padding: '6px 0', verticalAlign: 'top' }}>: {selectedItem.harga_cmt ? `Rp ${Number(selectedItem.harga_cmt).toLocaleString('id-ID')}` : "-"}</td>
                    </tr>
                  </tbody>
                </table>
                
                {(selectedItem.detail || selectedItem.keterangan_sample) && (
                  <div style={{ marginTop: '20px' }}>
                    {selectedItem.detail && (
                      <div style={{ marginBottom: '16px' }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>Detail Spesifikasi:</strong>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '14px' }}>{selectedItem.detail}</p>
                      </div>
                    )}
                    {selectedItem.keterangan_sample && (
                      <div>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>Keterangan Tambahan:</strong>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '14px' }}>{selectedItem.keterangan_sample}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SPKSample;
