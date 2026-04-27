import React, { useEffect, useRef, useState } from "react";
import "./PesananPetugasC.css";
import API from "../../api";
import {
  FiAlertCircle,
  FiBox,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiHash,
  FiPackage,
  FiPlus,
  FiSearch,
  FiShoppingCart,
  FiTag,
  FiTrash2,
  FiUploadCloud,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

const createInitialCreateForm = () => ({
  penjahit_id: "",
  detail_pesanan: [],
});

const createInitialVerifyForm = () => ({
  petugas_c_id: "",
  barcode: [],
  bukti_nota: null,
});

const formatCurrency = (value) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const tanggal = date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const jam = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${tanggal} ${jam}`;
};

const getStatusMeta = (status) => {
  switch (status) {
    case "pending":
      return {
        label: "Menunggu Verifikasi",
        className: "pending",
      };
    case "verified":
      return {
        label: "Terverifikasi",
        className: "verified",
      };
    case "completed":
      return {
        label: "Selesai",
        className: "completed",
      };
    default:
      return {
        label: status || "Tidak Diketahui",
        className: "neutral",
      };
  }
};

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
  const [spkCmtList, setSpkCmtList] = useState([]);
  const [aksesorisList, setAksesorisList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeDebounceRef = useRef(null);
  const barcodeInputRef = useRef("");

  const [newData, setNewData] = useState(createInitialCreateForm);
  const [newDataPetugasD, setNewDataPetugasD] = useState(createInitialVerifyForm);

  const pageData = Array.isArray(petugasC?.data) ? petugasC.data : [];
  const searchLower = searchTerm.trim().toLowerCase();
  const filteredData = pageData.filter((item) => {
    const petugasName = item.user?.name?.toLowerCase() || "";
    const penjahitName = item.penjahit?.nama_penjahit?.toLowerCase() || "";
    const spkName = item.spk_cmt?.nomor_seri?.toLowerCase() || "";
    const orderId = String(item.id || "");

    return (
      petugasName.includes(searchLower) ||
      penjahitName.includes(searchLower) ||
      spkName.includes(searchLower) ||
      orderId.includes(searchLower)
    );
  });
  const sortedData = [...filteredData].sort((a, b) => b.id - a.id);
  const selectedDetailPesanan = Array.isArray(selectedPesanan?.detail_pesanan) ? selectedPesanan.detail_pesanan : [];
  const selectedPenjahit = penjahitList.find((item) => String(item.id_penjahit) === String(newData.penjahit_id));
  const relatedSpkForPenjahit = spkCmtList.filter((item) => String(item.penjahit?.id_penjahit || item.id_penjahit || "") === String(newData.penjahit_id));
  const resolvedSpkCmt = relatedSpkForPenjahit[0] || null;

  const pendingCount = pageData.filter((item) => item.status === "pending").length;
  const verifiedCount = pageData.filter((item) => item.status === "verified").length;
  const completedCount = pageData.filter((item) => item.status === "completed").length;
  const totalItemCount = pageData.reduce((sum, item) => sum + Number(item.jumlah_dipesan || 0), 0);
  const totalNilaiPesanan = pageData.reduce((sum, item) => sum + Number(item.total_harga || 0), 0);
  const filteredNilaiPesanan = sortedData.reduce((sum, item) => sum + Number(item.total_harga || 0), 0);
  const progressTarget = Number(selectedPesanan?.jumlah_dipesan || 0);
  const progressCurrent = newDataPetugasD.barcode.length;
  const progressPercentage = progressTarget > 0 ? Math.min(100, (progressCurrent / progressTarget) * 100) : 0;

  const fetchPage = async (page) => {
    try {
      setLoading(true);
      const response = await API.get(`petugas-c?page=${page}`);
      setPetugasC(response.data);
      setError(null);
    } catch (fetchError) {
      setError("Gagal mengambil data pesanan aksesoris.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  useEffect(() => {
    const fetchPenjahitList = async () => {
      try {
        const response = await API.get("/penjahit");
        setPenjahitList(Array.isArray(response.data) ? response.data : []);
      } catch (fetchError) {
        console.error("Error fetching penjahit list:", fetchError);
        setPenjahitList([]);
      }
    };

    const fetchAksesorisList = async () => {
      try {
        const response = await API.get("/aksesoris?all=true");
        setAksesorisList(Array.isArray(response.data) ? response.data : []);
      } catch (fetchError) {
        console.error("Error fetching aksesoris list:", fetchError);
        setAksesorisList([]);
      }
    };

    const fetchSpkCmtList = async () => {
      try {
        const response = await API.get("/spkcmt", {
          params: {
            allData: "true",
          },
        });

        let data = [];
        if (response.data?.spk) {
          if (Array.isArray(response.data.spk)) {
            data = response.data.spk;
          } else if (Array.isArray(response.data.spk.data)) {
            data = response.data.spk.data;
          }
        }

        setSpkCmtList(data);
      } catch (fetchError) {
        console.error("Error fetching SPK CMT list:", fetchError);
        setSpkCmtList([]);
      }
    };

    fetchPenjahitList();
    fetchSpkCmtList();
    fetchAksesorisList();
  }, []);

  useEffect(() => {
    return () => {
      if (barcodeDebounceRef.current) {
        clearTimeout(barcodeDebounceRef.current);
      }
    };
  }, []);

  const resetCreateForm = () => {
    setNewData(createInitialCreateForm());
  };

  const resetVerifyForm = () => {
    setNewDataPetugasD(createInitialVerifyForm());
    setBarcodeInput("");
    barcodeInputRef.current = "";
    if (barcodeDebounceRef.current) {
      clearTimeout(barcodeDebounceRef.current);
    }
  };

  const handleOpenCreateForm = () => {
    resetCreateForm();
    setShowForm(true);
  };

  const handleCloseCreateForm = () => {
    setShowForm(false);
    resetCreateForm();
  };

  const handleOpenModal = (item) => {
    setSelectedPesanan(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPesanan(null);
  };

  const handleClosePetugasDForm = () => {
    setShowFormPetugasD(false);
    setSelectedPesanan(null);
    resetVerifyForm();
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("User tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (!resolvedSpkCmt?.id_spk) {
      alert("CMT yang dipilih belum memiliki referensi SPK CMT. Silakan pilih CMT lain atau buat SPK CMT terlebih dahulu.");
      return;
    }

    const payload = {
      user_id: userId,
      spk_cmt_id: resolvedSpkCmt.id_spk,
      detail_pesanan: newData.detail_pesanan,
    };

    try {
      await API.post("/petugas-c", payload);
      alert("Pesanan berhasil disimpan.");
      await fetchPage(1);
      handleCloseCreateForm();
    } catch (submitError) {
      console.error("Error:", submitError.response?.data || submitError.message);
      alert(submitError.response?.data?.error || "Gagal menyimpan pesanan.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setNewData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDetailChange = (index, field, value) => {
    setNewData((prev) => {
      const updatedDetails = [...prev.detail_pesanan];
      updatedDetails[index] = {
        ...updatedDetails[index],
        [field]: value,
      };

      return {
        ...prev,
        detail_pesanan: updatedDetails,
      };
    });
  };

  const handleRemoveDetail = (index) => {
    setNewData((prev) => ({
      ...prev,
      detail_pesanan: prev.detail_pesanan.filter((_, detailIndex) => detailIndex !== index),
    }));
  };

  const handleAddDetail = () => {
    setNewData((prev) => ({
      ...prev,
      detail_pesanan: [
        ...prev.detail_pesanan,
        {
          aksesoris_id: "",
          jumlah_dipesan: "",
        },
      ],
    }));
  };

  const handleOpenPetugasDForm = (item) => {
    if (item.status !== "pending") return;

    setSelectedPesanan(item);
    setNewDataPetugasD({
      ...createInitialVerifyForm(),
      petugas_c_id: String(item.id || ""),
    });
    setBarcodeInput("");
    barcodeInputRef.current = "";
    setShowFormPetugasD(true);
  };

  const handlePetugasDFormSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("User tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (newDataPetugasD.barcode.length !== progressTarget) {
      alert(`Jumlah barcode harus sama dengan ${progressTarget}.`);
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
      await API.post("/verifikasi-aksesoris", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Verifikasi berhasil disimpan.");
      await fetchPage(1);
      handleClosePetugasDForm();
    } catch (submitError) {
      console.error("Error:", submitError.response?.data || submitError.message);
      alert(submitError.response?.data?.error || "Gagal menyimpan verifikasi.");
    }
  };

  const handleRemoveBarcode = (index) => {
    setNewDataPetugasD((prev) => ({
      ...prev,
      barcode: prev.barcode.filter((_, barcodeIndex) => barcodeIndex !== index),
    }));
  };

  const handleBarcodeScan = async (overrideValue) => {
    const scanned = (overrideValue || barcodeInputRef.current).trim();
    if (!scanned || !selectedPesanan) return;

    try {
      const response = await API.get(`/cek-barcode/${scanned}`);
      const aksesorisScan = Number(response.data.aksesoris_id);
      const aksesorisValid = selectedDetailPesanan.map((detail) => Number(detail.aksesoris_id ?? detail.aksesoris?.id));

      if (!aksesorisValid.includes(aksesorisScan)) {
        alert("Barcode ini untuk aksesoris yang berbeda dari pesanan.");
        setBarcodeInput("");
        barcodeInputRef.current = "";
        return;
      }

      if (response.data.barcode_status && response.data.barcode_status !== "tersedia") {
        alert(`Barcode ini sudah pernah dipakai. Status saat ini: ${response.data.barcode_status}`);
        setBarcodeInput("");
        barcodeInputRef.current = "";
        return;
      }
    } catch (scanError) {
      const errMsg = scanError.response?.data?.message || "Barcode tidak ditemukan di stok aksesoris.";
      console.error("Cek barcode error:", scanError.response?.status, errMsg);
      alert(errMsg);
      setBarcodeInput("");
      barcodeInputRef.current = "";
      return;
    }

    if (newDataPetugasD.barcode.includes(scanned)) {
      alert("Barcode sudah pernah ditambahkan.");
    } else if (newDataPetugasD.barcode.length >= progressTarget) {
      alert("Jumlah barcode sudah penuh sesuai pesanan.");
    } else {
      setNewDataPetugasD((prev) => ({
        ...prev,
        barcode: [...prev.barcode, scanned],
      }));
    }

    setBarcodeInput("");
    barcodeInputRef.current = "";
  };

  return (
    <div className="ppc-page">
      <div className="ppc-workspace">
        <header className="ppc-header">
          <div className="ppc-header-main">
            <span className="ppc-module-pill">Aksesoris ERP Desk</span>
            <div className="ppc-title-row">
              <div className="ppc-brand-icon">
                <FiShoppingCart />
              </div>
              <div className="ppc-title-copy">
                <h1>Pembelian Aksesoris CMT</h1>
                <p>Kontrol pembelian aksesoris per CMT, verifikasi barcode, dan pelacakan nilai pesanan dalam satu workspace.</p>
              </div>
            </div>
          </div>

          <div className="ppc-header-actions">
            <label className="ppc-search" aria-label="Cari pesanan">
              <FiSearch />
              <input
                type="text"
                placeholder="Cari petugas, CMT, nomor SPK, atau ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>

            <button type="button" className="ppc-btn-primary" onClick={handleOpenCreateForm}>
              <FiPlus />
              Tambah Pesanan
            </button>
          </div>
        </header>

        <section className="ppc-stats-grid">
          <article className="ppc-stat-card">
            <div className="ppc-stat-icon tone-indigo">
              <FiFileText />
            </div>
            <div className="ppc-stat-content">
              <span className="ppc-stat-label">Pesanan Halaman Ini</span>
              <strong className="ppc-stat-value">{pageData.length}</strong>
              <span className="ppc-stat-note">{sortedData.length} terlihat di tabel saat ini</span>
            </div>
          </article>

          <article className="ppc-stat-card">
            <div className="ppc-stat-icon tone-amber">
              <FiClock />
            </div>
            <div className="ppc-stat-content">
              <span className="ppc-stat-label">Menunggu Verifikasi</span>
              <strong className="ppc-stat-value">{pendingCount}</strong>
              <span className="ppc-stat-note">Verified: {verifiedCount} | Selesai: {completedCount}</span>
            </div>
          </article>

          <article className="ppc-stat-card">
            <div className="ppc-stat-icon tone-cyan">
              <FiPackage />
            </div>
            <div className="ppc-stat-content">
              <span className="ppc-stat-label">Total Item Dipesan</span>
              <strong className="ppc-stat-value">{totalItemCount}</strong>
              <span className="ppc-stat-note">Akumulasi item pada halaman aktif</span>
            </div>
          </article>

          <article className="ppc-stat-card">
            <div className="ppc-stat-icon tone-emerald">
              <FiTag />
            </div>
            <div className="ppc-stat-content">
              <span className="ppc-stat-label">Nilai Pembelian</span>
              <strong className="ppc-stat-value ppc-stat-value--currency">{formatCurrency(totalNilaiPesanan)}</strong>
              <span className="ppc-stat-note">Tersaring: {formatCurrency(filteredNilaiPesanan)}</span>
            </div>
          </article>
        </section>

        <section className="ppc-panel">
          <div className="ppc-panel-header">
            <div className="ppc-panel-heading">
              <span className="ppc-panel-eyebrow">Operational Queue</span>
              <h2>Daftar Pembelian Aksesoris</h2>
              <p>Ringkas, cepat dipindai, dan fokus pada informasi yang dibutuhkan tim operasional setiap hari.</p>
            </div>

            <div className="ppc-chip-row">
              <span className="ppc-chip">Page {petugasC.current_page} / {petugasC.last_page}</span>
              <span className="ppc-chip">Results {sortedData.length}</span>
              {searchTerm.trim() && <span className="ppc-chip ppc-chip--highlight">Filter aktif</span>}
            </div>
          </div>

          {loading ? (
            <div className="ppc-state-card">
              <div className="ppc-state-icon">
                <FiClock />
              </div>
              <strong>Memuat data pesanan</strong>
              <p>Sistem sedang menyiapkan daftar pembelian aksesoris terbaru.</p>
            </div>
          ) : error ? (
            <div className="ppc-state-card error">
              <div className="ppc-state-icon">
                <FiAlertCircle />
              </div>
              <strong>Data belum bisa ditampilkan</strong>
              <p>{error}</p>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="ppc-state-card empty">
              <div className="ppc-state-icon">
                <FiBox />
              </div>
              <strong>{searchTerm.trim() ? "Tidak ada hasil yang cocok" : "Belum ada data pesanan"}</strong>
              <p>
                {searchTerm.trim()
                  ? `Tidak ditemukan data untuk kata kunci "${searchTerm}".`
                  : "Mulai dengan membuat pesanan aksesoris baru untuk CMT."}
              </p>
            </div>
          ) : (
            <>
              <div className="ppc-table-shell">
                <table className="ppc-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Petugas</th>
                      <th>CMT</th>
                      <th>Jumlah</th>
                      <th>Total Harga</th>
                      <th>Waktu</th>
                      <th>Detail</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((item, index) => {
                      const statusMeta = getStatusMeta(item.status);

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="ppc-number-cell">
                              <span className="ppc-number-pill">{index + 1}</span>
                            </div>
                          </td>
                          <td>
                            <div className="ppc-info-cell">
                              <span className="ppc-info-icon">
                                <FiUser />
                              </span>
                              <div>
                                <strong className="ppc-cell-primary">{item.user?.name || "Tidak Diketahui"}</strong>
                                <span className="ppc-cell-secondary">Order ID #{item.id}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="ppc-info-cell">
                              <span className="ppc-info-icon">
                                <FiUsers />
                              </span>
                              <div>
                                <strong className="ppc-cell-primary">{item.penjahit?.nama_penjahit || "Tidak Diketahui"}</strong>
                                <span className="ppc-cell-secondary">
                                  {item.spk_cmt?.nomor_seri ? `SPK ${item.spk_cmt.nomor_seri}` : "Tanpa referensi SPK"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="ppc-quantity-cell">
                              <strong>{item.jumlah_dipesan}</strong>
                              <span>pcs</span>
                            </div>
                          </td>
                          <td>
                            <strong className="ppc-money">{formatCurrency(item.total_harga)}</strong>
                          </td>
                          <td>
                            <div className="ppc-time-cell">
                              <FiClock />
                              <span>{formatDateTime(item.created_at)}</span>
                            </div>
                          </td>
                          <td>
                            <button type="button" className="ppc-btn-secondary ppc-btn-secondary--sm" onClick={() => handleOpenModal(item)}>
                              <FiFileText />
                              Lihat Detail
                            </button>
                          </td>
                          <td>
                            {item.status === "pending" ? (
                              <button type="button" className="ppc-btn-primary ppc-btn-primary--sm" onClick={() => handleOpenPetugasDForm(item)}>
                                <FiCheckCircle />
                                Verifikasi
                              </button>
                            ) : (
                              <span className={`ppc-status-badge ${statusMeta.className}`}>
                                <span className="ppc-status-dot" />
                                {statusMeta.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="ppc-pagination">
                <div className="ppc-pagination-info">
                  Menampilkan {sortedData.length} dari {pageData.length} data pada halaman ini.
                </div>
                <div className="ppc-pagination-actions">
                  <button
                    type="button"
                    className="ppc-btn-secondary"
                    disabled={petugasC.current_page === 1}
                    onClick={() => fetchPage(petugasC.current_page - 1)}
                  >
                    Sebelumnya
                  </button>
                  <span className="ppc-pagination-indicator">
                    Halaman {petugasC.current_page} / {petugasC.last_page}
                  </span>
                  <button
                    type="button"
                    className="ppc-btn-secondary"
                    disabled={petugasC.current_page === petugasC.last_page}
                    onClick={() => fetchPage(petugasC.current_page + 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {showModal && selectedPesanan && (
        <div className="ppc-modal" onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div className="ppc-modal-card ppc-modal-card--detail">
            <div className="ppc-modal-header">
              <div>
                <span className="ppc-panel-eyebrow">Detail Pesanan</span>
                <h3>Order #{selectedPesanan.id}</h3>
                <p>Rincian item aksesoris yang dipesan untuk CMT terpilih.</p>
              </div>
              <button type="button" className="ppc-icon-button" onClick={handleCloseModal} aria-label="Tutup detail">
                <FiX />
              </button>
            </div>

            <div className="ppc-overview-grid">
              <div className="ppc-overview-item">
                <span className="ppc-overview-label">Petugas</span>
                <strong className="ppc-overview-value">{selectedPesanan.user?.name || "Tidak Diketahui"}</strong>
              </div>
              <div className="ppc-overview-item">
                <span className="ppc-overview-label">CMT</span>
                <strong className="ppc-overview-value">{selectedPesanan.penjahit?.nama_penjahit || "Tidak Diketahui"}</strong>
              </div>
              <div className="ppc-overview-item">
                <span className="ppc-overview-label">Kode SPK</span>
                <strong className="ppc-overview-value">{selectedPesanan.spk_cmt?.nomor_seri || "-"}</strong>
              </div>
              <div className="ppc-overview-item">
                <span className="ppc-overview-label">Total Item</span>
                <strong className="ppc-overview-value">{selectedPesanan.jumlah_dipesan || 0} pcs</strong>
              </div>
              <div className="ppc-overview-item">
                <span className="ppc-overview-label">Nilai Pesanan</span>
                <strong className="ppc-overview-value">{formatCurrency(selectedPesanan.total_harga)}</strong>
              </div>
              <div className="ppc-overview-item">
                <span className="ppc-overview-label">Status</span>
                <span className={`ppc-status-badge ${getStatusMeta(selectedPesanan.status).className}`}>
                  <span className="ppc-status-dot" />
                  {getStatusMeta(selectedPesanan.status).label}
                </span>
              </div>
            </div>

            <div className="ppc-detail-table-wrap">
              <table className="ppc-detail-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nama Aksesoris</th>
                    <th>Jumlah Dipesan</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDetailPesanan.map((detail, index) => (
                    <tr key={`${detail.aksesoris?.id || index}-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="ppc-info-cell">
                          <span className="ppc-info-icon">
                            <FiBox />
                          </span>
                          <div>
                            <strong className="ppc-cell-primary">{detail.aksesoris?.nama_aksesoris || "Tidak Diketahui"}</strong>
                            <span className="ppc-cell-secondary">ID item #{detail.aksesoris?.id || "-"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{detail.jumlah_dipesan}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ppc-modal-footer">
              <button type="button" className="ppc-btn-secondary" onClick={handleCloseModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="ppc-modal" onClick={(e) => e.target === e.currentTarget && handleCloseCreateForm()}>
          <div className="ppc-modal-card ppc-modal-card--wide">
            <div className="ppc-modal-header">
              <div>
                <span className="ppc-panel-eyebrow">Form Pesanan Baru</span>
                <h3>Tambah Pembelian Aksesoris</h3>
                <p>Pilih CMT tujuan, lalu susun daftar item aksesoris yang akan dipesan.</p>
              </div>
              <button type="button" className="ppc-icon-button" onClick={handleCloseCreateForm} aria-label="Tutup form">
                <FiX />
              </button>
            </div>

            <form className="ppc-form" onSubmit={handleFormSubmit}>
              <section className="ppc-form-section">
                <div className="ppc-form-section-head">
                  <div>
                    <h4>Informasi Permintaan</h4>
                    <p>Data dasar transaksi pembelian aksesoris untuk tim CMT.</p>
                  </div>
                  <div className="ppc-chip-row">
                    <span className="ppc-chip">Detail {newData.detail_pesanan.length}</span>
                    {selectedPenjahit && <span className="ppc-chip ppc-chip--highlight">{selectedPenjahit.nama_penjahit}</span>}
                    {resolvedSpkCmt?.nomor_seri && <span className="ppc-chip">SPK {resolvedSpkCmt.nomor_seri}</span>}
                  </div>
                </div>

                <div className="ppc-form-grid">
                  <label className="ppc-form-field">
                    <span>Petugas</span>
                    <div className="ppc-input-shell is-disabled">
                      <FiUser />
                      <input type="text" value={localStorage.getItem("userId") || "-"} disabled readOnly />
                    </div>
                  </label>

                  <label className="ppc-form-field">
                    <span>Pilih CMT</span>
                    <div className="ppc-input-shell">
                      <FiUsers />
                      <select name="penjahit_id" value={newData.penjahit_id} onChange={handleInputChange} required>
                        <option value="">-- Pilih CMT --</option>
                        {(Array.isArray(penjahitList) ? penjahitList : []).map((penjahit) => (
                          <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                            {penjahit.nama_penjahit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>

                {selectedPenjahit && (
                  <div className="ppc-inline-note">
                    <FiFileText />
                    <div>
                      <strong>
                        {resolvedSpkCmt?.nomor_seri
                          ? `Referensi SPK otomatis: ${resolvedSpkCmt.nomor_seri}`
                          : "Referensi SPK belum ditemukan"}
                      </strong>
                      <p>
                        {resolvedSpkCmt?.nomor_seri
                          ? relatedSpkForPenjahit.length > 1
                            ? `Sistem memakai SPK CMT terbaru untuk ${selectedPenjahit.nama_penjahit} karena pilihan di form hanya berdasarkan CMT.`
                            : `Pesanan ini akan dikaitkan ke SPK CMT milik ${selectedPenjahit.nama_penjahit}.`
                          : `CMT ${selectedPenjahit.nama_penjahit} belum memiliki SPK CMT yang bisa dipakai untuk menyimpan pesanan.`}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section className="ppc-form-section">
                <div className="ppc-form-section-head">
                  <div>
                    <h4>Detail Item Aksesoris</h4>
                    <p>Tambahkan item sesuai kebutuhan pembelian untuk CMT yang dipilih.</p>
                  </div>
                  <button type="button" className="ppc-btn-primary ppc-btn-primary--sm" onClick={handleAddDetail}>
                    <FiPlus />
                    Tambah Baris
                  </button>
                </div>

                {newData.detail_pesanan.length === 0 ? (
                  <div className="ppc-inline-empty">
                    <FiPackage />
                    <div>
                      <strong>Belum ada item pesanan</strong>
                      <p>Tambahkan minimal satu detail aksesoris sebelum menyimpan transaksi.</p>
                    </div>
                  </div>
                ) : (
                  <div className="ppc-detail-list">
                    {newData.detail_pesanan.map((item, index) => (
                      <article key={`detail-${index}`} className="ppc-detail-card">
                        <div className="ppc-detail-card-head">
                          <div>
                            <span className="ppc-detail-index">Item {index + 1}</span>
                            <p>Susun item aksesoris dan jumlah pesan untuk transaksi ini.</p>
                          </div>
                          <button type="button" className="ppc-btn-danger" onClick={() => handleRemoveDetail(index)}>
                            <FiTrash2 />
                            Hapus
                          </button>
                        </div>

                        <div className="ppc-detail-grid">
                          <label className="ppc-form-field">
                            <span>Aksesoris</span>
                            <div className="ppc-input-shell">
                              <FiBox />
                              <select
                                name={`aksesoris_id-${index}`}
                                value={item.aksesoris_id}
                                onChange={(e) => handleDetailChange(index, "aksesoris_id", e.target.value)}
                                required
                              >
                                <option value="">-- Pilih Aksesoris --</option>
                                {(Array.isArray(aksesorisList) ? aksesorisList : []).map((aksesoris) => (
                                  <option key={aksesoris.id} value={aksesoris.id}>
                                    {aksesoris.nama_aksesoris}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </label>

                          <label className="ppc-form-field">
                            <span>Jumlah Dipesan</span>
                            <div className="ppc-input-shell">
                              <FiHash />
                              <input
                                type="number"
                                min="1"
                                placeholder="Masukkan jumlah"
                                value={item.jumlah_dipesan}
                                onChange={(e) => handleDetailChange(index, "jumlah_dipesan", e.target.value)}
                                required
                              />
                            </div>
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <div className="ppc-modal-footer">
                <button type="button" className="ppc-btn-secondary" onClick={handleCloseCreateForm}>
                  Batal
                </button>
                <button type="submit" className="ppc-btn-primary">
                  <FiCheckCircle />
                  Simpan Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFormPetugasD && selectedPesanan && (
        <div className="ppc-modal" onClick={(e) => e.target === e.currentTarget && handleClosePetugasDForm()}>
          <div className="ppc-modal-card ppc-modal-card--verify">
            <div className="ppc-modal-header">
              <div>
                <span className="ppc-panel-eyebrow">Verifikasi Operasional</span>
                <h3>Verifikasi Pesanan Aksesoris</h3>
                <p>Validasi barcode masuk dan lampirkan bukti nota sebelum transaksi diselesaikan.</p>
              </div>
              <button type="button" className="ppc-icon-button" onClick={handleClosePetugasDForm} aria-label="Tutup verifikasi">
                <FiX />
              </button>
            </div>

            <form className="ppc-verify-layout" onSubmit={handlePetugasDFormSubmit}>
              <aside className="ppc-summary-panel">
                <div className="ppc-summary-card">
                  <span className="ppc-summary-label">Petugas</span>
                  <strong>{localStorage.getItem("userId") || "-"}</strong>
                </div>

                <div className="ppc-summary-card">
                  <span className="ppc-summary-label">CMT</span>
                  <strong>{selectedPesanan.penjahit?.nama_penjahit || "Tidak Diketahui"}</strong>
                  <small>{selectedPesanan.spk_cmt?.nomor_seri ? `SPK ${selectedPesanan.spk_cmt.nomor_seri}` : "Tanpa referensi SPK"}</small>
                </div>

                <div className="ppc-summary-card">
                  <span className="ppc-summary-label">Target Scan</span>
                  <strong>{progressTarget} barcode</strong>
                  <small>Total item yang harus tervalidasi</small>
                </div>

                <div className="ppc-summary-card">
                  <span className="ppc-summary-label">Daftar Item</span>
                  <ul className="ppc-summary-list">
                    {selectedDetailPesanan.map((detail, index) => (
                      <li key={`summary-${index}`}>
                        <span>{detail.aksesoris?.nama_aksesoris || "Aksesoris"}</span>
                        <strong>{detail.jumlah_dipesan} pcs</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>

              <div className="ppc-verify-main">
                <section className="ppc-form-section">
                  <div className="ppc-form-section-head">
                    <div>
                      <h4>Scanner Barcode</h4>
                      <p>Arahkan scanner ke field ini. Setiap barcode akan diproses otomatis.</p>
                    </div>
                  </div>

                  <label className="ppc-form-field">
                    <span>Input Barcode</span>
                    <div className="ppc-input-shell">
                      <FiPackage />
                      <input
                        type="text"
                        placeholder="Scan barcode di sini..."
                        value={barcodeInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBarcodeInput(val);
                          barcodeInputRef.current = val;

                          if (barcodeDebounceRef.current) {
                            clearTimeout(barcodeDebounceRef.current);
                          }

                          if (val.trim()) {
                            const capturedVal = val;
                            barcodeDebounceRef.current = setTimeout(() => {
                              handleBarcodeScan(capturedVal);
                            }, 300);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (barcodeDebounceRef.current) {
                              clearTimeout(barcodeDebounceRef.current);
                            }
                            handleBarcodeScan();
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  </label>

                  <div className="ppc-progress-block">
                    <div className="ppc-progress-head">
                      <span>Progress Verifikasi</span>
                      <strong>
                        {progressCurrent} / {progressTarget}
                      </strong>
                    </div>
                    <div className="ppc-progress-bar">
                      <div className="ppc-progress-fill" style={{ width: `${progressPercentage}%` }} />
                    </div>
                    <p className="ppc-progress-note">Sistem akan mengaktifkan tombol verifikasi setelah jumlah scan terpenuhi.</p>
                  </div>
                </section>

                <section className="ppc-form-section">
                  <div className="ppc-form-section-head">
                    <div>
                      <h4>Barcode Terbaca</h4>
                      <p>Pastikan daftar barcode sesuai item fisik yang diterima.</p>
                    </div>
                  </div>

                  <div className="ppc-chip-list">
                    {newDataPetugasD.barcode.length > 0 ? (
                      newDataPetugasD.barcode.map((code, index) => (
                        <span key={`${code}-${index}`} className="ppc-barcode-chip">
                          <span>{code}</span>
                          <button type="button" onClick={() => handleRemoveBarcode(index)} aria-label={`Hapus barcode ${code}`}>
                            <FiX />
                          </button>
                        </span>
                      ))
                    ) : (
                      <div className="ppc-inline-empty ppc-inline-empty--compact">
                        <FiPackage />
                        <div>
                          <strong>Belum ada barcode yang masuk</strong>
                          <p>Scan barcode satu per satu sampai target terpenuhi.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="ppc-form-section">
                  <div className="ppc-form-section-head">
                    <div>
                      <h4>Lampiran Nota</h4>
                      <p>Unggah bukti pembelian untuk dokumentasi dan audit operasional.</p>
                    </div>
                  </div>

                  <label className="ppc-form-field">
                    <span>Upload Bukti Nota</span>
                    <div className="ppc-input-shell ppc-input-shell--file">
                      <FiUploadCloud />
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setNewDataPetugasD((prev) => ({
                            ...prev,
                            bukti_nota: e.target.files?.[0] || null,
                          }))
                        }
                      />
                    </div>
                  </label>

                  <div className="ppc-upload-note">
                    <FiFileText />
                    <div>
                      <strong>Format dokumen</strong>
                      <p>Gunakan JPG, PNG, atau PDF agar proses verifikasi tetap rapi.</p>
                    </div>
                  </div>

                  {newDataPetugasD.bukti_nota && <p className="ppc-file-preview">File dipilih: {newDataPetugasD.bukti_nota.name}</p>}
                </section>

                <div className="ppc-modal-footer">
                  <button type="button" className="ppc-btn-secondary" onClick={handleClosePetugasDForm}>
                    Batal
                  </button>
                  <button type="submit" className="ppc-btn-primary" disabled={progressCurrent !== progressTarget}>
                    <FiCheck />
                    Verifikasi Pesanan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PesananPetugasC;
