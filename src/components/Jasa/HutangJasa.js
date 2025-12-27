import React, { useEffect, useState, useRef } from "react";
import "./HutangJasa.css";
import API from "../../api";
import { FaPlus, FaInfoCircle, FaSearch, FaTimes } from "react-icons/fa";

const HutangJasa = () => {
  const [hutangs, setHutangs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [cuttingList, setCuttingList] = useState([]);
  const [error, setError] = useState(null);
  const [selectedHutang, setSelectedHutang] = useState(null);
  const [selectedDetailHutang, setSelectedDetailHutang] = useState(null);
  const [selectedJenisPerubahan, setSelectedJenisPerubahan] = useState("");
  const [logHistory, setLogHistory] = useState([]);
  const [newHutang, setNewHutang] = useState({
    tukang_jasa_id: "",
    jumlah_hutang: "",
    potongan_per_minggu: "",
    is_potongan_persen: false,
    persentase_potongan: null,
    bukti_transfer: null,
  });

  // Refs untuk mencegah multiple simultaneous API calls
  const isFetchingHutangs = useRef(false);
  const isFetchingCutting = useRef(false);

  useEffect(() => {
    // Mencegah multiple calls
    if (isFetchingHutangs.current) return;

    const fetchHutangs = async () => {
      if (isFetchingHutangs.current) return;
      isFetchingHutangs.current = true;

      try {
        setLoading(true);
        setError(null);
        const response = await API.get(`/hutang_jasa`, {});

        setHutangs(response.data.data);
      } catch (error) {
        // Handle 429 (Too Many Requests) dengan pesan yang lebih jelas
        if (error.response?.status === 429) {
          setError("Terlalu banyak permintaan. Silakan tunggu beberapa saat dan refresh halaman.");
        } else {
          setError(error.response?.data?.message || "Failed to fetch data");
        }
        console.error("Error fetching Hutang:", error);
      } finally {
        setLoading(false);
        isFetchingHutangs.current = false;
      }
    };

    fetchHutangs();

    // Cleanup function
    return () => {
      isFetchingHutangs.current = false;
    };
  }, []);

  useEffect(() => {
    // Mencegah multiple calls
    if (isFetchingCutting.current) return;

    const fetchCutting = async () => {
      if (isFetchingCutting.current) return;
      isFetchingCutting.current = true;

      try {
        const response = await API.get("/tukang-jasa");
        setCuttingList(response.data);
      } catch (error) {
        // Handle 429 (Too Many Requests)
        if (error.response?.status === 429) {
          console.warn("Too many requests for tukang-jasa. Skipping...");
        } else {
          setError("Gagal mengambil data tukang cutting .");
        }
      } finally {
        isFetchingCutting.current = false;
      }
    };

    fetchCutting();

    // Cleanup function
    return () => {
      isFetchingCutting.current = false;
    };
  }, []);

  // Fungsi helper untuk refresh data hutang dengan protection
  const refreshHutangs = async () => {
    if (isFetchingHutangs.current) return;

    try {
      isFetchingHutangs.current = true;
      const response = await API.get(`/hutang_jasa`);
      setHutangs(response.data.data);
      setError(null);
    } catch (error) {
      if (error.response?.status === 429) {
        setError("Terlalu banyak permintaan. Silakan tunggu beberapa saat.");
      } else {
        console.error("Error refreshing hutangs:", error);
      }
    } finally {
      isFetchingHutangs.current = false;
    }
  };

  const fetchHistory = async (id, jenis_perubahan) => {
    try {
      console.log("Fetching history for hutang ID:", id, "with filter:", jenis_perubahan);

      const response = await API.get(`/history_jasa/${id}`, {
        params: { jenis_perubahan: jenis_perubahan || "" },
      });

      console.log("Response from API:", response.data);
      setLogHistory(response.data || []);
    } catch (error) {
      console.error("Error fetching history:", error.response?.data || error);

      if (error.response?.status === 404) {
        setLogHistory([]);
      } else if (error.response?.status === 429) {
        console.warn("Too many requests for history. Skipping...");
      }
    }
  };

  // Fungsi untuk format rupiah (tampilan)
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
    if (!value) return "";
    // Hapus semua karakter non-digit
    return value.toString().replace(/\D/g, "");
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault(); // Mencegah refresh halaman

    // Validasi
    if (newHutang.is_potongan_persen && !newHutang.persentase_potongan) {
      alert("Persentase potongan harus diisi");
      return;
    }

    if (!newHutang.is_potongan_persen && !newHutang.potongan_per_minggu) {
      alert("Potongan per minggu harus diisi");
      return;
    }

    // Membuat FormData untuk mengirimkan data bersama file
    const formData = new FormData();
    formData.append("tukang_jasa_id", selectedHutang.tukang_jasa_id || selectedHutang.id);
    // Konversi dari format rupiah ke number untuk jumlah_hutang dan potongan_per_minggu
    const jumlahHutang = parseRupiah(newHutang.jumlah_hutang);
    formData.append("jumlah_hutang", jumlahHutang);
    formData.append("is_potongan_persen", newHutang.is_potongan_persen ? "1" : "0");

    if (newHutang.is_potongan_persen) {
      formData.append("persentase_potongan", newHutang.persentase_potongan);
    } else {
      const potonganMinggu = parseRupiah(newHutang.potongan_per_minggu);
      formData.append("potongan_per_minggu", potonganMinggu);
    }

    // Jika ada bukti transfer, tambahkan ke FormData
    if (newHutang.bukti_transfer) {
      formData.append("bukti_transfer", newHutang.bukti_transfer);
    }

    try {
      // Gunakan endpoint tambahHutangJasa untuk create/update dengan potongan
      const response = await API.post(`/hutang/tambah_jasa`, formData, {
        headers: {
          "Content-Type": "multipart/form-data", // Pastikan menggunakan multipart untuk upload file
        },
      });

      alert(response.data.message);

      // Refresh data dari server untuk mendapatkan data terbaru
      await refreshHutangs();

      setSelectedHutang(null);

      // Reset form input
      setNewHutang({
        tukang_jasa_id: "",
        jumlah_hutang: "",
        potongan_per_minggu: "",
        is_potongan_persen: false,
        persentase_potongan: null,
        bukti_transfer: null,
      });
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);

      // Tampilkan pesan error dari backend jika ada
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan data hutang.");
    }
  };

  const handleTambahClick = (hutang) => {
    setSelectedHutang(hutang); // Set hutang yang dipilih untuk pembayaran
  };

  const handleDetailClick = (hutang) => {
    setSelectedDetailHutang(hutang); // Simpan data hutang yang dipilih
    // Hanya fetch history jika hutang sudah ada (id tidak null)
    if (hutang.id) {
      fetchHistory(hutang.id, selectedJenisPerubahan); // Ambil log history sesuai filter
    } else {
      setLogHistory([]); // Jika belum ada hutang, set history kosong
    }
  };
  // Format rupiah untuk display
  const formatRupiahDisplay = (angka) => {
    if (!angka && angka !== 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  return (
    <div className="hutang-jasa-container">
      <div className="hutang-jasa-header">
        <div className="hutang-jasa-header-icon">💰</div>
        <h1>Daftar Hutang Jasa</h1>
      </div>

      <div className="hutang-jasa-filter-container">
        <div className="hutang-jasa-search-wrapper">
          <FaSearch className="hutang-jasa-search-icon" />
          <input type="text" placeholder="Cari nama tukang jasa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="hutang-jasa-loading">Memuat data...</div>
      ) : error ? (
        <div className="hutang-jasa-error">{error}</div>
      ) : hutangs.length === 0 ? (
        <div className="hutang-jasa-empty-state">
          <div className="hutang-jasa-empty-state-icon">📋</div>
          <p>Tidak ada data hutang</p>
        </div>
      ) : (
        <div className="hutang-jasa-table-wrapper">
          <table className="hutang-jasa-table">
            <thead>
              <tr>
                <th>Nama Tukang Jasa</th>
                <th>Jumlah Hutang</th>
                <th>Potongan Per Minggu</th>
                <th>Potongan Persen</th>
                <th>Status Pembayaran</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {hutangs
                .filter((h) => {
                  const searchLower = searchTerm.toLowerCase();
                  return h.tukang_jasa?.nama?.toLowerCase().includes(searchLower) || (h.nama && h.nama.toLowerCase().includes(searchLower));
                })
                .map((hutang) => (
                  <tr key={hutang.tukang_jasa_id || hutang.id}>
                    <td>{hutang.tukang_jasa?.nama || hutang.nama}</td>
                    <td>
                      <span className="hutang-jasa-price">{formatRupiahDisplay(hutang.jumlah_hutang || 0)}</span>
                    </td>
                    <td>
                      <span className="hutang-jasa-price">{formatRupiahDisplay(hutang.potongan_per_minggu || 0)}</span>
                    </td>
                    <td>{hutang.persentase_potongan ? <span style={{ fontWeight: 600, color: "#667eea" }}>{hutang.persentase_potongan}%</span> : <span style={{ color: "#94a3b8" }}>-</span>}</td>
                    <td>
                      <span className={`hutang-jasa-status ${hutang.status_pembayaran || "belum"}`}>{hutang.status_pembayaran || "belum"}</span>
                    </td>
                    <td>
                      <div className="hutang-jasa-actions">
                        <button className="hutang-jasa-btn hutang-jasa-btn-add" onClick={() => handleTambahClick(hutang)} title="Tambah Hutang">
                          <FaPlus />
                        </button>
                        {hutang.id && (
                          <button className="hutang-jasa-btn hutang-jasa-btn-info" onClick={() => handleDetailClick(hutang)} title="Detail">
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

      {selectedHutang && (
        <div
          className="hutang-jasa-modal"
          onClick={() => {
            setSelectedHutang(null);
            setNewHutang({
              tukang_jasa_id: "",
              jumlah_hutang: "",
              potongan_per_minggu: "",
              is_potongan_persen: false,
              persentase_potongan: null,
              bukti_transfer: null,
            });
          }}
        >
          <div className="hutang-jasa-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hutang-jasa-modal-header">
              <h2>Tambah Hutang - {selectedHutang.tukang_jasa?.nama || selectedHutang.nama}</h2>
              <button
                className="hutang-jasa-modal-close"
                onClick={() => {
                  setSelectedHutang(null);
                  setNewHutang({
                    tukang_jasa_id: "",
                    jumlah_hutang: "",
                    potongan_per_minggu: "",
                    is_potongan_persen: false,
                    persentase_potongan: null,
                    bukti_transfer: null,
                  });
                }}
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="hutang-jasa-form">
              <div className="hutang-jasa-form-group">
                <label>Jumlah Hutang</label>
                <div className="hutang-jasa-input-rupiah">
                  <input
                    type="text"
                    value={formatRupiah(newHutang.jumlah_hutang)}
                    onChange={(e) => {
                      const numericValue = parseRupiah(e.target.value);
                      setNewHutang({
                        ...newHutang,
                        jumlah_hutang: numericValue !== "" ? numericValue : "",
                      });
                    }}
                    placeholder="Masukkan jumlah hutang"
                    required
                  />
                </div>
              </div>

              {/* Potongan Per Minggu */}
              {!newHutang.is_potongan_persen && (
                <div className="hutang-jasa-form-group">
                  <label>Potongan Per Minggu</label>
                  <div className="hutang-jasa-input-rupiah">
                    <input
                      type="text"
                      value={formatRupiah(newHutang.potongan_per_minggu)}
                      onChange={(e) => {
                        const numericValue = parseRupiah(e.target.value);
                        setNewHutang({
                          ...newHutang,
                          potongan_per_minggu: numericValue !== "" ? numericValue : "",
                        });
                      }}
                      placeholder="Masukkan jumlah potongan tetap"
                      required={!newHutang.is_potongan_persen}
                    />
                  </div>
                </div>
              )}

              {/* Potongan Berdasarkan Persen */}
              <div className="hutang-jasa-checkbox-group">
                <input
                  type="checkbox"
                  checked={newHutang.is_potongan_persen}
                  onChange={(e) =>
                    setNewHutang({
                      ...newHutang,
                      is_potongan_persen: e.target.checked,
                      persentase_potongan: e.target.checked ? newHutang.persentase_potongan : null,
                    })
                  }
                />
                <label>Potongan berdasarkan persen</label>
              </div>

              {/* Persentase Potongan */}
              {newHutang.is_potongan_persen && (
                <div className="hutang-jasa-form-group">
                  <label>Persentase Potongan (%)</label>
                  <input
                    type="number"
                    value={newHutang.persentase_potongan || ""}
                    onChange={(e) =>
                      setNewHutang({
                        ...newHutang,
                        persentase_potongan: e.target.value !== "" ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Masukkan persentase potongan (0-100)"
                    required={newHutang.is_potongan_persen}
                    min="0"
                    max="100"
                  />
                </div>
              )}

              <div className="hutang-jasa-form-group">
                <label>Upload Bukti Transfer (Opsional)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) =>
                    setNewHutang({
                      ...newHutang,
                      bukti_transfer: e.target.files[0],
                    })
                  }
                />
              </div>

              <div className="hutang-jasa-form-actions">
                <button
                  type="button"
                  className="hutang-jasa-btn-cancel"
                  onClick={() => {
                    setSelectedHutang(null);
                    setNewHutang({
                      tukang_jasa_id: "",
                      jumlah_hutang: "",
                      potongan_per_minggu: "",
                      is_potongan_persen: false,
                      persentase_potongan: null,
                      bukti_transfer: null,
                    });
                  }}
                >
                  Batal
                </button>
                <button type="submit" className="hutang-jasa-btn-submit">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDetailHutang && (
        <div className="hutang-jasa-detail-modal" onClick={() => setSelectedDetailHutang(null)}>
          <div className="hutang-jasa-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="hutang-jasa-detail-header">
              <h3>Detail Hutang</h3>
              <button className="hutang-jasa-modal-close" onClick={() => setSelectedDetailHutang(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="hutang-jasa-detail-body">
              <div className="hutang-jasa-detail-info">
                <div className="hutang-jasa-detail-item">
                  <strong>ID Hutang</strong>
                  <span>{selectedDetailHutang.id}</span>
                </div>
                <div className="hutang-jasa-detail-item">
                  <strong>ID Penjahit</strong>
                  <span>{selectedDetailHutang.tukang_jasa_id}</span>
                </div>
                <div className="hutang-jasa-detail-item">
                  <strong>Jumlah Hutang</strong>
                  <span>{formatRupiahDisplay(selectedDetailHutang.jumlah_hutang || 0)}</span>
                </div>
                <div className="hutang-jasa-detail-item">
                  <strong>Status Pembayaran</strong>
                  <span className={`hutang-jasa-status ${selectedDetailHutang.status_pembayaran || "belum"}`}>{selectedDetailHutang.status_pembayaran || "belum"}</span>
                </div>
                {selectedDetailHutang.tanggal_hutang && (
                  <div className="hutang-jasa-detail-item">
                    <strong>Tanggal Hutang</strong>
                    <span>{new Date(selectedDetailHutang.tanggal_hutang).toLocaleDateString("id-ID")}</span>
                  </div>
                )}
              </div>

              <div className="hutang-jasa-history-section">
                <h4>Log History</h4>
                <select
                  className="hutang-jasa-filter-select"
                  value={selectedJenisPerubahan}
                  onChange={(e) => {
                    setSelectedJenisPerubahan(e.target.value);
                    if (selectedDetailHutang.id) {
                      fetchHistory(selectedDetailHutang.id, e.target.value);
                    }
                  }}
                >
                  <option value="">Semua</option>
                  <option value="penambahan">Penambahan</option>
                  <option value="pengurangan">Pengurangan</option>
                </select>

                {logHistory.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table className="hutang-jasa-history-table">
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
                              <span className={`hutang-jasa-status ${history.jenis_perubahan === "penambahan" ? "belum" : "lunas"}`}>{history.jenis_perubahan}</span>
                            </td>
                            <td>
                              <span className="hutang-jasa-price">{formatRupiahDisplay(history.perubahan_hutang || 0)}</span>
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
                  <p style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>Tidak ada log pembayaran.</p>
                )}
              </div>
            </div>

            <div className="hutang-jasa-detail-footer">
              <button className="hutang-jasa-btn-close" onClick={() => setSelectedDetailHutang(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HutangJasa;
