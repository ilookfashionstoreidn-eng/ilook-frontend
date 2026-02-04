import React, { useEffect, useState, useCallback } from "react";
import "./SpkJasa.css";
import API from "../../api";
import { FaTimes, FaPlus, FaEdit, FaCheck, FaBoxOpen, FaSearch } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Helper hook untuk debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const SpkJasa = () => {
  // State Utama
  const [spkJasa, setSpkJasa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State Filter & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500); // Tunggu 500ms sebelum search
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 8,
    total: 0,
  });

  // State Statistik
  const [stats, setStats] = useState({
    total: 0,
    belum_diambil: 0,
    sudah_diambil: 0,
    batal_diambil: 0,
    selesai: 0
  });

  // State Form & Dropdown
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tukangList, setTukangList] = useState([]);
  
  // State Dropdown Distribusi (Async Search)
  const [distribusiOptions, setDistribusiOptions] = useState([]);
  const [searchDistribusi, setSearchDistribusi] = useState("");
  const debouncedSearchDistribusi = useDebounce(searchDistribusi, 300);
  const [showDistribusiDropdown, setShowDistribusiDropdown] = useState(false);
  const [selectedDistribusiId, setSelectedDistribusiId] = useState("");
  const [previewData, setPreviewData] = useState(null);

  const [newSpkJasa, setNewSpkJasa] = useState({
    tukang_jasa_id: "",
    spk_cutting_distribusi_id: "",
    deadline: "",
    harga: "",
    hargaDisplay: "",
    opsi_harga: "pcs",
    tanggal_ambil: "",
    foto: null,
  });

  // Helper format rupiah
  const formatRupiah = (value) => {
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseRupiah = (value) => {
    return value.replace(/\D/g, "");
  };

  // 1. Fetch Data Utama (Server-side Filtering)
  const fetchSpkJasa = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        per_page: 8,
        search: debouncedSearch,
        status: statusFilter
      };
      
      const response = await API.get("/SpkJasa", { params });
      
      if (response.data.data) {
        setSpkJasa(response.data.data);
        setPagination({
          current_page: response.data.current_page,
          last_page: response.data.last_page,
          per_page: response.data.per_page,
          total: response.data.total,
        });
      } else {
        setSpkJasa([]);
      }
    } catch (error) {
      console.error("Error fetching SPK Jasa:", error);
      setError("Gagal mengambil data");
      toast.error("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchSpkJasa();
  }, [fetchSpkJasa]);

  // 2. Fetch Statistik (Ringan)
  const fetchStatistics = async () => {
    try {
      const response = await API.get("/SpkJasa/statistics");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchStatistics();
    
    // Fetch Tukang Jasa (sekali saja)
    const fetchTukang = async () => {
      try {
        const response = await API.get("/tukang-jasa");
        setTukangList(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Gagal mengambil tukang jasa:", error);
      }
    };
    fetchTukang();
  }, []);

  // 3. Fetch Dropdown Distribusi (Async Search)
  useEffect(() => {
    const fetchDistribusiOptions = async () => {
      // Jika sedang edit dan ada ID terpilih, jangan fetch search kosong
      if (!debouncedSearchDistribusi && !showDistribusiDropdown) return;

      try {
        const response = await API.get("/SpkJasa/available-distributions", {
          params: { search: debouncedSearchDistribusi }
        });
        setDistribusiOptions(response.data);
      } catch (error) {
        console.error("Gagal cari distribusi:", error);
      }
    };

    if (showDistribusiDropdown) {
        fetchDistribusiOptions();
    }
  }, [debouncedSearchDistribusi, showDistribusiDropdown]);

  // Fetch Preview saat distribusi dipilih
  useEffect(() => {
    const fetchPreview = async () => {
      if (selectedDistribusiId) {
        try {
          const response = await API.get(`/preview/${selectedDistribusiId}`);
          setPreviewData(response.data);
        } catch (error) {
          console.error("Gagal preview:", error);
          setPreviewData(null);
        }
      } else {
        setPreviewData(null);
      }
    };
    fetchPreview();
  }, [selectedDistribusiId]);

  // Reset page saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!newSpkJasa.spk_cutting_distribusi_id) {
      toast.warn("Silakan pilih Distribusi Seri terlebih dahulu");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("tukang_jasa_id", newSpkJasa.tukang_jasa_id);
      formData.append("spk_cutting_distribusi_id", newSpkJasa.spk_cutting_distribusi_id);
      formData.append("deadline", newSpkJasa.deadline);
      if (newSpkJasa.harga) formData.append("harga", newSpkJasa.harga);
      if (newSpkJasa.opsi_harga) formData.append("opsi_harga", newSpkJasa.opsi_harga);
      if (newSpkJasa.tanggal_ambil) formData.append("tanggal_ambil", newSpkJasa.tanggal_ambil);
      if (newSpkJasa.foto) formData.append("foto", newSpkJasa.foto);

      if (editingId) {
        formData.append("_method", "PUT");
        await API.post(`/SpkJasa/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("SPK Jasa berhasil diperbarui!");
      } else {
        await API.post("/SpkJasa", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("SPK Jasa berhasil ditambahkan!");
      }

      // Refresh data & stats
      fetchSpkJasa();
      fetchStatistics();
      handleCloseModal();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "Terjadi kesalahan.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "foto" && files && files[0]) {
      setNewSpkJasa((prev) => ({ ...prev, [name]: files[0] }));
    } else if (name === "harga") {
      const formattedValue = formatRupiah(value);
      const numericValue = parseRupiah(value);
      setNewSpkJasa((prev) => ({
        ...prev,
        harga: numericValue,
        hargaDisplay: formattedValue,
      }));
    } else {
      setNewSpkJasa((prev) => ({ ...prev, [name]: value }));
    }

    if (name === "spk_cutting_distribusi_id") {
      setSelectedDistribusiId(value);
    }
  };

  const handleDistribusiSelect = (dist) => {
    setNewSpkJasa((prev) => ({ ...prev, spk_cutting_distribusi_id: dist.id }));
    setSelectedDistribusiId(dist.id);
    setSearchDistribusi(dist.display); // Set text input ke nama terpilih
    setShowDistribusiDropdown(false);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await API.patch(`/spk-jasa/${id}/status-pengambilan`, {
        status: newStatus,
      });
      toast.success("Status berhasil diperbarui");
      fetchSpkJasa(); // Refresh list
      fetchStatistics(); // Refresh stats
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "Gagal update status.");
    }
  };

  const handleEditClick = async (id) => {
    try {
      const response = await API.get(`/SpkJasa/${id}`);
      const data = response.data;
      const distribusiId = data.spk_cutting_distribusi_id || "";

      setNewSpkJasa({
        tukang_jasa_id: data.tukang_jasa_id || "",
        spk_cutting_distribusi_id: distribusiId,
        deadline: data.deadline ? data.deadline.split("T")[0] : "",
        harga: data.harga || "",
        hargaDisplay: data.harga ? formatRupiah(data.harga.toString()) : "",
        opsi_harga: data.opsi_harga || "pcs",
        tanggal_ambil: data.tanggal_ambil ? data.tanggal_ambil.split("T")[0] : "",
        foto: null,
      });

      setSelectedDistribusiId(distribusiId);
      setEditingId(id);
      
      if(data.kode_seri) {
          setSearchDistribusi(data.kode_seri); 
      }
      
      setShowForm(true);
    } catch (error) {
      console.error("Error fetching detail:", error);
      toast.error("Gagal mengambil data edit");
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setEditingId(null);
    setNewSpkJasa({
      tukang_jasa_id: "",
      spk_cutting_distribusi_id: "",
      deadline: "",
      harga: "",
      hargaDisplay: "",
      opsi_harga: "pcs",
      tanggal_ambil: "",
      foto: null,
    });
    setSelectedDistribusiId("");
    setPreviewData(null);
    setSearchDistribusi("");
    setShowDistribusiDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDistribusiDropdown) return;
    const handleClickOutside = (event) => {
      if (!event.target.closest(".searchable-select-wrapper")) {
        setShowDistribusiDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDistribusiDropdown]);

  const getStatusBadge = (status) => {
      const statusMap = {
          belum_diambil: "belum-diambil",
          sudah_diambil: "sudah-diambil",
          batal_diambil: "batal-diambil",
          selesai: "selesai",
      };
      const label = status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      return <span className={`status-badge ${statusMap[status] || ""}`}>{label}</span>;
  };

  const SkeletonTable = () => (
    <>
      {[...Array(8)].map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton skeleton-cell" /></td>
          <td><div className="skeleton skeleton-text" /></td>
          <td><div className="skeleton skeleton-text" /></td>
          <td><div className="skeleton skeleton-text" style={{ width: '60%' }} /></td>
          <td><div className="skeleton skeleton-cell" /></td>
          <td><div className="skeleton skeleton-text" /></td>
          <td><div className="skeleton skeleton-text" /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: '80px', margin: '0 auto' }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: '100px', margin: '0 auto' }} /></td>
        </tr>
      ))}
    </>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="spk-jasa-container"
    >
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      
      <div className="spk-jasa-header">
        <h1>Data SPK Jasa</h1>
      </div>

      <div className="spk-jasa-actions">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-tambah" 
          onClick={() => setShowForm(true)}
        >
          <FaPlus style={{ marginRight: "8px" }} />
          Tambah SPK Jasa
        </motion.button>
        <div className="search-wrapper">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Cari ID, Tukang, Seri..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          {searchTerm && (
            <button className="search-clear-btn" onClick={() => setSearchTerm("")}>
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="status-cards-container">
        {[
          { key: "all", label: "Total SPK Jasa", icon: "📊", value: stats.total },
          { key: "belum_diambil", label: "Belum Diambil", icon: "⏳", value: stats.belum_diambil },
          { key: "sudah_diambil", label: "Sudah Diambil", icon: "✅", value: stats.sudah_diambil }
        ].map((card) => (
          <motion.div 
            key={card.key}
            whileHover={{ y: -5 }}
            className={`status-card ${statusFilter === card.key ? "active" : ""}`} 
            onClick={() => setStatusFilter(card.key)}
          >
            <div className="status-card-icon">{card.icon}</div>
            <div className="status-card-content">
              <div className="status-card-label">{card.label}</div>
              <div className="status-card-value">{card.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {error ? (
        <div className="error-state">{error}</div>
      ) : (
        <div className="table-wrapper">
          <table className="spk-jasa-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tukang Jasa</th>
                <th>Seri</th>
                <th>Produk</th>
                <th>Jumlah</th>
                <th>Harga/Pcs</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable />
              ) : spkJasa.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-state">Tidak ada data</td>
                </tr>
              ) : (
                spkJasa.map((spk, index) => {
                  const distribusi = spk.spk_cutting_distribusi || {};
                  const produk = distribusi.spk_cutting?.produk || {};
                  const nomor = (pagination.current_page - 1) * pagination.per_page + index + 1;
                  
                  return (
                    <motion.tr 
                      key={spk.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <td>{nomor}</td>
                      <td>{spk.tukang_jasa?.nama || "-"}</td>
                      <td>{distribusi.kode_seri || "-"}</td>
                      <td>{produk.nama_produk || "-"}</td>
                      <td>{spk.jumlah || distribusi.jumlah_produk || 0}</td>
                      <td>
                        {spk.harga_per_pcs 
                          ? `Rp ${parseInt(spk.harga_per_pcs).toLocaleString("id-ID")}` 
                          : "-"}
                      </td>
                      <td>{spk.deadline ? new Date(spk.deadline).toLocaleDateString("id-ID") : "-"}</td>
                      <td>{getStatusBadge(spk.status_pengambilan)}</td>
                      <td>
                        <div className="action-buttons">
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="btn-edit" onClick={() => handleEditClick(spk.id)} title="Edit">
                            <FaEdit /> <span>Edit</span>
                          </motion.button>
                          {spk.status_pengambilan === 'belum_diambil' && (
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="btn-ambil" onClick={() => handleStatusUpdate(spk.id, 'sudah_diambil')} title="Ambil Barang">
                                <FaBoxOpen /> <span>Ambil</span>
                              </motion.button>
                          )}
                           {spk.status_pengambilan === 'sudah_diambil' && (
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="btn-selesai" onClick={() => handleStatusUpdate(spk.id, 'selesai')} title="Tandai Selesai">
                                <FaCheck /> <span>Selesai</span>
                              </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          <div className="pagination">
              <button 
                  disabled={pagination.current_page === 1} 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                  Previous
              </button>
              <span>Halaman {pagination.current_page} dari {pagination.last_page}</span>
              <button 
                  disabled={pagination.current_page === pagination.last_page} 
                  onClick={() => setCurrentPage(p => p + 1)}
              >
                  Next
              </button>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="modal-header">
                <h2>{editingId ? "Edit SPK Jasa" : "Tambah SPK Jasa"}</h2>
                <button className="close-button" onClick={handleCloseModal}><FaTimes /></button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label>Tukang Jasa</label>
                  <select name="tukang_jasa_id" value={newSpkJasa.tukang_jasa_id} onChange={handleInputChange} required>
                    <option value="">Pilih Tukang Jasa</option>
                    {tukangList.map((t) => (
                      <option key={t.id} value={t.id}>{t.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Async Search Dropdown Distribusi */}
                <div className="form-group searchable-select-wrapper">
                  <label>Cari Distribusi Seri (Ketik Kode/Produk)</label>
                  <input
                    type="text"
                    placeholder="Ketik untuk mencari..."
                    value={searchDistribusi}
                    onChange={(e) => {
                        setSearchDistribusi(e.target.value);
                        setShowDistribusiDropdown(true);
                    }}
                    onFocus={() => setShowDistribusiDropdown(true)}
                  />
                  {showDistribusiDropdown && distribusiOptions.length > 0 && (
                    <ul className="dropdown-list">
                      {distribusiOptions.map((option) => (
                        <li key={option.id} onClick={() => handleDistribusiSelect(option)}>
                          <strong>{option.kode_seri}</strong> - {option.produk} (Jml: {option.jumlah_produk})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {previewData && (
                  <motion.div 
                    className="preview-section"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                     <p><strong>Produk:</strong> {previewData.produk}</p>
                     <p><strong>Jumlah Total:</strong> {previewData.jumlah}</p>
                     <div className="preview-colors">
                         {previewData.jumlah_per_warna && previewData.jumlah_per_warna.map((jpw, idx) => (
                             <span key={idx} className="color-tag">{jpw.warna}: {jpw.jumlah}</span>
                         ))}
                     </div>
                  </motion.div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Deadline</label>
                    <input type="date" name="deadline" value={newSpkJasa.deadline} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Tanggal Ambil (Opsional)</label>
                    <input type="date" name="tanggal_ambil" value={newSpkJasa.tanggal_ambil} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Harga (Rp)</label>
                    <input type="text" name="harga" value={newSpkJasa.hargaDisplay} onChange={handleInputChange} placeholder="Contoh: 15000" />
                  </div>
                  <div className="form-group">
                    <label>Satuan Harga</label>
                    <select name="opsi_harga" value={newSpkJasa.opsi_harga} onChange={handleInputChange}>
                      <option value="pcs">Per Pcs</option>
                      <option value="lusin">Per Lusin</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Foto Referensi (Opsional)</label>
                  <input type="file" name="foto" onChange={handleInputChange} accept="image/*" />
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className="btn-submit"
                >
                  {editingId ? "Simpan Perubahan" : "Buat SPK Jasa"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SpkJasa;
