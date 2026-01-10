import React, { useEffect, useState, useMemo } from "react";
import "./Pengiriman.css";
import API from "../../api";
import { FaPlus, FaMoneyBillWave, FaTimes, FaInfoCircle } from "react-icons/fa";
import Select from "react-select";

const Pengiriman = () => {
  const [pengirimans, setPengirimans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPengiriman, setSelectedPengiriman] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedPenjahit, setSelectedPenjahit] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [penjahitList, setPenjahitList] = useState([]);
  const [selectedStatusVerifikasi, setSelectedStatusVerifikasi] = useState("");
  const [warnaData, setWarnaData] = useState([]);
  const [showPetugasAtasPopup, setShowPetugasAtasPopup] = useState(false);
  const [spkCmtList, setSpkCmtList] = useState([]);
  const [selectedSpkDeadline, setSelectedSpkDeadline] = useState(null);
  const [deadlineError, setDeadlineError] = useState("");
  const [tanggalMasaLaluError, setTanggalMasaLaluError] = useState("");

  // Fungsi helper untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [newPengiriman, setNewPengiriman] = useState({
    id_spk: "",
    tanggal_pengiriman: getTodayDate(), // Set default ke tanggal hari ini
    total_barang_dikirim: "",
    sisa_barang: "",
    total_bayar: "",
    warna: [], // Inisialisasi warna dengan array kosong
  });

  const userRole = localStorage.getItem("role");
  console.log("User Role dari localStorage:", userRole);

  useEffect(() => {
    const fetchPengirimans = async () => {
      try {
        setLoading(true);

        console.log("Selected Penjahit:", selectedPenjahit); // Debugging
        console.log("sortBy:", sortBy);
        console.log("sortOrder:", sortOrder);

        const response = await API.get(`/pengiriman`, {
          params: {
            page: currentPage,
            id_penjahit: selectedPenjahit,
            sortBy,
            sortOrder,
            status_verifikasi: selectedStatusVerifikasi,
          },
        });

        console.log("Data Pengiriman:", response.data); // Debugging

        setPengirimans(response.data.data);
        setLastPage(response.data.last_page);
      } catch (error) {
        setError(error.response?.data?.message || "Failed to fetch data");
        console.error("Error fetching SPK:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPengirimans();
  }, [currentPage, selectedPenjahit, sortBy, sortOrder, selectedStatusVerifikasi]);

  useEffect(() => {
    const fetchPenjahits = async () => {
      try {
        setLoading(true);

        const response = await API.get("/penjahit");
        setPenjahitList(response.data);
      } catch (error) {
        setError("Gagal mengambil data penjahit.");
      } finally {
        setLoading(false);
      }
    };

    fetchPenjahits();
  }, []);

  // Fetch SPK CMT dengan status sudah_diambil untuk dropdown
  useEffect(() => {
    const fetchSpkCmt = async () => {
      try {
        const response = await API.get("/spkcmt", {
          params: {
            status: "sudah_diambil",
            allData: "true",
          },
        });

        console.log("SPK CMT Response:", response.data); // Debugging

        // Handle response structure
        let data = [];
        if (response.data?.spk) {
          // Ketika allData = true, response.data.spk adalah array langsung
          if (Array.isArray(response.data.spk)) {
            data = response.data.spk;
          }
          // Jika paginated (allData = false), ada property data
          else if (response.data.spk.data && Array.isArray(response.data.spk.data)) {
            data = response.data.spk.data;
          }
        }

        console.log("SPK CMT Data extracted:", data); // Debugging
        setSpkCmtList(data);
      } catch (error) {
        console.error("Error fetching SPK CMT:", error);
        console.error("Error details:", error.response?.data); // Debugging
        setSpkCmtList([]);
      }
    };

    fetchSpkCmt();
  }, []);

  useEffect(() => {
    if (selectedPengiriman) {
      fetchWarnaBySpk(selectedPengiriman.id_spk);
    }
  }, [selectedPengiriman]);

  // Reset tanggal ke hari ini saat form dibuka
  useEffect(() => {
    if (showForm) {
      const today = getTodayDate();
      setNewPengiriman(prev => ({
        ...prev,
        tanggal_pengiriman: today
      }));
      setTanggalMasaLaluError("");
      setDeadlineError("");
    }
  }, [showForm]);

  const fetchWarnaBySpk = async (id_spk) => {
    try {
      const response = await API.get(`/spk-cmt/${id_spk}/warna`);

      console.log("API Response:", response.data); // Debugging

      // Pastikan data berbentuk array sebelum diproses
      if (!Array.isArray(response.data.warna)) {
        console.error("Expected an array but got:", response.data.warna);
        return;
      }

      setWarnaData(
        response.data.warna.map((w) => ({
          nama_warna: w.nama_warna,
          qty_spk: w.qty,
          jumlah_dikirim: 0,
        }))
      );
    } catch (error) {
      console.error("Error fetching warna:", error);
    }
  };

  // Filter data berdasarkan pencarian
  const filteredPengirimans = Array.isArray(pengirimans)
    ? pengirimans
        .filter((pengiriman) => pengiriman.id_spk.toString().includes(searchTerm.toLowerCase()))
        .sort(
          (a, b) =>
            sortOrder === "asc"
              ? new Date(a.created_at) - new Date(b.created_at) // Terlama dulu
              : new Date(b.created_at) - new Date(a.created_at) // Terbaru dulu
        )
    : [];

  const fetchSpkDeadline = async (id_spk) => {
    try {
      // Cari deadline dari spkCmtList yang sudah di-fetch
      const spkSelected = spkCmtList.find((spk) => spk.id_spk === id_spk);
      if (spkSelected && spkSelected.deadline) {
        setSelectedSpkDeadline(spkSelected.deadline);
      } else {
        // Jika tidak ditemukan di list, fetch dari API
        const response = await API.get(`/spkcmt/${id_spk}`);
        if (response.data && response.data.deadline) { 
          setSelectedSpkDeadline(response.data.deadline);
        } else {
          setSelectedSpkDeadline(null);
        }
      }
    } catch (error) {
      console.error("Error fetching SPK deadline:", error);
      setSelectedSpkDeadline(null);
    }
  };

  // Validasi tanggal tidak boleh sebelum hari ini
  const validateTanggalMasaLalu = (tanggalPengiriman) => {
    if (!tanggalPengiriman) {
      setTanggalMasaLaluError("");
      return { valid: true, error: "" };
    }

    const tanggal = new Date(tanggalPengiriman);
    tanggal.setHours(0, 0, 0, 0);
    
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    // Jika tanggal pengiriman sebelum hari ini, tampilkan error
    if (tanggal < hariIni) {
      const tanggalFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(tanggal);
      
      const hariIniFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(hariIni);
      
      const errorMessage = `Tanggal pengiriman (${tanggalFormatted}) tidak boleh sebelum hari ini (${hariIniFormatted}). Tanggal kirim harus sama dengan atau setelah tanggal hari ini.`;
      setTanggalMasaLaluError(errorMessage);
      return { valid: false, error: errorMessage };
    }

    setTanggalMasaLaluError("");
    return { valid: true, error: "" };
  };

  const validateDeadline = (tanggalPengiriman, returnError = false) => {
    if (!tanggalPengiriman || !selectedSpkDeadline) {
      setDeadlineError("");
      return returnError ? { valid: true, error: "" } : true;
    }

    // Normalisasi tanggal ke format date saja (hilangkan waktu) untuk perbandingan yang akurat
    const tanggal = new Date(tanggalPengiriman);
    tanggal.setHours(0, 0, 0, 0);
    
    const deadline = new Date(selectedSpkDeadline);
    deadline.setHours(0, 0, 0, 0);

    // Jika tanggal pengiriman melewati deadline, tampilkan error
    if (tanggal > deadline) {
      const deadlineFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(deadline);
      
      const tanggalFormatted = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(tanggal);
      
      const errorMessage = `Tanggal pengiriman (${tanggalFormatted}) tidak boleh melewati deadline SPK (${deadlineFormatted}). Silakan pilih tanggal yang sama atau sebelum deadline.`;
      setDeadlineError(errorMessage);
      return returnError ? { valid: false, error: errorMessage } : false;
    }

    setDeadlineError("");
    return returnError ? { valid: true, error: "" } : true;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!newPengiriman.id_spk) {
      alert("Silakan pilih SPK CMT terlebih dahulu");
      return;
    }

    if (!newPengiriman.foto_nota) {
      alert("Silakan upload foto nota terlebih dahulu");
      return;
    }

    // Validasi tanggal tidak boleh sebelum hari ini
    const tanggalMasaLaluValidation = validateTanggalMasaLalu(newPengiriman.tanggal_pengiriman);
    if (!tanggalMasaLaluValidation.valid) {
      alert(tanggalMasaLaluValidation.error);
      return;
    }

    // Validasi deadline sebelum submit
    const deadlineValidation = validateDeadline(newPengiriman.tanggal_pengiriman, true);
    if (!deadlineValidation.valid) {
      alert(deadlineValidation.error);
      return;
    }
   
    const formData = new FormData();
    formData.append("id_spk", Number(newPengiriman.id_spk));
    formData.append("tanggal_pengiriman", newPengiriman.tanggal_pengiriman);
    formData.append("total_barang_dikirim", newPengiriman.total_barang_dikirim);
    formData.append("foto_nota", newPengiriman.foto_nota);

    try {
      const response = await API.post("/pengiriman/petugas-bawah", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPengirimans([...pengirimans, response.data.data]); // Tambah ke list
      setShowForm(false); // Tutup modal

      // Reset form
      setNewPengiriman({
        id_spk: "",
        tanggal_pengiriman: getTodayDate(), // Reset ke tanggal hari ini
        total_barang_dikirim: "",
        sisa_barang: "",
        total_bayar: "",
        warna: [],
        foto_nota: null,
      });
      setSelectedSpkDeadline(null);
      setDeadlineError("");
      setTanggalMasaLaluError("");
    } catch (error) {
      console.error("Error adding data:", error);
      alert(error.response?.data?.error || "Terjadi kesalahan saat menambahkan pengiriman.");
    }
  };

  const handleQtyChange = (index, value) => {
    const newWarnaData = [...warnaData];
    newWarnaData[index].jumlah_dikirim = value;
    setWarnaData(newWarnaData);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewPengiriman({
      ...newPengiriman,
      [e.target.name]: value,
    });

    // Validasi tanggal jika input adalah tanggal_pengiriman
    if (e.target.name === "tanggal_pengiriman") {
      // Validasi tanggal tidak boleh sebelum hari ini
      validateTanggalMasaLalu(value); 
      // Validasi deadline
      validateDeadline(value);
    }
  };

  // Options untuk dropdown SPK CMT
  const spkCmtOptions = useMemo(() => {
    console.log("spkCmtList untuk options:", spkCmtList); // Debugging

    if (!Array.isArray(spkCmtList) || spkCmtList.length === 0) {
      console.log("spkCmtList kosong atau bukan array"); // Debugging
      return [];
    }

    const options = spkCmtList
      .filter((spk) => spk.status === "sudah_diambil") // Filter lagi di frontend untuk memastikan
      .map((spk) => {
        const nomorSeri = spk.nomor_seri || `SPK-${spk.id_spk}`;
        const namaProduk = spk.nama_produk || "Produk Tidak Diketahui";
        const label = `${nomorSeri} - ${namaProduk}`;

        return {
          value: spk.id_spk,
          label: label,
        };
      });

    console.log("spkCmtOptions generated:", options); // Debugging
    return options;
  }, [spkCmtList]);

  const formatTanggal = (tanggal) => {
    const date = new Date(tanggal);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  // Format rupiah tanpa desimal jika 0
  const formatRupiah = (value) => {
    if (!value && value !== 0) return "Rp 0";

    // Konversi ke number jika string
    const numValue = typeof value === "string" ? parseFloat(value) : value;

    // Jika bukan number atau NaN, return 0
    if (isNaN(numValue)) return "Rp 0";

    // Format dengan pemisah ribuan menggunakan titik (Indonesia)
    // Tanpa desimal karena kita hanya butuh bilangan bulat
    return `Rp ${Math.floor(numValue).toLocaleString("id-ID")}`;
  };

  const handleDetailClick = (pengiriman) => {
    setSelectedPengiriman(pengiriman); // Simpan detail SPK yang dipilih
    setShowPopup(true); // Tampilkan pop-up
    setShowPetugasAtasPopup(false);
  };
  const closePopup = () => {
    setShowPopup(false); // Sembunyikan pop-up
    setSelectedPengiriman(null);
  };

  const handlePetugasAtas = (pengiriman) => {
    setSelectedPengiriman(pengiriman); // Set pengiriman yang dipilijh
    setShowPetugasAtasPopup(true); // Buka modal petugas atas
    setShowPopup(false);
  };

  const handlePetugasAtasSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await API.put(`/pengiriman/petugas-atas/${selectedPengiriman.id_pengiriman}`, {
        warna: warnaData.map((w) => ({
          warna: w.nama_warna, // ✅ FIX DI SINI
          jumlah_dikirim: w.jumlah_dikirim,
        })),
      });

      alert("Data berhasil diperbarui!");

      setPengirimans(pengirimans.map((item) => (item.id_pengiriman === selectedPengiriman.id_pengiriman ? { ...item, ...response.data.data } : item)));

      setShowPetugasAtasPopup(false);
      setSelectedPengiriman(null);
    } catch (error) {
      console.error("Error updating data:", error.response?.data);
      alert(error.response?.data?.error || "Gagal memperbarui data pengiriman.");
    }
  };

  return (
    <div className="pengiriman-wrapper">
      <div className="pengiriman-header">
        <h1>Daftar Pengiriman</h1>
      </div>

      <div className="pengiriman-filters">
        <button onClick={() => setShowForm(true)}>
          <FaPlus /> Tambah
        </button>

        <div className="pengiriman-search">
          <input type="text" placeholder="Cari ID SPK..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <select value={selectedPenjahit} onChange={(e) => setSelectedPenjahit(e.target.value)}>
          <option value="">All CMT</option>
          {penjahitList.map((penjahit) => (
            <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
              {penjahit.nama_penjahit}
            </option>
          ))}
        </select>

        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="asc">Terlama</option>
          <option value="desc">Terbaru</option>
        </select>

        <select value={selectedStatusVerifikasi} onChange={(e) => setSelectedStatusVerifikasi(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="invalid">Invalid</option>
          <option value="valid">Valid</option>
        </select>
      </div>

      <div className="pengiriman-table-container">
        <div className="pengiriman-table-wrapper">
          <table className="pengiriman-table">
            <thead>
              <tr>
                <th>ID SPK</th>
                <th>Nama CMT</th>
                <th>Nama Produk</th>
                <th>Tanggal Pengiriman</th>
                <th>Total Barang Dikirim</th>
                <th>Sisa Barang</th>
                <th>Total Transfer</th>
                <th>Status Verifikasi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                    Memuat data...
                  </td>
                </tr>
              ) : filteredPengirimans.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "#718096" }}>
                    Tidak ada data pengiriman
                  </td>
                </tr>
              ) : (
                filteredPengirimans.map((pengiriman) => {
                  // Hitung total transfer: total_bayar + refund_claim - claim (hanya jika claim belum dibayar)
                  const claimBelumDibayar = pengiriman.status_claim === "belum_dibayar" ? pengiriman.claim || 0 : 0;
                  const totalTransfer = (pengiriman.total_bayar || 0) + (pengiriman.refund_claim || 0) - claimBelumDibayar;

                  return (
                    <tr key={pengiriman.id_pengiriman}>
                      <td>{pengiriman.id_spk}</td>
                      <td>{pengiriman.nama_penjahit || "-"}</td>
                      <td>{pengiriman.nama_produk || "-"}</td>
                      <td>{formatTanggal(pengiriman.tanggal_pengiriman)}</td>
                      <td>{pengiriman.total_barang_dikirim || 0}</td>
                      <td
                        style={{
                          color: pengiriman.sisa_barang > 0 ? "#e53e3e" : "#48bb78",
                          fontWeight: pengiriman.sisa_barang > 0 ? 600 : 400,
                        }}
                      >
                        {pengiriman.sisa_barang || 0}
                      </td>
                      <td>{pengiriman.status_verifikasi === "valid" ? formatRupiah(totalTransfer) : <span style={{ color: "#718096", fontStyle: "italic" }}>Belum diverifikasi</span>}</td>
                      <td>
                        <span className={`status-badge ${pengiriman.status_verifikasi || "pending"}`}>{pengiriman.status_verifikasi || "pending"}</span>
                      </td>
                      <td>
                        <div className="pengiriman-actions">
                          <button className="pengiriman-btn-icon info" onClick={() => handleDetailClick(pengiriman)} title="Detail">
                            <FaInfoCircle />
                          </button>
                          {userRole !== "staff_bawah" && (
                            <button className="pengiriman-btn-icon payment" onClick={() => handlePetugasAtas(pengiriman)} title="Verifikasi">
                              <FaMoneyBillWave />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pengiriman-pagination">
          <button className="pengiriman-pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
            ◀ Prev
          </button>
          <span className="pengiriman-pagination-info">
            Halaman {currentPage} dari {lastPage}
          </span>
          <button className="pengiriman-pagination-btn" disabled={currentPage === lastPage} onClick={() => setCurrentPage(currentPage + 1)}>
            Next ▶
          </button>
        </div>
      </div>

      {/* Detail Popup */}
      {showPopup && selectedPengiriman && (
        <div className="pengiriman-detail-popup" onClick={closePopup}>
          <div className="pengiriman-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="pengiriman-detail-header">
              <h2>Detail Pengiriman</h2>
              <button className="pengiriman-modal-close" onClick={closePopup}>
                <FaTimes />
              </button>
            </div>
            <div className="pengiriman-detail-content">
              <table className="pengiriman-detail-table">
                <tbody>
                  <tr>
                    <td>ID SPK</td>
                    <td>{selectedPengiriman.id_spk}</td>
                  </tr>
                  <tr>
                    <td>Tanggal Pengiriman</td>
                    <td>{formatTanggal(selectedPengiriman.tanggal_pengiriman)}</td>
                  </tr>
                  <tr>
                    <td>Total Barang</td>
                    <td>{selectedPengiriman.total_barang_dikirim || 0}</td>
                  </tr>
                  <tr>
                    <td>Sisa Barang</td>
                    <td>{selectedPengiriman.sisa_barang || 0}</td>
                  </tr>
                  {selectedPengiriman.warna && selectedPengiriman.warna.length > 0 && (
                    <>
                      <tr>
                        <td>Detail Warna Dikirim</td>
                        <td>
                          <div className="pengiriman-detail-warna">
                            {selectedPengiriman.warna.map((warnaDetail) => (
                              <div key={warnaDetail.id_pengiriman_warna} className="pengiriman-detail-warna-item">
                                {warnaDetail.warna}: {warnaDetail.jumlah_dikirim} pcs
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>Detail Sisa Warna</td>
                        <td>
                          <div className="pengiriman-detail-warna">
                            {selectedPengiriman.warna.map((warnaDetail) => (
                              <div key={warnaDetail.id_pengiriman_warna} className="pengiriman-detail-warna-item">
                                {warnaDetail.warna}: {warnaDetail.sisa_barang_per_warna || 0} pcs
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td>Total Bayar</td>
                    <td>{selectedPengiriman.status_verifikasi === "valid" ? formatRupiah(selectedPengiriman.total_bayar || 0) : <span style={{ color: "#718096", fontStyle: "italic" }}>Belum diverifikasi</span>}</td>
                  </tr>
                  <tr>
                    <td>Total Claim</td>
                    <td>{selectedPengiriman.status_verifikasi === "valid" ? formatRupiah(selectedPengiriman.claim || 0) : <span style={{ color: "#718096", fontStyle: "italic" }}>Belum diverifikasi</span>}</td>
                  </tr>
                  <tr>
                    <td>Total Refund Claim</td>
                    <td>{selectedPengiriman.status_verifikasi === "valid" ? formatRupiah(selectedPengiriman.refund_claim || 0) : <span style={{ color: "#718096", fontStyle: "italic" }}>Belum diverifikasi</span>}</td>
                  </tr>
                  <tr>
                    <td>Status Claim</td>
                    <td>
                      <span
                        style={{
                          color: selectedPengiriman.status_claim === "sudah_dibayar" ? "#48bb78" : "#ed8936",
                          fontWeight: 600,
                        }}
                      >
                        {selectedPengiriman.status_claim === "sudah_dibayar" ? "Sudah Dibayar" : "Belum Dibayar"}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Total Transfer</td>
                    <td>
                      {selectedPengiriman.status_verifikasi === "valid" ? (
                        (() => {
                          const claimBelumDibayar = selectedPengiriman.status_claim === "belum_dibayar" ? selectedPengiriman.claim || 0 : 0;
                          const totalTransfer = (selectedPengiriman.total_bayar || 0) + (selectedPengiriman.refund_claim || 0) - claimBelumDibayar;
                          return formatRupiah(totalTransfer);
                        })()
                      ) : (
                        <span style={{ color: "#718096", fontStyle: "italic" }}>Belum diverifikasi</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah */}
      {showForm && (
        <div
          className="pengiriman-modal-overlay"
          onClick={() => {
            setShowForm(false);
            setSelectedSpkDeadline(null);
            setDeadlineError("");
            setTanggalMasaLaluError("");
          }}
        >
          <div className="pengiriman-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pengiriman-modal-header">
              <h2>Tambah Data Pengiriman</h2>
              <button
                className="pengiriman-modal-close"
                onClick={() => {
                  setShowForm(false);
                  setSelectedSpkDeadline(null);
                  setDeadlineError("");
                  setTanggalMasaLaluError("");
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="pengiriman-modal-body">
              <form onSubmit={handleFormSubmit} className="pengiriman-form">
                <div className="pengiriman-form-group">
                  <label className="pengiriman-form-label">SPK CMT</label>
                  <Select
                    options={spkCmtOptions}
                    value={spkCmtOptions.find((opt) => opt.value === newPengiriman.id_spk) || null}
                    onChange={(selected) => {
                      const idSpk = selected ? selected.value : "";
                      setNewPengiriman({
                        ...newPengiriman,
                        id_spk: idSpk,
                      });

                      // Fetch deadline ketika SPK dipilih
                      if (idSpk) {
                        fetchSpkDeadline(idSpk);
                      } else {
                        setSelectedSpkDeadline(null);
                        setDeadlineError("");
                      }
                    }}
                    placeholder="Pilih atau cari SPK CMT..."
                    isSearchable={true}
                    isClearable={true}
                    noOptionsMessage={({ inputValue }) => (inputValue ? `Tidak ditemukan untuk "${inputValue}"` : "Tidak ada SPK CMT dengan status sudah diambil")}
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: "48px",
                        border: "1.5px solid #e1e5e9",
                        borderRadius: "8px",
                        fontSize: "14px",
                        "&:hover": {
                          borderColor: "#667eea",
                        },
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: "#999",
                      }),
                    }}
                    required
                  />
                </div>

                <div className="pengiriman-form-group">
                  <label className="pengiriman-form-label">
                    Tanggal Kirim
                    {selectedSpkDeadline && (
                      <small style={{ color: "#718096", fontWeight: "normal", marginLeft: "8px" }}>
                        (Deadline:{" "}
                        {new Intl.DateTimeFormat("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }).format(new Date(selectedSpkDeadline))}
                        )
                      </small>
                    )}
                  </label>
                  <input
                    type="date"
                    name="tanggal_pengiriman"
                    className="pengiriman-form-input"
                    value={newPengiriman.tanggal_pengiriman}
                    onChange={handleInputChange}
                    min={getTodayDate()} // Tidak bisa memilih tanggal sebelum hari ini
                    max={selectedSpkDeadline || undefined}
                    required
                    style={{
                      borderColor: (deadlineError || tanggalMasaLaluError) ? "#e53e3e" : undefined,
                    }}
                  />
                  {tanggalMasaLaluError && <div style={{ color: "#e53e3e", fontSize: "12px", marginTop: "4px" }}>{tanggalMasaLaluError}</div>}
                  {deadlineError && <div style={{ color: "#e53e3e", fontSize: "12px", marginTop: "4px" }}>{deadlineError}</div>}
                </div>

                <div className="pengiriman-form-group">
                  <label className="pengiriman-form-label">Total Barang</label>
                  <input type="number" name="total_barang_dikirim" className="pengiriman-form-input" value={newPengiriman.total_barang_dikirim} onChange={handleInputChange} required />
                </div>

                <div className="pengiriman-form-group">
                  <label className="pengiriman-form-label">
                    Upload Nota (JPG, PNG, PDF) <span style={{ color: "#e53e3e" }}>*</span>
                  </label>
                  <input type="file" accept="image/*,.pdf,application/pdf" className="pengiriman-form-input" onChange={(e) => setNewPengiriman({ ...newPengiriman, foto_nota: e.target.files[0] })} required />
                </div>

                <div className="pengiriman-form-actions">
                  <button
                    type="button"
                    className="pengiriman-btn pengiriman-btn-secondary"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedSpkDeadline(null);
                      setDeadlineError("");
                      setTanggalMasaLaluError("");
                    }}
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="pengiriman-btn pengiriman-btn-primary"
                    disabled={!!deadlineError || !!tanggalMasaLaluError}
                    style={{
                      opacity: (deadlineError || tanggalMasaLaluError) ? 0.5 : 1,
                      cursor: (deadlineError || tanggalMasaLaluError) ? 'not-allowed' : 'pointer'
                    }}
                    title={(deadlineError || tanggalMasaLaluError) || 'Simpan data pengiriman'}
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Petugas Atas */}
      {showPetugasAtasPopup && selectedPengiriman && (
        <div className="pengiriman-modal-overlay" onClick={() => setShowPetugasAtasPopup(false)}>
          <div className="pengiriman-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pengiriman-modal-header">
              <h2>Verifikasi Pengiriman (ID: {selectedPengiriman.id_pengiriman})</h2>
              <button className="pengiriman-modal-close" onClick={() => setShowPetugasAtasPopup(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="pengiriman-modal-body">
              <form onSubmit={handlePetugasAtasSubmit} className="pengiriman-form">
                {warnaData.length > 0 ? (
                  warnaData.map((item, index) => (
                    <div className="pengiriman-form-group" key={index}>
                      <label className="pengiriman-form-label">
                        {item.nama_warna} <small style={{ color: "#718096" }}>(SPK: {item.qty_spk})</small>
                      </label>
                     <input
                        type="number"
                        className="pengiriman-form-input"
                        value={item.jumlah_dikirim === 0 ? "" : item.jumlah_dikirim}
                        onChange={(e) =>
                          handleQtyChange(
                            index,
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        min="0"
                        required
                      />
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: "center", color: "#718096", padding: "20px" }}>Tidak ada data warna untuk SPK ini</p>
                )}
                <div className="pengiriman-form-actions">
                  <button
                    type="button"
                    className="pengiriman-btn pengiriman-btn-secondary"
                    onClick={() => {
                      setShowPetugasAtasPopup(false);
                      setSelectedPengiriman(null);
                    }}
                  >
                    Batal
                  </button>
                  <button type="submit" className="pengiriman-btn pengiriman-btn-primary">
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

export default Pengiriman;
