import React, { useEffect, useState } from "react";
import "./PesananPetugasC.css";
import API from "../../api";
import { FaPlus, FaClock, FaShoppingCart, FaUser, FaUserTie, FaBox, FaCheckCircle, FaListAlt } from "react-icons/fa";

const PesananPetugasC = () => {
  const [petugasC, setPetugasC] = useState({
    data: [],
    current_page: 1,
    last_page: 1,
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFormPetugasD, setShowFormPetugasD] = useState(false);
  const [selectedPesanan, setSelectedPesanan] = useState(null);
  const [penjahitList, setPenjahitList] = useState([]);
  const [aksesorisList, setAksesorisList] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");

  const [newData, setNewData] = useState({
    penjahit_id: "",
    detail_pesanan: [],
  });
  const [newDataPetugasD, setNewDataPetugasD] = useState({
    petugas_c_id: "",
    barcode: [],
    bukti_nota: null,
  });

  useEffect(() => {
    const fetchPetugasC = async () => {
      try {
        setLoading(true);
        const response = await API.get("/petugas-c");
        setPetugasC(response.data);
      } catch (error) {
        setError("Gagal mengambil data");
      } finally {
        setLoading(false);
      }
    };
    fetchPetugasC();
  }, []);

  const handleOpenModal = (item) => {
    setSelectedPesanan(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPesanan(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("User tidak ditemukan. Silakan login ulang.");
      return;
    }

    // Buat payload untuk dikirim ke backend
    const payload = {
      user_id: userId,
      penjahit_id: newData.penjahit_id,
      detail_pesanan: newData.detail_pesanan, // array of { aksesoris_id, jumlah_dipesan }
    };

    console.log("Payload yang dikirim:", payload);
    try {
      const response = await API.post("/petugas-c", payload);

      console.log("Pesanan berhasil disimpan:", response.data);
      alert("Pesanan berhasil disimpan!");

      setPetugasC((prev) => ({
        ...prev,
        data: [...(prev.data || []), response.data],
      }));

      setNewData({
        penjahit_id: "",
        detail_pesanan: [],
      });

      setShowForm(false);
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      alert(error.response?.data?.error || "Gagal menyimpan pesanan.");
    }
  };

  useEffect(() => {
    // Fetch data penjahit
    const fetchPenjahitList = async () => {
      try {
        const response = await API.get("/penjahit"); // Sesuaikan dengan endpoint API penjahit
        // Pastikan response.data adalah array, jika tidak gunakan array kosong
        const data = Array.isArray(response.data) ? response.data : [];
        setPenjahitList(data);
      } catch (error) {
        console.error("Error fetching penjahit list:", error);
        // Set ke array kosong jika error
        setPenjahitList([]);
      }
    };

    // Fetch data aksesoris
    const fetchAksesorisList = async () => {
      try {
        // Fetch semua data tanpa pagination menggunakan parameter all=true
        const response = await API.get("/aksesoris?all=true");
        // Jika all=true, API mengembalikan array langsung, bukan pagination object
        const data = Array.isArray(response.data) ? response.data : [];
        console.log("Aksesoris data fetched:", data.length, "items");
        setAksesorisList(data);
      } catch (error) {
        console.error("Error fetching aksesoris list:", error);
        // Set ke array kosong jika error
        setAksesorisList([]);
      }
    };

    fetchPenjahitList();
    fetchAksesorisList();
  }, []); // Hanya jalankan sekali ketika komponen di-render

  // Fungsi untuk menangani perubahan input
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Menangani perubahan input untuk form utama (penjahit_id, jumlah, harga_satuan, dll)
    if (name !== "detail_pesanan") {
      setNewData({
        ...newData,
        [name]: value,
      });
    }
  };

  // Fungsi untuk menangani perubahan dalam detail pesanan (aksesoris_id, jumlah_dipesan)
  const handleDetailChange = (index, field, value) => {
    const updatedDetails = [...newData.detail_pesanan];
    updatedDetails[index][field] = value;
    setNewData({
      ...newData,
      detail_pesanan: updatedDetails,
    });
  };
  const handleRemoveDetail = (index) => {
    const updatedDetails = newData.detail_pesanan.filter((_, i) => i !== index);
    setNewData({ ...newData, detail_pesanan: updatedDetails });
  };
  const handleAddDetail = () => {
    setNewData({
      ...newData,
      detail_pesanan: [...newData.detail_pesanan, { aksesoris_id: "", jumlah_dipesan: "" }],
    });
  };

  const handlePetugasDFormSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("User tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (newDataPetugasD.barcode.length !== selectedPesanan.jumlah_dipesan) {
      alert(`Jumlah barcode harus sama dengan ${selectedPesanan.jumlah_dipesan}`);
      return;
    }

    const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("petugas_c_id", selectedPesanan.id);

    newDataPetugasD.barcode.forEach((code, index) => {
      formData.append(`barcode[${index}]`, code);
    });

    if (newDataPetugasD.bukti_nota) {
      formData.append("bukti_nota", newDataPetugasD.bukti_nota);
    }

    try {
      const response = await API.post("/verifikasi-aksesoris", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Verifikasi berhasil disimpan:", response.data);
      alert("Verifikasi berhasil disimpan!");

      // reset
      setNewDataPetugasD({
        barcode: [],
        bukti_nota: null,
      });

      setShowFormPetugasD(false);
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      alert(error.response?.data?.error || "Gagal menyimpan verifikasi.");
    }
  };

  const handleOpenPetugasDForm = (petugasC) => {
    if (petugasC.status === "pending") {
      setSelectedPesanan(petugasC);
      setShowFormPetugasD(false);
      setShowFormPetugasD(true);
    }
  };

  const handleBarcodeScan = async () => {
    const scanned = barcodeInput.trim();
    if (!scanned) return;

    try {
      // Cek barcode ke backend
      const res = await API.get(`/cek-barcode/${scanned}`);
      const aksesorisScan = res.data.aksesoris_id;

      // Ambil daftar aksesoris valid dari pesanan
      const aksesorisValid = selectedPesanan.detail_pesanan.map((dp) => dp.aksesoris_id);

      // Jika barcode bukan aksesoris yang dipesan
      if (!aksesorisValid.includes(aksesorisScan)) {
        alert("❌ Barcode ini untuk aksesoris yang berbeda dari pesanan!");
        setBarcodeInput("");
        return;
      }
    } catch (error) {
      alert("❌ Barcode tidak ditemukan di stok aksesoris!");
      setBarcodeInput("");
      return;
    }

    // Barcode valid → masukkan
    if (newDataPetugasD.barcode.includes(scanned)) {
      alert("⚠ Barcode sudah pernah ditambahkan!");
    } else if (newDataPetugasD.barcode.length >= selectedPesanan.jumlah_dipesan) {
      alert("⚠ Jumlah barcode sudah penuh sesuai pesanan!");
    } else {
      setNewDataPetugasD((prev) => ({
        ...prev,
        barcode: [...prev.barcode, scanned],
      }));
    }

    setBarcodeInput(""); // reset
  };

  const fetchPage = async (page) => {
    try {
      setLoading(true);
      const response = await API.get(`petugas-c?page=${page}`);
      setPetugasC(response.data);
      setError(null);
    } catch (error) {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  // Filter dan sort data
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = (petugasC?.data ?? []).filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return item.user?.name?.toLowerCase().includes(searchLower) || item.penjahit?.nama_penjahit?.toLowerCase().includes(searchLower) || item.id?.toString().includes(searchLower);
  });

  // Sort data berdasarkan ID descending (yang baru di atas)
  const sortedData = [...filteredData].sort((a, b) => b.id - a.id);

  return (
    <div className="pesanan-petugas-c-page">
      <div className="pesanan-petugas-c-header">
        <div className="pesanan-petugas-c-header-icon">
          <FaShoppingCart />
        </div>
        <h1>Pembelian Aksesoris CMT</h1>
      </div>

      <div className="pesanan-petugas-c-table-container">
        <div className="pesanan-petugas-c-filter-header">
          <button className="pesanan-petugas-c-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah Pesanan
          </button>
          <div className="pesanan-petugas-c-search-bar">
            <input type="text" placeholder="Cari nama petugas, penjahit, atau ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="pesanan-petugas-c-loading">Memuat data...</div>
        ) : error ? (
          <div className="pesanan-petugas-c-error">{error}</div>
        ) : sortedData.length === 0 ? (
          <div className="pesanan-petugas-c-empty-state">
            <div className="pesanan-petugas-c-empty-state-icon">📦</div>
            <p>Tidak ada data pesanan aksesoris</p>
          </div>
        ) : (
          <div className="pesanan-petugas-c-table-wrapper">
            <table className="pesanan-petugas-c-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Petugas</th>
                  <th>Penjahit</th>
                  <th>Jumlah Barang</th>
                  <th>Total Harga</th>
                  <th>Waktu</th>
                  <th>Pesanan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((petugasC, index) => (
                  <tr key={petugasC.id}>
                    <td>{index + 1}</td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaUser style={{ color: "#0487d8" }} />
                        <strong>{petugasC.user?.name || "Tidak Diketahui"}</strong>
                      </span>
                    </td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaUserTie style={{ color: "#0487d8" }} />
                        {petugasC.penjahit?.nama_penjahit || "Tidak Diketahui"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#0487d8" }}>{petugasC.jumlah_dipesan}</span>
                    </td>
                    <td>
                      <span className="pesanan-petugas-c-price">Rp {Number(petugasC.total_harga).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaClock style={{ color: "#6b7280", fontSize: "12px" }} />
                        {new Date(petugasC.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        {new Date(petugasC.created_at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td>
                      <button className="pesanan-petugas-c-btn-detail" onClick={() => handleOpenModal(petugasC)}>
                        <FaListAlt /> Detail Pesanan
                      </button>
                    </td>
                    <td>
                      {petugasC.status === "pending" ? (
                        <button className="pesanan-petugas-c-btn-verify" onClick={() => handleOpenPetugasDForm(petugasC)}>
                          <FaCheckCircle /> Verifikasi
                        </button>
                      ) : (
                        <span className={`pesanan-petugas-c-status-badge ${petugasC.status}`}>
                          {petugasC.status === "verified" ? (
                            <>
                              <FaCheckCircle /> Verified
                            </>
                          ) : (
                            petugasC.status
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sortedData.length > 0 && (
          <div className="pesanan-petugas-c-pagination">
            <button disabled={petugasC.current_page === 1} onClick={() => fetchPage(petugasC.current_page - 1)}>
              ← Prev
            </button>
            <span>
              Halaman {petugasC.current_page} / {petugasC.last_page}
            </span>
            <button disabled={petugasC.current_page === petugasC.last_page} onClick={() => fetchPage(petugasC.current_page + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedPesanan && (
        <div className="pesanan-petugas-c-modal" onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div className="pesanan-petugas-c-modal-content">
            <h3>
              <FaListAlt /> Detail Pesanan - ID #{selectedPesanan.id}
            </h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Aksesoris</th>
                  <th>Jumlah Dipesan</th>
                </tr>
              </thead>
              <tbody>
                {selectedPesanan.detail_pesanan.map((dp, i) => (
                  <tr key={i}>
                    <td>{dp.aksesoris.id}</td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaBox style={{ color: "#0487d8" }} />
                        {dp.aksesoris.nama_aksesoris}
                      </span>
                    </td>
                    <td>
                      <strong>{dp.jumlah_dipesan}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="pesanan-petugas-c-modal-close" onClick={handleCloseModal}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Form Tambah Pesanan */}
      {showForm && (
        <div className="pesanan-petugas-c-modal" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="pesanan-petugas-c-modal-content">
            <h2>
              <FaPlus /> Tambah Pesanan
            </h2>
            <form onSubmit={handleFormSubmit} className="pesanan-petugas-c-form">
              <div className="pesanan-petugas-c-form-group">
                <label>
                  <FaUser /> Petugas:
                </label>
                <input type="text" value={localStorage.getItem("userId")} disabled readOnly />
              </div>
              <div className="pesanan-petugas-c-form-group">
                <label>
                  <FaUserTie /> Pilih Penjahit:
                </label>
                <select name="penjahit_id" value={newData.penjahit_id} onChange={handleInputChange} required>
                  <option value="">-- Pilih Penjahit --</option>
                  {(Array.isArray(penjahitList) ? penjahitList : []).map((penjahit) => (
                    <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                      {penjahit.nama_penjahit}
                    </option>
                  ))}
                </select>
              </div>

              {/* DETAIL PESANAN */}
              <div className="pesanan-petugas-c-form-group">
                <label>
                  <FaBox /> Detail Pesanan:
                </label>
                {newData.detail_pesanan.map((item, index) => (
                  <div key={index} className="pesanan-petugas-c-detail-item">
                    <div className="pesanan-petugas-c-detail-row">
                      <div className="pesanan-petugas-c-detail-field">
                        <label>Aksesoris:</label>
                        <select name={`aksesoris_id-${index}`} value={item.aksesoris_id} onChange={(e) => handleDetailChange(index, "aksesoris_id", e.target.value)} required>
                          <option value="">-- Pilih Aksesoris --</option>
                          {(Array.isArray(aksesorisList) ? aksesorisList : []).map((aksesoris) => (
                            <option key={aksesoris.id} value={aksesoris.id}>
                              {aksesoris.nama_aksesoris}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="pesanan-petugas-c-detail-field">
                        <label>Jumlah Dipesan:</label>
                        <input type="number" name={`jumlah_dipesan-${index}`} value={item.jumlah_dipesan} onChange={(e) => handleDetailChange(index, "jumlah_dipesan", e.target.value)} placeholder="Masukkan jumlah" min="1" required />
                      </div>

                      <button type="button" onClick={() => handleRemoveDetail(index)} className="pesanan-petugas-c-btn-remove">
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={handleAddDetail} className="pesanan-petugas-c-btn-add-detail">
                  <FaPlus /> Tambah Detail Pesanan
                </button>
              </div>

              <div className="pesanan-petugas-c-form-actions">
                <button type="submit" className="pesanan-petugas-c-btn-submit">
                  <FaCheckCircle /> Simpan
                </button>
                <button type="button" className="pesanan-petugas-c-btn-cancel" onClick={() => setShowForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFormPetugasD && selectedPesanan && (
        <div className="modal">
          <div className="modal-content verif-modal">
            <h2 className="verif-title">Verifikasi Pesanan Aksesoris</h2>

            <div className="verif-section">
              <label className="verif-label">Petugas</label>
              <input type="text" value={localStorage.getItem("userId")} disabled className="verif-input disabled" />
            </div>
            {/* Informasi pesanan */}
            <div className="info-box">
              <p>
                <strong>Penjahit:</strong> {selectedPesanan.penjahit?.nama_penjahit}
              </p>

              <p>
                <strong>Total Item:</strong> {selectedPesanan.jumlah_dipesan}
              </p>

              <p>
                <strong>Detail Aksesoris:</strong>
              </p>
              <ul>
                {selectedPesanan.detail_pesanan.map((dp, index) => (
                  <li key={index}>
                    {dp.aksesoris.nama_aksesoris} — {dp.jumlah_dipesan} pcs
                  </li>
                ))}
              </ul>
            </div>

            <div className="verif-section">
              <label className="verif-label">Scan Barcode</label>

              <input
                type="text"
                className="verif-input"
                placeholder="Scan barcode di sini..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBarcodeScan();
                  }
                }}
                autoFocus
              />

              <small className="hint-text">Arahkan scanner ke input ini dan tekan Enter setelah scan.</small>
            </div>

            {/* PROGRESS */}
            <div className="progress-container">
              <div className="progress-info">
                {newDataPetugasD.barcode.length} dari {selectedPesanan.jumlah_dipesan} barcode
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: (newDataPetugasD.barcode.length / selectedPesanan.jumlah_dipesan) * 100 + "%",
                  }}
                ></div>
              </div>
            </div>

            <div className="verif-section">
              <label className="verif-label">Barcode Masuk</label>

              <div className="barcode-list">
                {newDataPetugasD.barcode.map((code, i) => (
                  <span key={i} className="barcode-chip">
                    {code}
                  </span>
                ))}

                {newDataPetugasD.barcode.length === 0 && <p className="empty-text">Belum ada barcode.</p>}
              </div>
            </div>

            <div className="verif-section">
              <label className="verif-label">Upload Bukti Nota</label>

              <input
                type="file"
                accept="image/*,application/pdf"
                className="verif-input"
                onChange={(e) =>
                  setNewDataPetugasD((prev) => ({
                    ...prev,
                    bukti_nota: e.target.files[0],
                  }))
                }
              />

              <small className="hint-text">Format: JPG, PNG, atau PDF</small>

              {newDataPetugasD.bukti_nota && <p className="file-preview">File dipilih: {newDataPetugasD.bukti_nota.name}</p>}
            </div>

            {/* ACTION BUTTONS */}
            <div className="verif-actions">
              <button
                className={`btn-submit2 ${newDataPetugasD.barcode.length === selectedPesanan.jumlah_dipesan ? "" : "disabled"}`}
                disabled={newDataPetugasD.barcode.length !== selectedPesanan.jumlah_dipesan}
                onClick={handlePetugasDFormSubmit}
              >
                ✔ Verifikasi
              </button>

              <button className="btn-cancel2" onClick={() => setShowFormPetugasD(false)}>
                ✖ Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PesananPetugasC;
