import React, { useEffect, useState } from "react";
import "./TukangSample.css";
import API from "../../api"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiUsers, FiX, FiCheckCircle, FiUser
} from "react-icons/fi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const TukangSample = () => {
  const [tukangSample, setTukangSample] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false); 
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: null,
    nama_tukang_sample: "",
    nomor_hp: "",
  });

  useEffect(() => {
    fetchTukangSample();
  }, []);

  const fetchTukangSample = async () => {
    try {
      setLoading(true);
      const response = await API.get("/tukang-sample"); 
      setTukangSample(response.data.data || []);
    } catch (error) {
      toast.error("Gagal mengambil data tukang sample.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const payload = {
        nama_tukang_sample: formData.nama_tukang_sample,
        nomor_hp: formData.nomor_hp || "",
    };
   
    try {
        if (isEdit && formData.id) {
            setTukangSample(prev => 
                prev.map(item => item.id === formData.id ? { ...item, ...payload } : item)
            );
            await API.put(`/tukang-sample/${formData.id}`, payload);
            toast.success("Tukang Sample berhasil diperbarui!");
        } else {
            const tempId = Date.now();
            setTukangSample(prev => [{ id: tempId, ...payload }, ...prev]);
            await API.post("/tukang-sample", payload);
            toast.success("Tukang Sample berhasil ditambahkan!");
        }

        closeModal();
        fetchTukangSample(); 
    } catch (error) {
        fetchTukangSample(); 
        toast.error(error.response?.data?.message || "Terjadi kesalahan saat menyimpan tukang sample.");
    }
  };

  const confirmDelete = (item) => {
      setItemToDelete(item);
      setShowDeleteModal(true);
  };

  const handleDelete = async () => {
      if (!itemToDelete) return;

      const deletedId = itemToDelete.id;
      
      setTukangSample(prev => prev.filter(item => item.id !== deletedId));
      closeDeleteModal();

      try {
          await API.delete(`/tukang-sample/${deletedId}`);
          toast.success("Data berhasil dihapus!");
      } catch(err) {
          fetchTukangSample(); 
          toast.error("Gagal menghapus data.");
      }
  }

  const closeDeleteModal = () => {
      setShowDeleteModal(false);
      setItemToDelete(null);
  };

  const openEditModal = (item) => {
      setFormData({
          id: item.id,
          nama_tukang_sample: item.nama_tukang_sample,
          nomor_hp: item.nomor_hp || ""
      });
      setIsEdit(true);
      setShowForm(true);
  }

  const closeModal = () => {
      setShowForm(false);
      setIsEdit(false);
      setFormData({
          id: null,
          nama_tukang_sample: "",
          nomor_hp: ""
      });
  }

  const filteredTukangSample = tukangSample.filter((item) =>
      item.nama_tukang_sample.toLowerCase().includes(searchTerm.toLowerCase())
  );
    
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="ts-page">
      <ToastContainer position="top-right" autoClose={2600} hideProgressBar theme="colored" />

      <div className="ts-shell">
        <section className="ts-content">
          <header className="ts-topbar">
            <div className="ts-title-group">
              <div className="ts-brand-icon">
                <FiUser size={24} color="#fff" />
              </div>
              <div className="ts-brand-text">
                 <h1>Tukang Sample</h1>
                 <p>Manajemen data profil dan kontak Tukang Sample ILOOK</p>
              </div>
            </div>
            
            <div className="ts-actions">
              <div className="ts-search-bar">
                <FiSearch className="ts-search-icon-inside" />
                <input 
                  type="text" 
                  placeholder="Cari nama tukang..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                  <h3>Daftar Tukang Sample</h3>
                  <p>Total data tersimpan: {tukangSample.length} tukang</p>
                </div>
                <button className="ts-btn-primary" onClick={() => setShowForm(true)}>
                   <FiPlus size={18} /> Tambah Data
                </button>
              </div>

              <div className="ts-table-container">
                <table className="ts-modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>No</th>
                      <th style={{ paddingLeft: '24px' }}>Nama Lengkap</th>
                      <th>Nomor Handphone</th>
                      <th className="text-right" style={{ paddingRight: '24px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredTukangSample.length > 0 ? (
                        filteredTukangSample.map((ts, index) => (
                          <motion.tr 
                            key={ts.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: index * 0.05 }}
                            layout
                          >
                            <td className="text-muted font-mono" style={{ textAlign: 'center' }}>
                               {index + 1}
                            </td>
                            <td className="font-semibold text-accent" style={{ paddingLeft: '24px' }}>{ts.nama_tukang_sample}</td>
                            <td className="text-muted">{ts.nomor_hp || '-'}</td>
                            <td className="text-right actions-cell" style={{ paddingRight: '24px' }}>
                               <button className="action-btn edit" title="Edit" onClick={() => openEditModal(ts)}>
                                 <FiEdit2 />
                               </button>
                               <button className="action-btn delete" title="Hapus" onClick={() => confirmDelete(ts)}>
                                 <FiTrash2 />
                               </button>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr className="empty-row">
                          <td colSpan="4" className="empty-state">
                            {loading ? "Memuat data..." : `Tidak ada data ditemukan untuk "${searchTerm}"`}
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </main>
        </section>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="ts-modal-overlay">
            <motion.div 
              className="ts-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />
            <motion.div 
              className="ts-modal-box"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="ts-modal-top">
                <div>
                  <h2>{isEdit ? "Edit Tukang Sample" : "Tambah Tukang Sample"}</h2>
                  <p>Masukkan informasi profil dengan lengkap.</p>
                </div>
                <button type="button" className="close-btn" onClick={closeModal}><FiX size={20} /></button>
              </div>

              <form onSubmit={handleFormSubmit} className="ts-modal-form">
                <div className="ts-field-group">
                  <label>Nama Lengkap <span className="text-danger">*</span></label>
                  <input 
                    type="text" 
                    name="nama_tukang_sample" 
                    required 
                    placeholder="Contoh: Budi Santoso" 
                    value={formData.nama_tukang_sample}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="ts-field-group">
                  <label>Nomor Kontak (HP)</label>
                  <input 
                    type="text" 
                    name="nomor_hp" 
                    placeholder="Contoh: 081234567890"
                    value={formData.nomor_hp}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="ts-modal-bottom">
                  <button type="button" className="ts-btn-secondary" onClick={closeModal}>Batal</button>
                  <button type="submit" className="ts-btn-primary">
                    <FiCheckCircle size={18} /> Simpan Data
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && itemToDelete && (
          <div className="ts-modal-overlay">
            <motion.div 
              className="ts-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeleteModal}
            />
            <motion.div 
              className="ts-modal-box small-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="ts-modal-top borderless center-header">
                <button type="button" className="close-btn absolute-right" onClick={closeDeleteModal}><FiX size={20} /></button>
                <div className="danger-icon-wrap">
                  <FiTrash2 size={28} />
                </div>
              </div>

              <div className="ts-modal-form center-text pt-0">
                <h2>Hapus Data Tukang?</h2>
                <p className="delete-desc">
                  Apakah Anda yakin ingin menghapus <strong>{itemToDelete.nama_tukang_sample}</strong> dari database? Tindakan ini tidak dapat dikembalikan.
                </p>

                <div className="ts-modal-bottom evenly">
                  <button type="button" className="ts-btn-secondary flex-1" onClick={closeDeleteModal}>Batal</button>
                  <button type="button" className="ts-btn-danger flex-1" onClick={handleDelete}>
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TukangSample;
