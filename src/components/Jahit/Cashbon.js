import React, { useEffect, useState } from "react";
import { FaPlus, FaInfoCircle, FaTimes, FaSearch } from 'react-icons/fa';
import "./Cashbon.css";
import API from "../../api"; 

const Cashbon = () => {
  const [cashbons, setCashbons] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [penjahitList, setPenjahitList] = useState([]);
  const [selectedCashbon, setSelectedCashbon] = useState(null); 
  const [error, setError] = useState("");
  const [selectedJenisPerubahan, setSelectedJenisPerubahan] = useState(""); 
  const [logHistory, setLogHistory] = useState([]);
  const [selectedDetailCashbon, setSelectedDetailCashbon] = useState(null); 
  const [newCashbon, setNewCashbon] = useState({
    id_penjahit: "",
    jumlah_cashboan: "",
    bukti_transfer: null,
  });

  // Fungsi untuk format rupiah (input formatting dengan titik)
  const formatRupiah = (value) => {
    if (!value && value !== 0) return "";
    const number = value.toString().replace(/\D/g, "");
    if (!number) return "";
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Fungsi untuk parse dari format rupiah ke angka (untuk disimpan)
  const parseRupiah = (value) => {
    if (!value && value !== 0) return "";
    const cleaned = value.toString().replace(/\D/g, "");
    return cleaned;
  };

  // Fungsi untuk format rupiah untuk display (dengan "Rp" prefix)
  const formatRupiahDisplay = (value) => {
    if (!value && value !== 0) return "Rp 0";
    const numValue = typeof value === "string" ? parseFloat(value.replace(/\D/g, "")) : value;
    return `Rp ${numValue.toLocaleString("id-ID")}`;
  };

  useEffect(() => {
    const fetchCasbons = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token"); 
        if (!token) {
          setError("Token tidak ditemukan. Silakan login kembali.");
          setLoading(false);
          return;
        }

        const response = await API.get(`/cashboan`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Data Cashbon:", response.data);

        if (response.data.success && response.data.data) {
          setCashbons(response.data.data || []);
        } else {
          setCashbons([]);
        }
      } catch (error) {
        console.error("Error fetching cashbon:", error);
        setError(error.response?.data?.message || "Gagal mengambil data cashbon.");
        setCashbons([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCasbons();
  }, []);

  useEffect(() => {
    const fetchPenjahits = async () => {
      try {
        const response = await API.get("/penjahit"); 
        setPenjahitList(response.data);
      } catch (error) {
        console.error("Error fetching penjahit:", error);
        setError("Gagal mengambil data penjahit.");
      }
    };
    
    fetchPenjahits();
  }, []);

  const fetchHistory = async (id_cashboan, jenis_perubahan = "") => {
    try {
      console.log("Fetching history for cashbon ID:", id_cashboan, "with filter:", jenis_perubahan);
      
      const response = await API.get(`cashboan/history/${id_cashboan}`, {
        params: jenis_perubahan ? { jenis_perubahan } : {},
      });
  
      console.log("Response from API:", response.data);
      setLogHistory(response.data || []);
    } catch (error) {
      console.error("Error fetching history:", error.response?.data || error);
      setLogHistory([]);
    }
  };

  // Handle submit form
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("id_penjahit", newCashbon.id_penjahit);
    formData.append("jumlah_cashboan", parseRupiah(newCashbon.jumlah_cashboan));

    if (newCashbon.bukti_transfer) {
      formData.append("bukti_transfer", newCashbon.bukti_transfer);
    }

    try {
      setLoading(true);
      const response = await API.post("/cashboan/tambah", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert(response.data.message);

      // Refresh data
      const refreshResponse = await API.get("/cashboan");
      if (refreshResponse.data.success && refreshResponse.data.data) {
        setCashbons(refreshResponse.data.data || []);
      }

      setShowForm(false);
      setNewCashbon({
        id_penjahit: "",
        jumlah_cashboan: "",
        bukti_transfer: null,
      });
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan cashboan.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    const cashbonId = selectedCashbon.id_cashboan || selectedCashbon.id;
    if (!cashbonId) {
      alert("ID cashbon tidak valid");
      return;
    }

    const formData = new FormData();
    formData.append('perubahan_cashboan', parseRupiah(newCashbon.jumlah_cashboan));

    if (newCashbon.bukti_transfer) {
      formData.append('bukti_transfer', newCashbon.bukti_transfer);
    }

    try {
      setLoading(true);
      const response = await API.post(`/cashboan/tambah/${cashbonId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert(response.data.message);

      // Refresh data
      const refreshResponse = await API.get("/cashboan");
      if (refreshResponse.data.success && refreshResponse.data.data) {
        setCashbons(refreshResponse.data.data || []);
      }

      setSelectedCashbon(null);
      setNewCashbon({
        id_penjahit: "",
        jumlah_cashboan: "",
        bukti_transfer: null,
      });
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan data cashboan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDetailClick = (cashbon) => {
    const cashbonId = cashbon.id_cashboan || cashbon.id;
    if (!cashbonId) {
      alert("ID cashbon tidak valid untuk melihat detail");
      return;
    }
    setSelectedDetailCashbon(cashbon);
    fetchHistory(cashbonId, selectedJenisPerubahan);
  };

  useEffect(() => {
    if (selectedDetailCashbon) {
      const cashbonId = selectedDetailCashbon.id_cashboan || selectedDetailCashbon.id;
      if (cashbonId) {
        fetchHistory(cashbonId, selectedJenisPerubahan);
      }
    }
  }, [selectedDetailCashbon, selectedJenisPerubahan]);

  const getFilteredPenjahit = async (selectedId) => {
    try {
      setLoading(true);
      const response = await API.get(`/cashboan`, {
        params: { penjahit: selectedId }
      });

      console.log("Filtered Data:", response.data);

      if (response.data.success && response.data.data) {
        setCashbons(response.data.data || []);
      } else {
        setCashbons([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      const errorMessage = error.response?.data?.message || "Terjadi kesalahan saat mengambil data cashbon.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatTanggal = (tanggal) => {
    if (!tanggal) return "-";
    const date = new Date(tanggal);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const getStatusColor = (status_pembayaran) => {
    switch (status_pembayaran) {
      case "belum lunas":
        return "belum-lunas";
      case "dibayar sebagian":
        return "dibayar-sebagian";
      case "lunas":
        return "lunas";
      default:
        return "";
    }
  };

  const handleTambahClick = (cashbon) => {
    setSelectedCashbon(cashbon);
  };

  const handleJumlahCashbonChange = (e) => {
    const value = e.target.value;
    const formatted = formatRupiah(value);
    setNewCashbon({ ...newCashbon, jumlah_cashboan: formatted });
  };

  // Filter cashbons berdasarkan search term
  const filteredCashbons = cashbons.filter((cashbon) => {
    const namaPenjahit = cashbon.penjahit?.nama_penjahit || 
      penjahitList.find(p => p.id_penjahit === cashbon.id_penjahit)?.nama_penjahit || 
      '';
    return namaPenjahit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cashbon.status_pembayaran?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="cashbon-container">
      <div className="cashbon-header">
        <h1>Daftar Cashbon</h1>
        <div className="cashbon-actions">
          <button 
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            <FaPlus /> Tambah Cashbon
          </button>
          <div className="cashbon-filter">
            <select
              onChange={(e) => {
                if (e.target.value === "") {
                  // Reload semua data
                  window.location.reload();
                } else {
                  getFilteredPenjahit(e.target.value);
                }
              }}
            >
              <option value="">Semua Penjahit</option>
              {penjahitList.map((penjahit) => (
                <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                  {penjahit.nama_penjahit}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && cashbons.length === 0 ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="empty-state">
          <p className="empty-state-text">{error}</p>
        </div>
      ) : filteredCashbons.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">Tidak ada data cashbon</p>
        </div>
      ) : (
        <>
          <div className="cashbon-table-wrapper">
            <table className="cashbon-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Penjahit</th>
                  <th>Jumlah Cashbon</th>
                  <th>Status Pembayaran</th>
                  <th>Tanggal Cashbon</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCashbons.map((cashbon, index) => {
                  const namaPenjahit = cashbon.penjahit?.nama_penjahit || 
                    penjahitList.find(p => p.id_penjahit === cashbon.id_penjahit)?.nama_penjahit || 
                    'Tidak Diketahui';
                  
                  return (
                    <tr key={cashbon.id || cashbon.id_cashboan || index}>
                      <td>{cashbon.id || cashbon.id_cashboan || '-'}</td>
                      <td>{namaPenjahit}</td>
                      <td>{formatRupiahDisplay(cashbon.jumlah_cashboan || 0)}</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(cashbon.status_pembayaran)}`}>
                          {cashbon.status_pembayaran || 'belum lunas'}
                        </span>
                      </td>
                      <td>{formatTanggal(cashbon.tanggal_cashboan)}</td>
                      <td>
                        <div className="action-buttons">
                          {(cashbon.id || cashbon.id_cashboan) && (
                            <button 
                              className="btn-icon btn-icon-add"
                              onClick={() => handleTambahClick(cashbon)}
                              title="Tambah Cashbon"
                            >
                              <FaPlus />
                            </button>
                          )}
                          {(cashbon.id || cashbon.id_cashboan) && (
                            <button 
                              className="btn-icon btn-icon-info"
                              onClick={() => handleDetailClick(cashbon)}
                              title="Detail Cashbon"
                            >
                              <FaInfoCircle />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedDetailCashbon && (
        <div className="modal-overlay" onClick={() => setSelectedDetailCashbon(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Cashbon</h2>
              <button className="modal-close" onClick={() => setSelectedDetailCashbon(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <div className="detail-item">
                  <span className="detail-label">ID Cashbon:</span>
                  <span className="detail-value">{selectedDetailCashbon.id_cashboan || selectedDetailCashbon.id || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Nama Penjahit:</span>
                  <span className="detail-value">
                    {selectedDetailCashbon.penjahit?.nama_penjahit || 
                      penjahitList.find(p => p.id_penjahit === selectedDetailCashbon.id_penjahit)?.nama_penjahit || 
                      'Tidak Diketahui'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Jumlah Cashbon:</span>
                  <span className="detail-value">{formatRupiahDisplay(selectedDetailCashbon.jumlah_cashboan || 0)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status Pembayaran:</span>
                  <span className="detail-value">
                    <span className={`status-badge ${getStatusColor(selectedDetailCashbon.status_pembayaran)}`}>
                      {selectedDetailCashbon.status_pembayaran || 'belum lunas'}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tanggal Cashbon:</span>
                  <span className="detail-value">{formatTanggal(selectedDetailCashbon.tanggal_cashboan)}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Log History</h4>
                {logHistory.length > 0 ? (
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Tanggal Perubahan</th>
                        <th>Jenis Perubahan</th>
                        <th>Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logHistory.map((history, index) => (
                        <tr key={index}>
                          <td>{formatTanggal(history.tanggal_perubahan)}</td>
                          <td>{history.jenis_perubahan || '-'}</td>
                          <td>{formatRupiahDisplay(history.perubahan_cashboan || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-history">Tidak ada log history.</p>
                )}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-cancel" onClick={() => setSelectedDetailCashbon(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah Cashbon */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Cashbon</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label>Penjahit</label>
                  <select
                    value={newCashbon.id_penjahit}
                    onChange={(e) =>
                      setNewCashbon({ ...newCashbon, id_penjahit: e.target.value })
                    }
                    required
                  >
                    <option value="" disabled>
                      Pilih Penjahit
                    </option>
                    {penjahitList.map((penjahit) => (
                      <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                        {penjahit.nama_penjahit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Jumlah Cashbon</label>
                  <input
                    type="text"
                    value={newCashbon.jumlah_cashboan}
                    onChange={handleJumlahCashbonChange}
                    placeholder="Masukkan jumlah cashbon"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Upload Bukti Transfer (Opsional)</label>
                  <div className="form-group-file">
                    <label className="file-label">
                      {newCashbon.bukti_transfer ? newCashbon.bukti_transfer.name : "Pilih File"}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) =>
                          setNewCashbon({
                            ...newCashbon,
                            bukti_transfer: e.target.files[0],
                          })
                        }
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-cancel" onClick={() => setShowForm(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-submit">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah Cashbon (Edit) */}
      {selectedCashbon && (
        <div className="modal-overlay" onClick={() => setSelectedCashbon(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Cashbon (ID: {selectedCashbon.id || selectedCashbon.id_cashboan})</h2>
              <button className="modal-close" onClick={() => setSelectedCashbon(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handlePaymentSubmit}>
                <div className="form-group">
                  <label>Jumlah Tambah Cashbon</label>
                  <input
                    type="text"
                    value={newCashbon.jumlah_cashboan || ""}
                    onChange={handleJumlahCashbonChange}
                    placeholder="Masukkan jumlah tambah cashbon"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Bukti Transfer (Opsional)</label>
                  <div className="form-group-file">
                    <label className="file-label">
                      {newCashbon.bukti_transfer ? newCashbon.bukti_transfer.name : "Pilih File"}
                      <input
                        type="file"
                        onChange={(e) =>
                          setNewCashbon({ ...newCashbon, bukti_transfer: e.target.files[0] })
                        }
                        accept="image/*,.pdf"
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-cancel" onClick={() => setSelectedCashbon(null)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-submit">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cashbon;
