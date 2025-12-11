import React, { useEffect, useState } from "react";
import "./PembelianAksesoris.css";
import API from "../../api";
import { FaPlus, FaShoppingCart, FaCheckCircle, FaDownload, FaImage, FaCalendarAlt, FaDollarSign, FaBox } from "react-icons/fa";

const PembelianAksesoris = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPembelianAId, setSelectedPembelianAId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [aksesorisList, setAksesorisList] = useState([]);
  const [jumlahTerverifikasi, setJumlahTerverifikasi] = useState("");
  const [newPembelian, setNewPembelian] = useState({
    aksesoris_id: "",
    jumlah: "",
    harga_satuan: "",
    tanggal_pembelian: "",
    bukti_pembelian: null,
  });
  const [pembelianA, setPembelianA] = useState({
    data: [],
    current_page: 1,
    last_page: 1,
  });

  const fetchPembelianA = async (page = 1) => {
    try {
      setLoading(true);
      const response = await API.get(`pembelian-aksesoris-a?page=${page}`);
      setPembelianA(response.data);
      setError(null);
    } catch (error) {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPembelianA();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("User tidak ditemukan. Silakan login ulang.");
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

      alert("Pembelian berhasil disimpan!");
      await fetchPembelianA();

      setShowForm(false);
      setNewPembelian({
        aksesoris_id: "",
        jumlah: "",
        harga_satuan: "",
        tanggal_pembelian: "",
        bukti_pembelian: null,
      });
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan pembelian.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPembelian((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    const fetchAksesoris = async () => {
      try {
        // Fetch semua data tanpa pagination menggunakan parameter all=true
        const response = await API.get("/aksesoris?all=true");
        // Jika all=true, API mengembalikan array langsung, bukan pagination object
        const data = Array.isArray(response.data) ? response.data : [];
        console.log("Aksesoris data fetched:", data.length, "items");
        setAksesorisList(data);
      } catch (err) {
        console.error("Gagal mengambil data aksesoris:", err);
        // Set ke array kosong jika error
        setAksesorisList([]);
      }
    };

    fetchAksesoris();
  }, []);

  const handleVerifikasi = (pembelianA) => {
    setSelectedPembelianAId(pembelianA.id);
    setShowModal(true);
  };

  const handleSubmitPembelianB = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("User tidak ditemukan. Silakan login ulang.");
      return;
    }

    const payload = {
      pembelian_a_id: selectedPembelianAId,
      user_id: userId,
      jumlah_terverifikasi: jumlahTerverifikasi,
    };
    console.log("Payload dikirim:", payload);

    try {
      await API.post("/pembelian-aksesoris-b", payload);
      alert("Verifikasi berhasil disimpan!");

      await fetchPembelianA();
      setShowModal(false);
      setJumlahTerverifikasi(""); // reset form
    } catch (error) {
      console.error("Gagal verifikasi:", error);
      alert("Gagal verifikasi, coba lagi.");
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
      console.error("Terjadi kesalahan saat mengunduh barcode:", error);
      alert("Gagal mengunduh barcode. Silakan coba lagi.");
    }
  };

  const fetchPage = async (page) => {
    try {
      setLoading(true);
      const response = await API.get(`pembelian-aksesoris-a?page=${page}`);
      setPembelianA(response.data);
      setError(null);
    } catch (error) {
      setError("Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  // Filter data berdasarkan search term
  const filteredData = (pembelianA?.data ?? []).filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return item.aksesoris?.nama_aksesoris?.toLowerCase().includes(searchLower) || item.id?.toString().includes(searchLower);
  });

  // Sort data berdasarkan ID descending (yang baru di atas)
  const sortedData = [...filteredData].sort((a, b) => b.id - a.id);

  return (
    <div className="pembelian-aksesoris-page">
      <div className="pembelian-aksesoris-header">
        <div className="pembelian-aksesoris-header-icon">
          <FaShoppingCart />
        </div>
        <h1>Pembelian Aksesoris Toko</h1>
      </div>

      <div className="pembelian-aksesoris-table-container">
        <div className="pembelian-aksesoris-filter-header">
          <button className="pembelian-aksesoris-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah Pembelian
          </button>
          <div className="pembelian-aksesoris-search-bar">
            <input type="text" placeholder="Cari nama aksesoris atau ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="pembelian-aksesoris-loading">Memuat data...</div>
        ) : error ? (
          <div className="pembelian-aksesoris-error">Gagal mengambil data</div>
        ) : sortedData.length === 0 ? (
          <div className="pembelian-aksesoris-empty-state">
            <div className="pembelian-aksesoris-empty-state-icon">📦</div>
            <p>Tidak ada data pembelian aksesoris</p>
          </div>
        ) : (
          <div className="pembelian-aksesoris-table-wrapper">
            <table className="pembelian-aksesoris-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Aksesoris</th>
                  <th>Jumlah</th>
                  <th>Harga Satuan</th>
                  <th>Total Harga</th>
                  <th>Tanggal Pembelian</th>
                  <th>Bukti Pembelian</th>
                  <th>Status Verifikasi</th>
                  <th>Download Barcode</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((pembelianA, index) => (
                  <tr key={pembelianA.id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{pembelianA.aksesoris?.nama_aksesoris || "-"}</strong>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{pembelianA.jumlah}</span>
                    </td>
                    <td>
                      <span className="pembelian-aksesoris-price">Rp {Number(pembelianA.harga_satuan).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td>
                      <span className="pembelian-aksesoris-price">Rp {Number(pembelianA.total_harga).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td>{pembelianA.tanggal_pembelian}</td>
                    <td>
                      {pembelianA.bukti_pembelian ? (
                        <img src={`${process.env.REACT_APP_API_URL.replace("/api", "")}/storage/${pembelianA.bukti_pembelian}`} alt="Bukti Pembelian" className="pembelian-aksesoris-image" />
                      ) : (
                        <span style={{ color: "#9ca3af" }}>-</span>
                      )}
                    </td>
                    <td>
                      {pembelianA.status_verifikasi === "valid" ? (
                        <span className="pembelian-aksesoris-status-badge verified">
                          <FaCheckCircle /> Sudah Diverifikasi
                        </span>
                      ) : (
                        <button className="pembelian-aksesoris-btn-verify" onClick={() => handleVerifikasi(pembelianA)}>
                          <FaCheckCircle /> Verifikasi
                        </button>
                      )}
                    </td>
                    <td>
                      {pembelianA.pembelian_b_id ? (
                        pembelianA.barcode_downloaded === 1 ? (
                          <span className="pembelian-aksesoris-status-badge disabled">Barcode Sudah Didownload</span>
                        ) : (
                          <button onClick={() => handleDownloadBarcode(pembelianA.pembelian_b_id)} className="pembelian-aksesoris-btn-download">
                            <FaDownload /> Download Barcode
                          </button>
                        )
                      ) : (
                        <span style={{ color: "#9ca3af", fontSize: "13px" }}>Belum diverifikasi</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sortedData.length > 0 && (
          <div className="pembelian-aksesoris-pagination">
            <button disabled={pembelianA.current_page === 1} onClick={() => fetchPage(pembelianA.current_page - 1)}>
              ← Prev
            </button>
            <span>
              Halaman {pembelianA.current_page} / {pembelianA.last_page}
            </span>
            <button disabled={pembelianA.current_page === pembelianA.last_page} onClick={() => fetchPage(pembelianA.current_page + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>
      {showForm && (
        <div className="pembelian-aksesoris-modal" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="pembelian-aksesoris-modal-content">
            <h2>
              <FaShoppingCart /> Tambah Pembelian Aksesoris
            </h2>
            <form onSubmit={handleFormSubmit} className="pembelian-aksesoris-form">
              {/* AKSESORIS ID (Dropdown dari list aksesoris) */}
              <div className="pembelian-aksesoris-form-group">
                <label>
                  <FaBox /> Pilih Aksesoris:
                </label>
                <select name="aksesoris_id" value={newPembelian.aksesoris_id} onChange={handleInputChange} required>
                  <option value="">-- Pilih Aksesoris --</option>
                  {(Array.isArray(aksesorisList) ? aksesorisList : []).map((aksesoris) => (
                    <option key={aksesoris.id} value={aksesoris.id}>
                      {aksesoris.nama_aksesoris}
                    </option>
                  ))}
                </select>
              </div>

              {/* JUMLAH */}
              <div className="pembelian-aksesoris-form-group">
                <label>
                  <FaBox /> Jumlah:
                </label>
                <input type="number" name="jumlah" value={newPembelian.jumlah} onChange={handleInputChange} placeholder="Masukkan jumlah" min="1" required />
              </div>

              {/* HARGA SATUAN */}
              <div className="pembelian-aksesoris-form-group">
                <label>
                  <FaDollarSign /> Harga Satuan:
                </label>
                <input type="number" name="harga_satuan" value={newPembelian.harga_satuan} onChange={handleInputChange} placeholder="Contoh: 20000" min="0" required />
              </div>

              {/* TANGGAL PEMBELIAN */}
              <div className="pembelian-aksesoris-form-group">
                <label>
                  <FaCalendarAlt /> Tanggal Pembelian:
                </label>
                <input type="date" name="tanggal_pembelian" value={newPembelian.tanggal_pembelian} onChange={handleInputChange} required />
              </div>

              {/* BUKTI PEMBELIAN */}
              <div className="pembelian-aksesoris-form-group">
                <label>
                  <FaImage /> Bukti Pembelian (Opsional):
                </label>
                <input
                  type="file"
                  name="bukti_pembelian"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setNewPembelian({
                      ...newPembelian,
                      bukti_pembelian: e.target.files[0],
                    })
                  }
                />
              </div>

              <div className="pembelian-aksesoris-form-actions">
                <button type="submit" className="pembelian-aksesoris-btn-submit">
                  <FaCheckCircle /> Simpan
                </button>
                <button type="button" className="pembelian-aksesoris-btn-cancel" onClick={() => setShowForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="pembelian-aksesoris-modal" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="pembelian-aksesoris-modal-content">
            <h2>
              <FaCheckCircle /> Verifikasi Pembelian
            </h2>
            <form onSubmit={handleSubmitPembelianB} className="pembelian-aksesoris-form">
              <div className="pembelian-aksesoris-form-group">
                <label>ID Pembelian A</label>
                <input type="text" value={selectedPembelianAId} readOnly />
              </div>

              <div className="pembelian-aksesoris-form-group">
                <label>Jumlah Terverifikasi</label>
                <input type="number" value={jumlahTerverifikasi} onChange={(e) => setJumlahTerverifikasi(e.target.value)} placeholder="Masukkan jumlah yang terverifikasi" min="1" required />
              </div>

              <div className="pembelian-aksesoris-form-actions">
                <button type="submit" className="pembelian-aksesoris-btn-submit">
                  <FaCheckCircle /> Verifikasi
                </button>
                <button type="button" className="pembelian-aksesoris-btn-cancel" onClick={() => setShowModal(false)}>
                  Batal
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
