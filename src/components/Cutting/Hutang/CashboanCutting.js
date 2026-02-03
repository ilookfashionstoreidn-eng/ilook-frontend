import React, { useEffect, useState, useRef } from "react";
import "./CashboanCutting.css";
import API from "../../../api";
import { FaPlus, FaInfoCircle, FaSearch, FaTimes } from "react-icons/fa";

const CashboanCutting = () => {
  const [cashbons, setCashbons] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCashbon, setSelectedCashbon] = useState(null);
  const [selectedJenisPerubahan, setSelectedJenisPerubahan] = useState("");
  const [logHistory, setLogHistory] = useState([]);
  const [selectedDetailCashbon, setSelectedDetailCashbon] = useState(null);
  const [newCashbon, setNewCashbon] = useState({
    tukang_cutting_id: "",
    jumlah_cashboan: "",
    tanggal_cashboan: "",
    bukti_transfer: null,
  });

  // Refs untuk mencegah multiple simultaneous API calls
  const isFetchingCashbons = useRef(false);

  useEffect(() => {
    // Mencegah multiple calls
    if (isFetchingCashbons.current) return;

    const fetchCashbons = async () => {
      if (isFetchingCashbons.current) return;
      isFetchingCashbons.current = true;

      try {
        setLoading(true);
        setError(null);
        const response = await API.get(`/cashboan_cutting`, {});

        setCashbons(response.data.data);
      } catch (error) {
        // Handle 429 (Too Many Requests) dengan pesan yang lebih jelas
        if (error.response?.status === 429) {
          setError("Terlalu banyak permintaan. Silakan tunggu beberapa saat dan refresh halaman.");
        } else {
          setError(error.response?.data?.message || "Failed to fetch data");
        }
        console.error("Error fetching Cashboans:", error);
      } finally {
        setLoading(false);
        isFetchingCashbons.current = false;
      }
    };

    fetchCashbons();

    // Cleanup function
    return () => {
      isFetchingCashbons.current = false;
    };
  }, []);

  // Fungsi helper untuk refresh data cashbon dengan protection
  const refreshCashbons = async () => {
    if (isFetchingCashbons.current) return;

    try {
      isFetchingCashbons.current = true;
      const response = await API.get(`/cashboan_cutting`);
      setCashbons(response.data.data);
      setError(null);
    } catch (error) {
      if (error.response?.status === 429) {
        setError("Terlalu banyak permintaan. Silakan tunggu beberapa saat.");
      } else {
        console.error("Error refreshing cashbons:", error);
      }
    } finally {
      isFetchingCashbons.current = false;
    }
  };

  // Fungsi untuk format rupiah (input formatting dengan titik)
  const formatRupiah = (value) => {
    if (!value && value !== 0) return "";
    // Konversi ke string dan hapus semua karakter non-digit
    const number = value.toString().replace(/\D/g, "");
    if (!number) return "";
    // Format dengan pemisah ribuan menggunakan titik
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Fungsi untuk parse dari format rupiah ke angka (untuk disimpan)
  const parseRupiah = (value) => {
    if (!value && value !== 0) return "";
    // Hapus semua karakter non-digit (termasuk titik, spasi, dll)
    const cleaned = value.toString().replace(/\D/g, "");
    return cleaned;
  };

  // Fungsi untuk format rupiah untuk display (dengan "Rp" prefix)
  const formatRupiahDisplay = (value) => {
    if (!value && value !== 0) return "Rp 0";
    const numValue = typeof value === "string" ? parseFloat(value.replace(/\D/g, "")) : value;
    return `Rp ${numValue.toLocaleString("id-ID")}`;
  };

  const fetchHistory = async (id, jenis_perubahan = "") => {
    try {
      console.log("Fetching history for cashbon ID:", id, "with filter:", jenis_perubahan);

      const response = await API.get(`history_cashboan_cutting/${id}`, {
        params: jenis_perubahan ? { jenis_perubahan } : {},
      });

      console.log("Response from API:", response.data);
      setLogHistory(response.data || []);
    } catch (error) {
      console.error("Error fetching history:", error.response?.data || error);

      if (error.response?.status === 404) {
        setLogHistory([]);
      } else if (error.response?.status === 429) {
        console.warn("Too many requests for history. Skipping...");
      } else {
        setLogHistory([]);
      }
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Validasi
    if (!newCashbon.jumlah_cashboan || parseRupiah(newCashbon.jumlah_cashboan) === "") {
      alert("Jumlah cashbon harus diisi");
      return;
    }

    // Membuat FormData untuk mengirimkan data dan file
    const formData = new FormData();

    // Pastikan kita menggunakan nilai yang sudah di-parse
    let jumlahCashbonString = "";
    if (typeof newCashbon.jumlah_cashboan === "string") {
      jumlahCashbonString = parseRupiah(newCashbon.jumlah_cashboan);
    } else {
      jumlahCashbonString = newCashbon.jumlah_cashboan.toString();
    }

    const jumlahCashbon = parseInt(jumlahCashbonString, 10);

    // Debug logging
    console.log("=== SUBMIT DEBUG ===");
    console.log("State jumlah_cashboan:", newCashbon.jumlah_cashboan);
    console.log("Type:", typeof newCashbon.jumlah_cashboan);
    console.log("After parseRupiah:", jumlahCashbonString);
    console.log("After parseInt:", jumlahCashbon);
    console.log("Will send to backend:", jumlahCashbon);

    if (isNaN(jumlahCashbon) || jumlahCashbon <= 0) {
      alert("Jumlah cashbon tidak valid. Pastikan Anda memasukkan angka yang benar.");
      return;
    }

    // Pastikan kita mengirim sebagai number, bukan string
    formData.append("perubahan_cashboan", jumlahCashbon.toString());

    // Jika ada bukti transfer, tambahkan ke FormData
    if (newCashbon.bukti_transfer) {
      formData.append("bukti_transfer", newCashbon.bukti_transfer);
    }

    try {
      // Gunakan tukang_cutting_id bukan cashbon.id
      const tukangCuttingId = selectedCashbon.tukang_cutting_id || selectedCashbon.id;
      const response = await API.post(`/cashboan_cutting/tambah/${tukangCuttingId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert(response.data.message);

      // Refresh data dari server untuk mendapatkan data terbaru
      await refreshCashbons();

      setSelectedCashbon(null);

      // Reset form input
      setNewCashbon({
        tukang_cutting_id: "",
        jumlah_cashboan: "",
        tanggal_cashboan: "",
        bukti_transfer: null,
      });
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan data cashboan.");
    }
  };

  const handleTambahClick = (cashbon) => {
    setSelectedCashbon(cashbon);
  };

  const handleDetailClick = (cashbon) => {
    setSelectedDetailCashbon(cashbon);
    // Hanya fetch history jika cashbon sudah ada (id tidak null)
    if (cashbon.id) {
      fetchHistory(cashbon.id, selectedJenisPerubahan);
    } else {
      setLogHistory([]);
    }
  };

  const filteredCashbons = cashbons.filter((c) => {
    const searchLower = searchTerm.toLowerCase();
    return c.tukang_cutting?.nama_tukang_cutting?.toLowerCase().includes(searchLower) || (c.nama_tukang_cutting && c.nama_tukang_cutting.toLowerCase().includes(searchLower));
  });

  return (
    <div className="cashboan-cutting-container">
      <div className="cashboan-cutting-header">
        <div className="cashboan-cutting-header-icon">💵</div>
        <h1>Daftar Cashbon Cutting</h1>
      </div>

      <div className="cashboan-cutting-filter-container">
        <div className="cashboan-cutting-search-wrapper">
          <FaSearch className="cashboan-cutting-search-icon" />
          <input type="text" placeholder="Cari nama tukang cutting..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="cashboan-cutting-loading">Memuat data...</div>
      ) : error ? (
        <div className="cashboan-cutting-error">{error}</div>
      ) : filteredCashbons.length === 0 ? (
        <div className="cashboan-cutting-empty-state">
          <div className="cashboan-cutting-empty-state-icon">📋</div>
          <p>Tidak ada data cashbon</p>
        </div>
      ) : (
        <div className="cashboan-cutting-table-wrapper">
          <table className="cashboan-cutting-table">
            <thead>
              <tr>
                <th>Nama Tukang Cutting</th>
                <th>Jumlah Cashbon</th>
                <th>Status Pembayaran</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredCashbons.map((c) => (
                <tr key={c.tukang_cutting_id || c.id}>
                  <td>{c.tukang_cutting?.nama_tukang_cutting || c.nama_tukang_cutting}</td>
                  <td>
                    <span className="cashboan-cutting-price">{formatRupiahDisplay(c.jumlah_cashboan || 0)}</span>
                  </td>
                  <td>
                    <span className={`cashboan-cutting-status ${(c.status_pembayaran || "belum lunas").replace(/\s+/g, "-")}`}>{c.status_pembayaran || "belum lunas"}</span>
                  </td>
                  <td>
                    <div className="cashboan-cutting-actions">
                      <button className="cashboan-cutting-btn cashboan-cutting-btn-add" onClick={() => handleTambahClick(c)} title="Tambah Cashbon">
                        <FaPlus />
                      </button>
                      {c.id && (
                        <button className="cashboan-cutting-btn cashboan-cutting-btn-info" onClick={() => handleDetailClick(c)} title="Detail">
                          <FaInfoCircle />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCashbon && (
        <div
          className="cashboan-cutting-modal"
          onClick={() => {
            setSelectedCashbon(null);
            setNewCashbon({
              tukang_cutting_id: "",
              jumlah_cashboan: "",
              tanggal_cashboan: "",
              bukti_transfer: null,
            });
          }}
        >
          <div className="cashboan-cutting-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cashboan-cutting-modal-header">
              <h2>Tambah Cashbon - {selectedCashbon.tukang_cutting?.nama_tukang_cutting || selectedCashbon.nama_tukang_cutting}</h2>
              <button
                className="cashboan-cutting-modal-close"
                onClick={() => {
                  setSelectedCashbon(null);
                  setNewCashbon({
                    tukang_cutting_id: "",
                    jumlah_cashboan: "",
                    tanggal_cashboan: "",
                    bukti_transfer: null,
                  });
                }}
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="cashboan-cutting-form">
              <div className="cashboan-cutting-form-group">
                <label>Jumlah Cashbon</label>
                <div className="cashboan-cutting-input-rupiah">
                  <input
                    type="text"
                    value={formatRupiah(newCashbon.jumlah_cashboan)}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const numericValue = parseRupiah(inputValue);

                      setNewCashbon({
                        ...newCashbon,
                        jumlah_cashboan: numericValue !== "" ? numericValue : "",
                      });
                    }}
                    placeholder="Masukkan jumlah cashbon"
                    required
                  />
                </div>
              </div>

              <div className="cashboan-cutting-form-group">
                <label>Upload Bukti Transfer (Opsional)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) =>
                    setNewCashbon({
                      ...newCashbon,
                      bukti_transfer: e.target.files[0],
                    })
                  }
                />
              </div>

              <div className="cashboan-cutting-form-actions">
                <button
                  type="button"
                  className="cashboan-cutting-btn-cancel"
                  onClick={() => {
                    setSelectedCashbon(null);
                    setNewCashbon({
                      tukang_cutting_id: "",
                      jumlah_cashboan: "",
                      tanggal_cashboan: "",
                      bukti_transfer: null,
                    });
                  }}
                >
                  Batal
                </button>
                <button type="submit" className="cashboan-cutting-btn-submit">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDetailCashbon && (
        <div className="cashboan-cutting-detail-modal" onClick={() => setSelectedDetailCashbon(null)}>
          <div className="cashboan-cutting-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="cashboan-cutting-detail-header">
              <h3>Detail Cashbon</h3>
              <button className="cashboan-cutting-modal-close" onClick={() => setSelectedDetailCashbon(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="cashboan-cutting-detail-body">
              <div className="cashboan-cutting-detail-info">
                <div className="cashboan-cutting-detail-item">
                  <strong>ID Cashbon</strong>
                  <span>{selectedDetailCashbon.id}</span>
                </div>
                <div className="cashboan-cutting-detail-item">
                  <strong>Nama Tukang Cutting</strong>
                  <span>{selectedDetailCashbon.tukang_cutting?.nama_tukang_cutting || selectedDetailCashbon.nama_tukang_cutting}</span>
                </div>
                <div className="cashboan-cutting-detail-item">
                  <strong>Jumlah Cashbon</strong>
                  <span>{formatRupiahDisplay(selectedDetailCashbon.jumlah_cashboan || 0)}</span>
                </div>
                <div className="cashboan-cutting-detail-item">
                  <strong>Status Pembayaran</strong>
                  <span className={`cashboan-cutting-status ${(selectedDetailCashbon.status_pembayaran || "belum lunas").replace(/\s+/g, "-")}`}>{selectedDetailCashbon.status_pembayaran || "belum lunas"}</span>
                </div>
                {selectedDetailCashbon.tanggal_cashboan && (
                  <div className="cashboan-cutting-detail-item">
                    <strong>Tanggal Cashbon</strong>
                    <span>{new Date(selectedDetailCashbon.tanggal_cashboan).toLocaleDateString("id-ID")}</span>
                  </div>
                )}
              </div>

              <div className="cashboan-cutting-history-section">
                <h4>Log History</h4>
                <select
                  className="cashboan-cutting-filter-select"
                  value={selectedJenisPerubahan}
                  onChange={(e) => {
                    setSelectedJenisPerubahan(e.target.value);
                    if (selectedDetailCashbon.id) {
                      fetchHistory(selectedDetailCashbon.id, e.target.value);
                    }
                  }}
                >
                  <option value="">Semua</option>
                  <option value="penambahan">Penambahan</option>
                  <option value="pengurangan">Pengurangan</option>
                </select>

                {logHistory.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table className="cashboan-cutting-history-table">
                      <thead>
                        <tr>
                          <th>Tanggal Perubahan</th>
                          <th>Jenis Perubahan</th>
                          <th>Nominal</th>
                          <th>Bukti Transfer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logHistory.map((history, index) => (
                          <tr key={index}>
                            <td>
                              {new Date(history.tanggal_perubahan).toLocaleDateString("id-ID", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td>
                              <span className={`cashboan-cutting-status ${history.jenis_perubahan === "penambahan" ? "belum-lunas" : "lunas"}`}>{history.jenis_perubahan}</span>
                            </td>
                            <td>
                              <span className="cashboan-cutting-price">{formatRupiahDisplay(history.perubahan_cashboan || 0)}</span>
                            </td>
                            <td>
                              {history.bukti_transfer ? (
                                <a href={`${process.env.REACT_APP_FILE_URL}/storage/${history.bukti_transfer}`} target="_blank" rel="noopener noreferrer">
                                  Lihat Bukti
                                </a>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>Tidak ada</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>Tidak ada log history.</p>
                )}
              </div>
            </div>
            <div className="cashboan-cutting-detail-footer">
              <button
                className="cashboan-cutting-btn-close"
                onClick={() => {
                  setSelectedDetailCashbon(null);
                  setLogHistory([]);
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashboanCutting;
