import React, { useEffect, useRef, useState } from "react";
import "./KodeSeriBelumDikerjakanOptimized.css";
import "./PesananPetugasC.css";
import API from "../../api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import {
  FiBox,
  FiCheck,
  FiCheckCircle,
  FiFileText,
  FiPlus,
  FiSearch,
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
      return { label: "Menunggu Verifikasi", className: "pending" };
    case "verified":
      return { label: "Terverifikasi", className: "verified" };
    case "completed":
      return { label: "Selesai", className: "completed" };
    default:
      return { label: status || "Tidak Diketahui", className: "neutral" };
  }
};

const PesananPetugasC = () => {
  const [petugasC, setPetugasC] = useState({
    data: [],
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFormPetugasD, setShowFormPetugasD] = useState(false);
  const [selectedPesanan, setSelectedPesanan] = useState(null);
  const [penjahitList, setPenjahitList] = useState([]);
  const [aksesorisList, setAksesorisList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeDebounceRef = useRef(null);
  const barcodeInputRef = useRef("");

  const [newData, setNewData] = useState(createInitialCreateForm);
  const [newDataPetugasD, setNewDataPetugasD] = useState(createInitialVerifyForm);

  const showSuccessAlert = (title, text) =>
    Swal.fire({
      icon: "success",
      title,
      text,
      timer: 1800,
      showConfirmButton: false,
      timerProgressBar: true,
    });

  const showErrorAlert = (title, text) =>
    Swal.fire({
      icon: "error",
      title,
      text,
      confirmButtonText: "Mengerti",
      confirmButtonColor: "#2563eb",
    });

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
  const progressTarget = Number(selectedPesanan?.jumlah_dipesan || 0);
  const progressCurrent = newDataPetugasD.barcode.length;

  const fetchPage = async (page) => {
    try {
      setLoading(true);
      const response = await API.get(`petugas-c?page=${page}&per_page=50`);
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
        setPenjahitList([]);
      }
    };

    const fetchAksesorisList = async () => {
      try {
        const response = await API.get("/aksesoris?all=true");
        setAksesorisList(Array.isArray(response.data) ? response.data : []);
      } catch (fetchError) {
        setAksesorisList([]);
      }
    };

    fetchPenjahitList();
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
      await showErrorAlert("Sesi Berakhir", "User tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (newData.detail_pesanan.length === 0) {
      await showErrorAlert("Detail Kosong", "Tambahkan minimal satu item aksesoris sebelum menyimpan.");
      return;
    }

    const payload = {
      user_id: userId,
      penjahit_id: newData.penjahit_id,
      detail_pesanan: newData.detail_pesanan,
    };

    try {
      await API.post("/petugas-c", payload);
      await fetchPage(1);
      handleCloseCreateForm();
      await showSuccessAlert("Berhasil", "Pesanan aksesoris berhasil disimpan.");
    } catch (submitError) {
      await showErrorAlert("Gagal Menyimpan", submitError.response?.data?.error || "Gagal menyimpan pesanan.");
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
      await showErrorAlert("Sesi Berakhir", "User tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (newDataPetugasD.barcode.length !== progressTarget) {
      await showErrorAlert("Barcode Belum Lengkap", `Jumlah barcode harus sama dengan ${progressTarget}.`);
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

      await fetchPage(1);
      handleClosePetugasDForm();
      await showSuccessAlert("Berhasil", "Verifikasi berhasil disimpan.");
    } catch (submitError) {
      await showErrorAlert("Gagal Verifikasi", submitError.response?.data?.error || "Gagal menyimpan verifikasi.");
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
        await showErrorAlert("Barcode Tidak Sesuai", "Barcode ini untuk aksesoris yang berbeda dari pesanan.");
        setBarcodeInput("");
        barcodeInputRef.current = "";
        return;
      }

      if (response.data.barcode_status && response.data.barcode_status !== "tersedia") {
        await showErrorAlert("Barcode Sudah Dipakai", `Barcode ini sudah pernah dipakai. Status saat ini: ${response.data.barcode_status}`);
        setBarcodeInput("");
        barcodeInputRef.current = "";
        return;
      }
    } catch (scanError) {
      const errMsg = scanError.response?.data?.message || "Barcode tidak ditemukan di stok aksesoris.";
      await showErrorAlert("Barcode Tidak Ditemukan", errMsg);
      setBarcodeInput("");
      barcodeInputRef.current = "";
      return;
    }

    if (newDataPetugasD.barcode.includes(scanned)) {
      await showErrorAlert("Barcode Duplikat", "Barcode sudah pernah ditambahkan.");
    } else if (newDataPetugasD.barcode.length >= progressTarget) {
      await showErrorAlert("Sudah Penuh", "Jumlah barcode sudah penuh sesuai pesanan.");
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
    <div className="ks-page pc-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Pembelian Aksesoris CMT</h1>
          <span className="ks-header-sub">
            {petugasC.total ?? sortedData.length} data ditemukan — Kontrol pembelian aksesoris per CMT dan verifikasi barcode
          </span>
        </div>
      </header>

      <section className="ks-board">
        <div className="ks-toolbar">
          <div className="ks-search">
            <FiSearch className="ks-search-icon" style={{ fontSize: "12px" }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari petugas, CMT, nomor SPK, atau ID..."
            />
            {searchTerm && (
              <button type="button" className="pc-search-clear" onClick={() => setSearchTerm("")}>
                <FiX />
              </button>
            )}
          </div>

          <button className="ks-btn is-primary" type="button" onClick={handleOpenCreateForm}>
            <FiPlus /> Tambah Pesanan
          </button>
        </div>

        <div className="ks-grid-scroll">
          <table className="ks-grid">
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
              {loading ? (
                <tr>
                  <td colSpan="8" className="pc-state-cell">Memuat data pesanan...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="pc-state-cell pc-state-error">{error}</td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="pc-state-cell">
                    {searchTerm.trim() ? `Tidak ditemukan data untuk kata kunci "${searchTerm}".` : "Belum ada data pesanan."}
                  </td>
                </tr>
              ) : (
                sortedData.map((item, index) => {
                  const statusMeta = getStatusMeta(item.status);

                  return (
                    <tr key={item.id}>
                      <td className="ks-cell-num">{index + 1}</td>
                      <td className="ks-cell-code">
                        <strong>{item.user?.name || "Tidak Diketahui"}</strong>
                        <br />
                        <span className="ks-muted">Order #{item.id}</span>
                      </td>
                      <td>
                        {item.penjahit?.nama_penjahit || "Tidak Diketahui"}
                        {item.spk_cmt?.nomor_seri && (
                          <>
                            <br />
                            <span className="ks-muted">SPK {item.spk_cmt.nomor_seri}</span>
                          </>
                        )}
                      </td>
                      <td className="ks-cell-num">{item.jumlah_dipesan} pcs</td>
                      <td>{formatCurrency(item.total_harga)}</td>
                      <td>{formatDateTime(item.created_at)}</td>
                      <td>
                        <button type="button" className="ks-btn" onClick={() => handleOpenModal(item)}>
                          <FiFileText /> Detail
                        </button>
                      </td>
                      <td>
                        {item.status === "pending" ? (
                          <button type="button" className="ks-btn pc-verify-btn" onClick={() => handleOpenPetugasDForm(item)}>
                            <FiCheckCircle /> Verifikasi
                          </button>
                        ) : (
                          <span className={`pc-status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {sortedData.length > 0 && petugasC.last_page > 1 && (
          <div className="ks-footer">
            <span className="pc-footer-info">
              Halaman {petugasC.current_page} dari {petugasC.last_page}
            </span>
            <div className="ks-pager">
              <button className="ks-pg-btn" type="button" onClick={() => fetchPage(petugasC.current_page - 1)} disabled={petugasC.current_page === 1}>
                Prev
              </button>
              <button className="ks-pg-btn" type="button" onClick={() => fetchPage(petugasC.current_page + 1)} disabled={petugasC.current_page === petugasC.last_page}>
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal Detail */}
      {showModal && selectedPesanan && (
        <div className="pc-modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div className="pc-modal">
            <div className="pc-modal-header">
              <div>
                <p className="pc-modal-kicker">Detail Pesanan</p>
                <h2>Order #{selectedPesanan.id}</h2>
              </div>
              <button className="pc-modal-close" type="button" onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <div className="pc-modal-body">
              <div className="pc-overview-grid">
                <div className="pc-overview-item">
                  <span>Petugas</span>
                  <strong>{selectedPesanan.user?.name || "Tidak Diketahui"}</strong>
                </div>
                <div className="pc-overview-item">
                  <span>CMT</span>
                  <strong>{selectedPesanan.penjahit?.nama_penjahit || "Tidak Diketahui"}</strong>
                </div>
                <div className="pc-overview-item">
                  <span>Kode SPK</span>
                  <strong>{selectedPesanan.spk_cmt?.nomor_seri || "-"}</strong>
                </div>
                <div className="pc-overview-item">
                  <span>Total Item</span>
                  <strong>{selectedPesanan.jumlah_dipesan || 0} pcs</strong>
                </div>
                <div className="pc-overview-item">
                  <span>Nilai Pesanan</span>
                  <strong>{formatCurrency(selectedPesanan.total_harga)}</strong>
                </div>
                <div className="pc-overview-item">
                  <span>Status</span>
                  <strong>
                    <span className={`pc-status-badge ${getStatusMeta(selectedPesanan.status).className}`}>
                      {getStatusMeta(selectedPesanan.status).label}
                    </span>
                  </strong>
                </div>
              </div>

              <div className="ks-grid-scroll">
                <table className="ks-grid">
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
                        <td className="ks-cell-num">{index + 1}</td>
                        <td className="ks-cell-code">{detail.aksesoris?.nama_aksesoris || "Tidak Diketahui"}</td>
                        <td className="ks-cell-num">{detail.jumlah_dipesan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pc-modal-actions">
              <button type="button" className="pc-ghost-button" onClick={handleCloseModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Pesanan */}
      {showForm && (
        <div className="pc-modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleCloseCreateForm()}>
          <div className="pc-modal wide">
            <div className="pc-modal-header">
              <div>
                <p className="pc-modal-kicker">Pembelian Aksesoris CMT</p>
                <h2>Tambah Pembelian Aksesoris</h2>
              </div>
              <button className="pc-modal-close" type="button" onClick={handleCloseCreateForm}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="pc-modal-body">
                <div className="pc-form-grid">
                  <label className="pc-field">
                    <span><FiUser /> Petugas</span>
                    <input type="text" value={localStorage.getItem("userId") || "-"} disabled readOnly />
                  </label>

                  <label className="pc-field">
                    <span><FiUsers /> Pilih CMT</span>
                    <select name="penjahit_id" value={newData.penjahit_id} onChange={handleInputChange} required>
                      <option value="">-- Pilih CMT --</option>
                      {(Array.isArray(penjahitList) ? penjahitList : []).map((penjahit) => (
                        <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                          {penjahit.nama_penjahit}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="pc-section-head">
                  <h3>Detail Item Aksesoris</h3>
                  <button type="button" className="pc-ghost-button" onClick={handleAddDetail}>
                    <FiPlus /> Tambah Baris
                  </button>
                </div>

                {newData.detail_pesanan.length === 0 ? (
                  <p className="pc-empty-note">Belum ada item. Tambahkan minimal satu detail aksesoris sebelum menyimpan.</p>
                ) : (
                  <div className="pc-detail-list">
                    {newData.detail_pesanan.map((item, index) => (
                      <div className="pc-detail-row" key={`detail-${index}`}>
                        <span className="pc-detail-index">{index + 1}</span>
                        <label className="pc-field">
                          <span>Aksesoris</span>
                          <select
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
                        </label>
                        <label className="pc-field">
                          <span>Jumlah</span>
                          <input
                            type="number"
                            min="1"
                            placeholder="Jumlah"
                            value={item.jumlah_dipesan}
                            onChange={(e) => handleDetailChange(index, "jumlah_dipesan", e.target.value)}
                            required
                          />
                        </label>
                        <button type="button" className="pc-icon-danger" onClick={() => handleRemoveDetail(index)} title="Hapus baris">
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pc-modal-actions">
                <button type="button" className="pc-ghost-button" onClick={handleCloseCreateForm}>
                  Batal
                </button>
                <button type="submit" className="pc-primary-button">
                  <FiCheckCircle /> Simpan Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Verifikasi */}
      {showFormPetugasD && selectedPesanan && (
        <div className="pc-modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleClosePetugasDForm()}>
          <div className="pc-modal wide">
            <div className="pc-modal-header">
              <div>
                <p className="pc-modal-kicker">Verifikasi Operasional</p>
                <h2>Verifikasi Pesanan Aksesoris</h2>
              </div>
              <button className="pc-modal-close" type="button" onClick={handleClosePetugasDForm}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handlePetugasDFormSubmit}>
              <div className="pc-modal-body">
                <div className="pc-overview-grid">
                  <div className="pc-overview-item">
                    <span>CMT</span>
                    <strong>{selectedPesanan.penjahit?.nama_penjahit || "Tidak Diketahui"}</strong>
                  </div>
                  <div className="pc-overview-item">
                    <span>Target Scan</span>
                    <strong>{progressTarget} barcode</strong>
                  </div>
                  <div className="pc-overview-item">
                    <span>Progress</span>
                    <strong>{progressCurrent} / {progressTarget} barcode</strong>
                  </div>
                </div>

                <label className="pc-field full">
                  <span><FiBox /> Input Barcode (scan di sini)</span>
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
                </label>

                <div className="pc-chip-list">
                  {newDataPetugasD.barcode.length > 0 ? (
                    newDataPetugasD.barcode.map((code, index) => (
                      <span key={`${code}-${index}`} className="pc-barcode-chip">
                        {code}
                        <button type="button" onClick={() => handleRemoveBarcode(index)} aria-label={`Hapus barcode ${code}`}>
                          <FiX />
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="pc-empty-note">Belum ada barcode yang di-scan.</p>
                  )}
                </div>

                <label className="pc-field full">
                  <span><FiUploadCloud /> Upload Bukti Nota (JPG/PNG/PDF)</span>
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
                  {newDataPetugasD.bukti_nota && <small className="ks-muted">File dipilih: {newDataPetugasD.bukti_nota.name}</small>}
                </label>
              </div>

              <div className="pc-modal-actions">
                <button type="button" className="pc-ghost-button" onClick={handleClosePetugasDForm}>
                  Batal
                </button>
                <button type="submit" className="pc-primary-button" disabled={progressCurrent !== progressTarget}>
                  <FiCheck /> Verifikasi Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PesananPetugasC;
