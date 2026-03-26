import React, { useEffect, useState } from "react";
import "./Seri.css";
import API from "../../api";
import { 
  FiSearch, FiPlus, FiDownload, FiHash,
  FiBox, FiX, FiCheckCircle, FiLayers, FiDatabase, FiFilter, FiGrid
} from "react-icons/fi";

const Seri = () => {
  const [seri, setSeri] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  
  const [newSeri, setNewSeri] = useState({
    nomor_seri: "",
    sku: "",
    jumlah: "1",
  });

  const fetchSeri = async (page = 1) => {
    try {
      setLoading(true);
      const response = await API.get(`/seri?page=${page}`);
      setSeri(response.data.data);
      setCurrentPage(response.data.current_page);
      setLastPage(response.data.last_page);
      setError(null);
    } catch (error) {
      setError("Gagal mengambil data seri");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeri(1);
  }, []);

  const downloadQR = async (id, nomorSeri) => {
    try {
      const response = await API.get(`/seri/${id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `qr-seri-${nomorSeri}.pdf`);
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Gagal mengunduh file.");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("nomor_seri", newSeri.nomor_seri);
    formData.append("sku", newSeri.sku);
    formData.append("jumlah", newSeri.jumlah);

    try {
      await API.post("/seri", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await fetchSeri(currentPage);
      setSuccessMessage("Data seri berhasil ditambahkan.");
      setShowSuccessModal(true);
      setShowForm(false);
      setNewSeri({
        nomor_seri: "",
        sku: "",
        jumlah: "1",
      });
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menambahkan seri.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSeri((prev) => ({
      ...prev,
      [name]: name === "jumlah" ? value.replace(/\D/g, "") : value.toUpperCase(),
    }));
  };

  const filteredData = seri.filter((item) => 
    (item.nomor_seri ?? "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.sku ?? "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id?.toString().includes(searchTerm)
  );
  
  const sortedData = [...filteredData].sort((a, b) => b.id - a.id);
  const totalRows = seri.length;
  const visibleRows = sortedData.length;
  const isFiltering = searchTerm.trim().length > 0;

  return (
    <div className="seri-page">
      <header className="seri-topbar">
            <div className="seri-title-group">
              <div className="brand-icon">
                <FiBox size={24} color="#fff" />
              </div>
              <div className="brand-text">
                 <h1>Data Seri Directory</h1>
                 <p>Manajemen nomor seri dan referensi SKU produk</p>
              </div>
            </div>
            
            <div className="seri-actions">
              <div className="search-bar">
                <input 
                  type="text" 
                  placeholder="Cari nomor seri, SKU produk..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </header>

          <main className="seri-main">
            <section className="seri-kpi-grid">
              <article className="seri-kpi-card">
                <div className="kpi-icon"><FiDatabase size={16} /></div>
                <div>
                  <p>Total Seri (Halaman)</p>
                  <h3>{totalRows}</h3>
                </div>
              </article>
              <article className="seri-kpi-card">
                <div className="kpi-icon"><FiFilter size={16} /></div>
                <div>
                  <p>Hasil Pencarian</p>
                  <h3>{visibleRows}</h3>
                </div>
              </article>
              <article className="seri-kpi-card">
                <div className="kpi-icon"><FiGrid size={16} /></div>
                <div>
                  <p>Posisi Halaman</p>
                  <h3>{currentPage} / {lastPage}</h3>
                </div>
              </article>
            </section>

            <div className="table-card">
              <div className="table-header">
                <div>
                  <h3>Semua Data Seri</h3>
                  <p>
                    Monitoring nomor seri produk dan referensi SKU
                    {isFiltering ? ` - menampilkan ${visibleRows} hasil dari filter` : ` - ${totalRows} data pada halaman ini`}
                  </p>
                </div>
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                   <FiPlus size={18} /> Tambah Seri Baru
                </button>
              </div>

              <div className="table-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>No</th>
                      <th style={{ paddingLeft: '24px' }}>Nomor Seri</th>
                      <th>Informasi SKU</th>
                      <th className="text-right" style={{ paddingRight: '24px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                      {loading ? (
                        <tr className="empty-row">
                            <td colSpan="4" className="empty-state">Memuat data seri...</td>
                        </tr>
                      ) : error ? (
                        <tr className="empty-row">
                            <td colSpan="4" className="empty-state text-accent">{error}</td>
                        </tr>
                      ) : sortedData.map((item, index) => (
                        <tr key={item.id}>
                          <td className="text-muted font-mono" style={{ textAlign: 'center' }}>
                             {index + 1}
                          </td>
                          <td style={{ paddingLeft: '24px' }}>
                            <div className="serial-pill">
                              <span className="status-dot-sm"></span>
                              <span className="font-semibold text-accent">{item.nomor_seri}</span>
                            </div>
                          </td>
                          <td>
                            <span className="sku-inline">
                                <FiLayers className="text-muted" />
                                <span className="sku-chip">{item.sku}</span>
                            </span>
                          </td>
                          <td className="text-right" style={{ paddingRight: '24px' }}>
                             <button className="btn-download-blue" onClick={() => downloadQR(item.id, item.nomor_seri)}>
                                <FiDownload /> Unduh QR
                             </button>
                          </td>
                        </tr>
                      ))}
                    {!loading && sortedData.length === 0 && !error && (
                      <tr className="empty-row">
                        <td colSpan="4" className="empty-state">
                          Tidak ada data seri yang sesuai dengan kata kunci "{searchTerm}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!loading && sortedData.length > 0 && (
                <div className="seri-pagination">
                  <button disabled={currentPage === 1} onClick={() => fetchSeri(currentPage - 1)}>
                    Sebelumnya
                  </button>
                  <span>
                    Halaman {currentPage} dari {lastPage}
                  </span>
                  <button disabled={currentPage === lastPage} onClick={() => fetchSeri(currentPage + 1)}>
                    Selanjutnya
                  </button>
                </div>
              )}
            </div>
      </main>

      {showForm && (
          <div className="modal-overlay">
            <div className="modal-backdrop" onClick={() => setShowForm(false)} />
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h2>Tambah Seri dan SKU Baru</h2>
                  <p>Masukkan detail untuk pembuatan nomor seri logistik</p>
                </div>
                <button type="button" className="close-btn" onClick={() => setShowForm(false)}>
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="modal-form">
                <div className="form-group">
                  <label><FiHash /> Nomor Seri Unik</label>
                  <input 
                    type="text" 
                    name="nomor_seri" 
                    required 
                    placeholder="Contoh: AL-01" 
                    value={newSeri.nomor_seri}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label><FiLayers /> SKU Referensi</label>
                    <input 
                      type="text" 
                      name="sku" 
                      required 
                      placeholder="Contoh: SET Karina"
                      value={newSeri.sku}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Jumlah Print</label>
                    <input 
                      type="number" 
                      min="1"
                      name="jumlah"
                      value={newSeri.jumlah}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
                  <button type="submit" className="btn-primary">
                    <FiCheckCircle size={18} /> Simpan Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="modal-backdrop" onClick={() => setShowSuccessModal(false)} />
            <div className="modal-content modal-content-compact">
              <div className="success-wrap">
                <div className="success-icon-wrap">
                    <FiCheckCircle size={40} />
                </div>
                <h2 className="success-title">Berhasil Disimpan</h2>
                <p className="success-text">{successMessage}</p>
                <button 
                  type="button" 
                  className="btn-primary success-btn"
                  onClick={() => setShowSuccessModal(false)}>
                  Tutup dan Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Seri;
