import React, { useEffect, useState } from "react";
import { FaPlus, FaInfoCircle, FaTimes } from "react-icons/fa";
import "./Hutang.css";
import API from "../../api";

// Utility function untuk format angka dengan titik sebagai pemisah ribuan
const formatNumberWithDot = (value) => {
  if (!value && value !== 0) return "";
  const numStr = value.toString().replace(/\./g, "");
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Utility function untuk parse angka dari format dengan titik
const parseNumberFromFormat = (value) => {
  if (!value) return "";
  return value.toString().replace(/\./g, "");
};

const Hutang = () => {
  const [hutangs, setHutangs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [penjahitList, setPenjahitList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedJenisPerubahan, setSelectedJenisPerubahan] = useState("");
  const [selectedDetailHutang, setSelectedDetailHutang] = useState(null);
  const [logHistory, setLogHistory] = useState([]);

  const [newHutang, setNewHutang] = useState({
    id_penjahit: "",
    jumlah_hutang: "",
    jenis_hutang: "overtime",
    potongan_per_minggu: "",
    is_potongan_persen: false,
    persentase_potongan: null,
    bukti_transfer: null,
  });

  useEffect(() => {
    const fetchHutangs = async () => {
      try {
        setLoading(true);

        const response = await API.get(`/hutang`, {});

        console.log("Data Hutang:", response.data); // Debugging

        setHutangs(response.data.data || []);
      } catch (error) {
        console.error("Error fetching data:", error.response?.data?.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchHutangs();
  }, []);

  useEffect(() => {
    const fetchPenjahits = async () => {
      try {
        setLoading(true);
        const response = await API.get("/penjahit");
        setPenjahitList(response.data);
      } catch (error) {
        console.error("Gagal mengambil data penjahit:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPenjahits();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("id_penjahit", newHutang.id_penjahit);
    // Parse angka dari format dengan titik sebelum submit
    formData.append("jumlah_hutang", parseNumberFromFormat(newHutang.jumlah_hutang));
    formData.append("jenis_hutang", newHutang.jenis_hutang || "overtime");
    formData.append("is_potongan_persen", newHutang.is_potongan_persen ? "1" : "0");

    if (newHutang.is_potongan_persen) {
      formData.append("persentase_potongan", newHutang.persentase_potongan);
    } else {
      formData.append("potongan_per_minggu", parseNumberFromFormat(newHutang.potongan_per_minggu));
    }

    if (newHutang.bukti_transfer) {
      formData.append("bukti_transfer", newHutang.bukti_transfer);
    }

    try {
      const response = await API.post("/hutang/tambah", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert(response.data.message);

      // Refresh data setelah submit
      const fetchResponse = await API.get(`/hutang`);
      setHutangs(fetchResponse.data.data || []);
      setShowForm(false);

      setNewHutang({
        id_penjahit: "",
        jumlah_hutang: "",
        jenis_hutang: "overtime",
        potongan_per_minggu: "",
        is_potongan_persen: false,
        persentase_potongan: null,
        bukti_transfer: null,
      });
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan data hutang.");
    }
  };

  // Handle klik tambah hutang di aksi
  const handleTambahClick = (hutang) => {
    // Set form dengan penjahit yang dipilih
    setNewHutang({
      id_penjahit: hutang.id_penjahit,
      jumlah_hutang: "",
      jenis_hutang: "overtime",
      potongan_per_minggu: "",
      is_potongan_persen: false,
      persentase_potongan: null,
      bukti_transfer: null,
    });
    setShowForm(true); // Buka form lengkap
  };

  const fetchHistory = async (id, jenis_perubahan) => {
    // Jika tidak ada id (penjahit belum punya hutang), set history kosong
    if (!id) {
      setLogHistory([]);
      return;
    }

    try {
      console.log("Fetching history for hutang ID:", id, "with filter:", jenis_perubahan);

      const response = await API.get(`/history/${id}`, {
        params: { jenis_perubahan: jenis_perubahan || "" },
      });

      console.log("Response from API:", response.data);
      setLogHistory(response.data || []); // Harus tetap array kosong kalau tidak ada data
    } catch (error) {
      console.error("Error fetching history:", error.response?.data || error);

      if (error.response?.status === 404) {
        setLogHistory([]); // Jangan null, tetap kosongkan array
      } else {
        setLogHistory([]); // Set kosong jika ada error lain
      }
    }
  };

  const handleDetailClick = (hutang) => {
    setSelectedDetailHutang(hutang); // Simpan data hutang yang dipilih
    // Gunakan id (hutang_id) jika ada, jika tidak ada berarti penjahit belum punya hutang
    const hutangId = hutang.id || null;
    fetchHistory(hutangId, selectedJenisPerubahan); // Ambil log history sesuai filter
  };

  useEffect(() => {
    if (selectedDetailHutang) {
      // Gunakan id (hutang_id) jika ada
      const hutangId = selectedDetailHutang.id || null;
      fetchHistory(hutangId, selectedJenisPerubahan);
    }
  }, [selectedDetailHutang, selectedJenisPerubahan]); // ✅ Tambahkan selectedDetailHutang

  const getFilteredPenjahit = async (selectedId) => {
    try {
      const response = await API.get(`/hutang`, {
        params: selectedId ? { penjahit: selectedId } : {},
      });

      console.log("Filtered Data:", response.data);

      setHutangs(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      const errorMessage = error.response?.data?.message || "Terjadi kesalahan saat mengambil data hutang.";
      alert(errorMessage);
    }
  };

  const getStatusColor = (status_pembayaran) => {
    switch (status_pembayaran) {
      case "belum lunas":
        return "#DCA5A0"; // Kategori A: hijau
      case "dibayar sebagian":
        return "#EAC98D"; // Kategori B: biru
      case "lunas":
        return "#A0DCDC"; // Kategori C: oranye
      default:
        return "black"; // Default: hitam jika kategori tidak dikenali
    }
  };

  return (
     <div className="spkcmt-container">
      <div className="spkcmt-header">
        <h1>📋 Data Hutang</h1>
      </div>
      <div className="hutang-table-container">
        <div className="hutang-filter-header">
          <select id="penjahitFilter" className="hutang-select-filter" onChange={(e) => getFilteredPenjahit(e.target.value)}>
            <option value="">Semua Penjahit</option>
            {penjahitList.map((penjahit) => (
              <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                {penjahit.nama_penjahit}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="hutang-loading">Memuat data...</div>
        ) : (
          <table className="hutang-table">
            <thead>
              <tr>
                <th>NAMA PENJAHIT</th>
                <th>JUMLAH HUTANG</th>
                <th>POTONGAN PER MINGGU</th>
                <th>POTONGAN PER PERSENT</th>
                <th>STATUS PEMBAYARAN</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {hutangs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="hutang-empty-state">
                    <div className="hutang-empty-state-icon">📋</div>
                    <div className="hutang-empty-state-text">Tidak ada data hutang</div>
                  </td>
                </tr>
              ) : (
                hutangs.map((hutang) => (
                  <tr key={hutang.id || hutang.id_penjahit}>
                    <td>
                      <strong>{hutang.penjahit?.nama_penjahit || penjahitList.find((penjahit) => penjahit.id_penjahit === hutang.id_penjahit)?.nama_penjahit || "Tidak Diketahui"}</strong>
                    </td>
                    <td>
                      <strong style={{ color: "#4299e1" }}>Rp {formatNumberWithDot(hutang.jumlah_hutang || 0)}</strong>
                    </td>
                    <td>{hutang.potongan_per_minggu ? `Rp ${formatNumberWithDot(hutang.potongan_per_minggu)}` : "-"}</td>
                    <td>{hutang.persentase_potongan ? `${hutang.persentase_potongan}%` : "-"}</td>
                    <td>
                      <span
                        className="hutang-status-badge"
                        style={{
                          backgroundColor: getStatusColor(hutang.status_pembayaran),
                        }}
                      >
                        {hutang.status_pembayaran}
                      </span>
                    </td>
                    <td>
                      <div className="hutang-action-group">
                        <button className="hutang-btn-icon hutang-btn-icon-primary" onClick={() => handleTambahClick(hutang)} title="Tambah Hutang">
                          <FaPlus />
                        </button>
                        <button className="hutang-btn-icon hutang-btn-icon-info" onClick={() => handleDetailClick(hutang)} title="Detail Hutang">
                          <FaInfoCircle />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div
          className="hutang-modal-overlay"
          onClick={() => {
            setShowForm(false);
            setNewHutang({
              id_penjahit: "",
              jumlah_hutang: "",
              jenis_hutang: "overtime",
              potongan_per_minggu: "",
              is_potongan_persen: false,
              persentase_potongan: null,
              bukti_transfer: null,
            });
          }}
        >
          <div className="hutang-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hutang-modal-header">
              <h2>Tambah Data Hutang {newHutang.id_penjahit ? `- ${penjahitList.find((p) => p.id_penjahit === newHutang.id_penjahit)?.nama_penjahit || ""}` : ""}</h2>
              <button
                type="button"
                className="hutang-btn-icon hutang-btn-icon-primary"
                onClick={() => {
                  setShowForm(false);
                  setNewHutang({
                    id_penjahit: "",
                    jumlah_hutang: "",
                    jenis_hutang: "overtime",
                    potongan_per_minggu: "",
                    is_potongan_persen: false,
                    persentase_potongan: null,
                    bukti_transfer: null,
                  });
                }}
                style={{ background: "transparent", boxShadow: "none" }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="hutang-modal-body">
              <form onSubmit={handleFormSubmit} className="hutang-form">
                {/* Pilih Penjahit */}
                <div className="hutang-form-group">
                  <label className="hutang-form-label">Penjahit</label>
                  <select
                    className="hutang-form-select"
                    value={newHutang.id_penjahit}
                    onChange={(e) => setNewHutang({ ...newHutang, id_penjahit: e.target.value })}
                    required
                    disabled={!!newHutang.id_penjahit}
                    style={newHutang.id_penjahit ? { backgroundColor: "#f7f7f7", cursor: "not-allowed" } : {}}
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

                {/* Jumlah Hutang */}
                <div className="hutang-form-group">
                  <label className="hutang-form-label">Jumlah Hutang</label>
                  <input
                    type="text"
                    className="hutang-form-input"
                    value={formatNumberWithDot(newHutang.jumlah_hutang)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, "");
                      setNewHutang({
                        ...newHutang,
                        jumlah_hutang: value !== "" ? value : "",
                      });
                    }}
                    placeholder="Masukkan jumlah hutang (contoh: 1.000.000)"
                    required
                  />
                </div>

                {/* Jenis Hutang */}
                <input type="hidden" value="overtime" name="jenis_hutang" />

                {/* Potongan Per Minggu */}
                {!newHutang.is_potongan_persen && (
                  <div className="hutang-form-group">
                    <label className="hutang-form-label">Potongan Per Minggu</label>
                    <input
                      type="text"
                      className="hutang-form-input"
                      value={formatNumberWithDot(newHutang.potongan_per_minggu)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d]/g, "");
                        setNewHutang({
                          ...newHutang,
                          potongan_per_minggu: value !== "" ? value : "",
                        });
                      }}
                      placeholder="Masukkan jumlah potongan tetap (contoh: 50.000)"
                      required
                    />
                  </div>
                )}

                {/* Potongan Berdasarkan Persen */}
                <div className="hutang-form-checkbox-group">
                  <input
                    type="checkbox"
                    className="hutang-form-checkbox"
                    checked={newHutang.is_potongan_persen}
                    onChange={(e) =>
                      setNewHutang({
                        ...newHutang,
                        is_potongan_persen: e.target.checked,
                        persentase_potongan: e.target.checked ? newHutang.persentase_potongan : null,
                      })
                    }
                  />
                  <label className="hutang-form-checkbox-label">Potongan berdasarkan persen</label>
                </div>

                {/* Persentase Potongan */}
                {newHutang.is_potongan_persen && (
                  <div className="hutang-form-group">
                    <label className="hutang-form-label">Persentase Potongan (%)</label>
                    <input
                      type="number"
                      className="hutang-form-input"
                      value={newHutang.persentase_potongan || ""}
                      onChange={(e) =>
                        setNewHutang({
                          ...newHutang,
                          persentase_potongan: e.target.value !== "" ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="Masukkan persentase potongan"
                      required
                    />
                  </div>
                )}

                {/* Bukti Transfer */}
                <div className="hutang-form-group">
                  <label className="hutang-form-label">Upload Bukti Transfer (Opsional)</label>
                  <input
                    type="file"
                    className="hutang-form-file-input"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) =>
                      setNewHutang({
                        ...newHutang,
                        bukti_transfer: e.target.files[0],
                      })
                    }
                  />
                </div>

                <div className="hutang-modal-footer">
                  <button type="submit" className="hutang-btn hutang-btn-submit">
                    Simpan
                  </button>
                  <button
                    type="button"
                    className="hutang-btn hutang-btn-cancel"
                    onClick={() => {
                      setShowForm(false);
                      setNewHutang({
                        id_penjahit: "",
                        jumlah_hutang: "",
                        jenis_hutang: "overtime",
                        potongan_per_minggu: "",
                        is_potongan_persen: false,
                        persentase_potongan: null,
                        bukti_transfer: null,
                      });
                    }}
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedDetailHutang && (
        <div className="hutang-modal-overlay" onClick={() => setSelectedDetailHutang(null)}>
          <div className="hutang-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hutang-detail-header">
              <h3>Detail Hutang</h3>
              <button type="button" className="hutang-btn-icon hutang-btn-icon-primary" onClick={() => setSelectedDetailHutang(null)} style={{ background: "transparent", boxShadow: "none" }}>
                <FaTimes />
              </button>
            </div>
            <div className="hutang-detail-body">
              <div className="hutang-detail-item">
                <span className="hutang-detail-label">Penjahit:</span>
                <span className="hutang-detail-value">{selectedDetailHutang.penjahit?.nama_penjahit || selectedDetailHutang.id_penjahit}</span>
              </div>
              <div className="hutang-detail-item">
                <span className="hutang-detail-label">Jumlah Hutang:</span>
                <span className="hutang-detail-value" style={{ color: "#4299e1", fontWeight: "600" }}>
                  Rp {formatNumberWithDot(selectedDetailHutang.jumlah_hutang || 0)}
                </span>
              </div>
              <div className="hutang-detail-item">
                <span className="hutang-detail-label">Status Pembayaran:</span>
                <span className="hutang-detail-value">
                  <span
                    className="hutang-status-badge"
                    style={{
                      backgroundColor: getStatusColor(selectedDetailHutang.status_pembayaran),
                    }}
                  >
                    {selectedDetailHutang.status_pembayaran}
                  </span>
                </span>
              </div>
              {selectedDetailHutang.tanggal_hutang && (
                <div className="hutang-detail-item">
                  <span className="hutang-detail-label">Tanggal Hutang:</span>
                  <span className="hutang-detail-value">{selectedDetailHutang.tanggal_hutang}</span>
                </div>
              )}

              <div className="hutang-detail-section">
                <h4>Log History</h4>
                <select className="hutang-filter-select" value={selectedJenisPerubahan} onChange={(e) => setSelectedJenisPerubahan(e.target.value)}>
                  <option value="">Semua</option>
                  <option value="penambahan">Penambahan</option>
                  <option value="pengurangan">Pengurangan</option>
                </select>

                {logHistory.length > 0 ? (
                  <div className="hutang-scrollable-table">
                    <table className="hutang-history-table">
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
                            <td>{history.tanggal_perubahan}</td>
                            <td>
                              <span
                                className="hutang-status-badge"
                                style={{
                                  backgroundColor: history.jenis_perubahan === "penambahan" ? "#48bb78" : "#f56565",
                                }}
                              >
                                {history.jenis_perubahan}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: "#4299e1" }}>Rp {formatNumberWithDot(history.perubahan_hutang || 0)}</strong>
                            </td>
                            <td>
                              {history.bukti_transfer ? (
                                <a className="hutang-history-link" href={`${process.env.REACT_APP_FILE_URL}/storage/${history.bukti_transfer}`} target="_blank" rel="noopener noreferrer">
                                  Lihat Bukti
                                </a>
                              ) : (
                                <span style={{ color: "#a0aec0" }}>Tidak ada</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="hutang-no-history">Tidak ada log pembayaran.</div>
                )}
              </div>
            </div>

            <div className="hutang-modal-footer">
              <button className="hutang-btn hutang-btn-close" onClick={() => setSelectedDetailHutang(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hutang;
