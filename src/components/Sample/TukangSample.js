import React, { useEffect, useState } from "react"
import "./TukangSample.css";
import API from "../../api"; 
import { FaPlus, FaSearch, FaEdit, FaTrash } from 'react-icons/fa';
import { FiUserPlus, FiSearch, FiEdit2, FiTrash2, FiUsers, FiX } from "react-icons/fi";
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
            // Optimistic Update: Edit
            setTukangSample(prev => 
                prev.map(item => item.id === formData.id ? { ...item, ...payload } : item)
            );
            await API.put(`/tukang-sample/${formData.id}`, payload);
            toast.success("Tukang Sample berhasil diperbarui!");
        } else {
            // Optimistic Update: Add (Fake ID temporarily until refetch)
            const tempId = Date.now();
            setTukangSample(prev => [{ id: tempId, ...payload }, ...prev]);
            await API.post("/tukang-sample", payload);
            toast.success("Tukang Sample berhasil ditambahkan!");
        }

        closeModal();
        fetchTukangSample(); // Refetch to get actual DB generated IDs & order
    } catch (error) {
        fetchTukangSample(); // Revert on error
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
      
      // Optimistic Update: Delete
      setTukangSample(prev => prev.filter(item => item.id !== deletedId));
      closeDeleteModal();

      try {
          await API.delete(`/tukang-sample/${deletedId}`);
          toast.success("Data berhasil dihapus!");
      } catch(err) {
          fetchTukangSample(); // Revert on error
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
   <div className="ts-container">
    <ToastContainer position="top-right" autoClose={2600} hideProgressBar theme="light" />

     <div className="ts-header">
       <div className="ts-header-content">
         <div>
           <h1 className="ts-title">Management Tukang Sample</h1>
           <p className="ts-subtitle">Kelola database profil dan kontak tukang sample ILOOK.</p>
         </div>
       </div>
     </div>

     <div className="ts-toolbar">
        <div className="ts-search-wrapper">
          <FiSearch className="ts-search-icon" />
          <input
            type="text"
            className="ts-search-input"
            placeholder="Cari nama tukang sample..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="ts-toolbar-actions">
          <button 
            className="ts-btn-primary"
            onClick={() => setShowForm(true)}
          >
            <FiUserPlus /> Tambah Tukang
          </button>
        </div>
    </div>
      
    <div className="ts-table-section">
      <div className="ts-table-container">
          <table className="ts-data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>No.</th>
                <th>Nama Lengkap</th>
                <th>Nomor HP</th>
                <th style={{ textAlign: "right", width: '120px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTukangSample.length > 0 ? (
                filteredTukangSample.map((ts, index) => (
                  <tr key={ts.id}>
                    <td><span className="ts-table-id">{index + 1}</span></td>
                    <td><span className="ts-table-name">{ts.nama_tukang_sample}</span></td>
                    <td>{ts.nomor_hp || <span className="text-muted">-</span>}</td>
                    <td style={{ textAlign: "right" }}>
                        <div className="ts-action-group" style={{ justifyContent: 'flex-end' }}>
                          <button 
                              className="ts-btn-icon ts-btn-edit" 
                              onClick={() => openEditModal(ts)}
                              title="Edit"
                          >
                              <FiEdit2 />
                          </button>
                          <button 
                              className="ts-btn-icon ts-btn-delete" 
                              onClick={() => confirmDelete(ts)}
                              title="Hapus"
                          >
                              <FiTrash2 />
                          </button>
                        </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">
                    <div className="ts-empty-state">
                      {loading ? (
                        <p>Memuat data...</p>
                      ) : (
                        <>
                          <FiUsers style={{ fontSize: '2.5rem', marginBottom: '10px' }} />
                          <h3>Tidak ada data</h3>
                          <p>Belum ada rekaman tukang sample yang tersimpan.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
    </div>

    {/* Modal Form */}
        {showForm && (
        <div className="ts-modal-overlay">
          <div className="ts-modal-content">
            <div className="ts-modal-header">
              <h2 className="ts-modal-title">{isEdit ? "Edit Tukang Sample" : "Tambah Baru"}</h2>
              <button className="ts-modal-close" onClick={closeModal}><FiX /></button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="ts-form-group">
                <label className="ts-form-label">Nama Tukang Sample <span style={{color: 'var(--ts-danger)'}}>*</span></label>
                <input
                  type="text"
                  name="nama_tukang_sample"
                  className="ts-form-input"
                  value={formData.nama_tukang_sample}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
              <div className="ts-form-group">
                <label className="ts-form-label">Nomor Kontak (HP)</label>
                <input
                  type="text"
                  name="nomor_hp"
                  className="ts-form-input"
                  value={formData.nomor_hp}
                  onChange={handleInputChange}
                  placeholder="Contoh: 08123456789"
                />
              </div>

            <div className="ts-form-actions">
                <button type="button" className="ts-btn-secondary" onClick={closeModal}>Batal</button>
                <button type="submit" className="ts-btn-primary">
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {showDeleteModal && itemToDelete && (
        <div className="ts-modal-overlay">
          <div className="ts-modal-content ts-modal-delete">
            <div className="ts-modal-header borderless">
              <div className="ts-delete-icon-wrapper">
                <FiTrash2 className="ts-delete-icon-large" />
              </div>
              <button className="ts-modal-close" onClick={closeDeleteModal}><FiX /></button>
            </div>
            <div className="ts-modal-body center-text">
              <h2 className="ts-modal-title">Hapus Data Tukang?</h2>
              <p className="ts-delete-desc">
                Apakah Anda yakin ingin menghapus data atas nama <strong>{itemToDelete.nama_tukang_sample}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="ts-form-actions center-actions">
              <button type="button" className="ts-btn-secondary" onClick={closeDeleteModal}>Batal</button>
              <button type="button" className="ts-btn-danger" onClick={handleDelete}>Ya, Hapus Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TukangSample;
