import React, { useEffect, useState } from "react";
import "./KodeSeriBelumDikerjakanOptimized.css";
import "./PembelianAksesoris.css";
import API from "../../api";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FaPlus, FaCheckCircle, FaDownload, FaImage, FaCalendarAlt, FaDollarSign, FaBox, FaSearch, FaTimes } from "react-icons/fa";

const initialPembelianForm = {
  aksesoris_id: "",
  jumlah: "",
  harga_satuan: "",
  tanggal_pembelian: "",
  bukti_pembelian: null,
};

const PembelianAksesoris = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPembelianAId, setSelectedPembelianAId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [aksesorisList, setAksesorisList] = useState([]);
  const [jumlahTerverifikasi, setJumlahTerverifikasi] = useState("");
  const [newPembelian, setNewPembelian] = useState(initialPembelianForm);
  const [pembelianA, setPembelianA] = useState({
    data: [],
    current_page: 1,
    last_page: 1,
    total: 0,
  });

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

  const fetchPembelianA = async (page = 1) => {
    try {
      setLoading(true);
      const response = await API.get(`pembelian-aksesoris-a?page=${page}&per_page=50`);
      setPembelianA(response.data);
      setError(null);
    } catch (error) {
      setError("Gagal mengambil data pembelian.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPembelianA();
  }, []);

  useEffect(() => {
    const fetchAksesoris = async () => {
      try {
        // Fetch semua data tanpa pagination menggunakan parameter all=true
        const response = await API.get("/aksesoris?all=true");
        // Jika all=true, API mengembalikan array langsung, bukan pagination object
        const data = Array.isArray(response.data) ? response.data : [];
        setAksesorisList(data);
      } catch (err) {
        setAksesorisList([]);
      }
    };

    fetchAksesoris();
  }, []);

  const closeAddModal = () => {
    setShowForm(false);
    setNewPembelian(initialPembelianForm);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem("userId");

    if (!userId) {
      await showErrorAlert("Sesi Berakhir", "User tidak ditemukan. Silakan login ulang.");
      return;
    }

    const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("aksesoris_id", newPembelian.aksesoris_id);
    formData.append("jumlah", newPembelian.jumlah);
    formData.append("harga_satuan", newPembelian.harga_satuan);
    formData.append("tanggal_pembelian", newPembelian.tanggal_pembelian);

    if (newPembelian.bukti_pembelian) {
      formData.append("bukti_pembelian", newPembelian.bukti_pembelian);
    }

    try {
      await API.post("/pembelian-aksesoris-a", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await fetchPembelianA();
      closeAddModal();
      await showSuccessAlert("Berhasil", "Pembelian aksesoris berhasil disimpan.");
    } catch (error) {
      await showErrorAlert("Gagal Menyimpan", error.response?.data?.message || "Terjadi kesalahan saat menyimpan pembelian.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPembelian((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVerifikasi = (item) => {
    setSelectedPembelianAId(item.id);
    setShowModal(true);
  };

  const closeVerifyModal = () => {
    setShowModal(false);
    setJumlahTerverifikasi("");
  };

  const handleSubmitPembelianB = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem("userId");

    if (!userId) {
      await showErrorAlert("Sesi Berakhir", "User tidak ditemukan. Silakan login ulang.");
      return;
    }

    const payload = {
      pembelian_a_id: selectedPembelianAId,
      user_id: userId,
      jumlah_terverifikasi: jumlahTerverifikasi,
    };

    try {
      await API.post("/pembelian-aksesoris-b", payload);
      await fetchPembelianA();
      closeVerifyModal();
      await showSuccessAlert("Berhasil", "Verifikasi berhasil disimpan.");
    } catch (error) {
      await showErrorAlert("Gagal Verifikasi", "Gagal menyimpan verifikasi, coba lagi.");
    }
  };

  const handleDownloadBarcode = async (id) => {
    try {
      const response = await API.get(`/barcode-download/${id}`, {
        responseType: "blob", // file binary
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `barcode_aksesoris_${id}.pdf`;
      link.click();
    } catch (error) {
      await showErrorAlert("Gagal Mengunduh", "Gagal mengunduh barcode. Silakan coba lagi.");
    }
  };

  const fetchPage = (page) => {
    if (page < 1 || page > pembelianA.last_page) return;
    fetchPembelianA(page);
  };

  // Filter data berdasarkan search term
  const filteredData = (pembelianA?.data ?? []).filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return item.aksesoris?.nama_aksesoris?.toLowerCase().includes(searchLower) || item.id?.toString().includes(searchLower);
  });

  // Sort data berdasarkan ID descending (yang baru di atas)
  const sortedData = [...filteredData].sort((a, b) => b.id - a.id);

  return (
    <div className="ks-page pa-page">
      <header className="ks-header">
        <div className="ks-header-id">
          <h1>Pembelian Aksesoris Toko</h1>
          <span className="ks-header-sub">
            {pembelianA.total ?? sortedData.length} data ditemukan — Riwayat pembelian aksesoris dari toko beserta status verifikasi
          </span>
        </div>
      </header>

      <section className="ks-board">
        <div className="ks-toolbar">
          <div className="ks-search">
            <FaSearch className="ks-search-icon" style={{ fontSize: "12px" }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari aksesoris atau ID..."
            />
            {searchTerm && (
              <button type="button" className="pa-search-clear" onClick={() => setSearchTerm("")}>
                <FaTimes />
              </button>
            )}
          </div>

          <button className="ks-btn is-primary" type="button" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah Pembelian
          </button>
        </div>

        <div className="ks-grid-scroll">
          <table className="ks-grid">
            <thead>
              <tr>
                <th>No.</th>
                <th>Aksesoris</th>
                <th>Jumlah</th>
                <th>Harga Satuan</th>
                <th>Total Harga</th>
                <th>Tanggal</th>
                <th>Bukti</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="pa-state-cell">Memuat data pembelian...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="9" className="pa-state-cell pa-state-error">{error}</td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="pa-state-cell">Tidak ada data pembelian aksesoris ditemukan.</td>
                </tr>
              ) : (
                sortedData.map((item, index) => (
                  <tr key={item.id}>
                    <td className="ks-cell-num">{index + 1}</td>
                    <td className="ks-cell-code">
                      <strong>{item.aksesoris?.nama_aksesoris || "-"}</strong>
                    </td>
                    <td className="ks-cell-num">{item.jumlah}</td>
                    <td>Rp {Number(item.harga_satuan).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                    <td>Rp {Number(item.total_harga).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                    <td>{item.tanggal_pembelian}</td>
                    <td>
                      {item.bukti_pembelian ? (
                        <img
                          src={`${process.env.REACT_APP_API_URL.replace("/api", "")}/storage/${item.bukti_pembelian}`}
                          alt="Bukti"
                          className="pa-thumb"
                        />
                      ) : (
                        <div className="pa-thumb pa-thumb-empty">
                          <FaImage />
                        </div>
                      )}
                    </td>
                    <td>
                      {item.status_verifikasi === "valid" ? (
                        <span className="pa-status-badge verified">
                          <FaCheckCircle /> Terverifikasi
                        </span>
                      ) : (
                        <button className="ks-btn pa-verify-btn" type="button" onClick={() => handleVerifikasi(item)}>
                          <FaCheckCircle /> Verifikasi
                        </button>
                      )}
                    </td>
                    <td>
                      {item.pembelian_b_id ? (
                        item.barcode_downloaded === 1 ? (
                          <button className="ks-btn" type="button" disabled>
                            Diunduh
                          </button>
                        ) : (
                          <button className="ks-btn" type="button" onClick={() => handleDownloadBarcode(item.pembelian_b_id)}>
                            <FaDownload /> Barcode
                          </button>
                        )
                      ) : (
                        <span className="ks-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sortedData.length > 0 && pembelianA.last_page > 1 && (
          <div className="ks-footer">
            <span className="pa-footer-info">
              Halaman {pembelianA.current_page} dari {pembelianA.last_page}
            </span>
            <div className="ks-pager">
              <button className="ks-pg-btn" type="button" onClick={() => fetchPage(pembelianA.current_page - 1)} disabled={pembelianA.current_page === 1}>
                Prev
              </button>
              <button className="ks-pg-btn" type="button" onClick={() => fetchPage(pembelianA.current_page + 1)} disabled={pembelianA.current_page === pembelianA.last_page}>
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal Tambah Pembelian */}
      {showForm && (
        <div className="pa-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeAddModal()}>
          <div className="pa-modal">
            <div className="pa-modal-header">
              <div>
                <p className="pa-modal-kicker">Pembelian Aksesoris</p>
                <h2>Tambah Pembelian</h2>
              </div>
              <button className="pa-modal-close" type="button" onClick={closeAddModal}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="pa-modal-body">
                <div className="pa-form-grid">
                  <label className="pa-field full">
                    <span><FaBox /> Pilih Aksesoris</span>
                    <select name="aksesoris_id" value={newPembelian.aksesoris_id} onChange={handleInputChange} required>
                      <option value="">-- Pilih Aksesoris --</option>
                      {(Array.isArray(aksesorisList) ? aksesorisList : []).map((aksesoris) => (
                        <option key={aksesoris.id} value={aksesoris.id}>
                          {aksesoris.nama_aksesoris}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="pa-field">
                    <span><FaBox /> Jumlah</span>
                    <input type="number" name="jumlah" value={newPembelian.jumlah} onChange={handleInputChange} placeholder="Masukkan jumlah" min="1" required />
                  </label>

                  <label className="pa-field">
                    <span><FaDollarSign /> Harga Satuan</span>
                    <input type="number" name="harga_satuan" value={newPembelian.harga_satuan} onChange={handleInputChange} placeholder="Contoh: 20000" min="0" required />
                  </label>

                  <label className="pa-field">
                    <span><FaCalendarAlt /> Tanggal Pembelian</span>
                    <input type="date" name="tanggal_pembelian" value={newPembelian.tanggal_pembelian} onChange={handleInputChange} required />
                  </label>

                  <label className="pa-field">
                    <span><FaImage /> Bukti Pembelian (Opsional)</span>
                    <input
                      type="file"
                      name="bukti_pembelian"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        setNewPembelian((prev) => ({
                          ...prev,
                          bukti_pembelian: e.target.files[0],
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="pa-modal-actions">
                <button type="button" className="pa-ghost-button" onClick={closeAddModal}>
                  Batal
                </button>
                <button type="submit" className="pa-primary-button">
                  <FaCheckCircle /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Verifikasi */}
      {showModal && (
        <div className="pa-modal-backdrop" onClick={(e) => e.target === e.currentTarget && closeVerifyModal()}>
          <div className="pa-modal narrow">
            <div className="pa-modal-header">
              <div>
                <p className="pa-modal-kicker">Pembelian Aksesoris</p>
                <h2>Verifikasi Pembelian</h2>
              </div>
              <button className="pa-modal-close" type="button" onClick={closeVerifyModal}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmitPembelianB}>
              <div className="pa-modal-body">
                <div className="pa-form-grid">
                  <label className="pa-field full">
                    <span>ID Pembelian A</span>
                    <input type="text" value={selectedPembelianAId} readOnly />
                  </label>

                  <label className="pa-field full">
                    <span>Jumlah Terverifikasi</span>
                    <input type="number" value={jumlahTerverifikasi} onChange={(e) => setJumlahTerverifikasi(e.target.value)} placeholder="Masukkan jumlah yang terverifikasi" min="1" required />
                  </label>
                </div>
              </div>

              <div className="pa-modal-actions">
                <button type="button" className="pa-ghost-button" onClick={closeVerifyModal}>
                  Batal
                </button>
                <button type="submit" className="pa-primary-button">
                  <FaCheckCircle /> Verifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PembelianAksesoris;
