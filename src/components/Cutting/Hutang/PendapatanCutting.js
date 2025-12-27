import React, { useEffect, useState } from "react";
import "./PendapatanCutting.css";
import API from "../../../api";
import { FaTimes, FaMoneyBillWave, FaCalendarAlt, FaDownload } from "react-icons/fa";

const PendapatanCutting = () => {
  const [pendapatans, setPendapatans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCutting, setSelectedCutting] = useState(null);
  const [downloadingPreview, setDownloadingPreview] = useState(false);
  const [kurangiHutang, setKurangiHutang] = useState(false);
  const [kurangiCashbon, setKurangiCashbon] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [buktiTransfer, setBuktiTransfer] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [simulasi, setSimulasi] = useState({
    total_pendapatan: 0,
    potongan_hutang: 0,
    potongan_cashbon: 0,
    total_transfer: 0,
    pendapatan_belum_dibayar_sebelumnya: 0,
  });

  const fetchPendapatans = async () => {
    if (!startDate || !endDate) {
      console.warn("Start date atau end date belum diisi");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await API.get("/pendapatan/mingguan/cutting", {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setPendapatans(data);
    } catch (e) {
      console.error("Error fetching pendapatan:", e);
      if (e.response?.status === 429) {
        setError("Terlalu banyak request. Silakan tunggu sebentar dan coba lagi.");
      } else {
        setError("Gagal mengambil data pendapatan");
      }
      setPendapatans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startDateStr = startOfMonth.toISOString().split("T")[0];
    const endDateStr = endOfMonth.toISOString().split("T")[0];

    setStartDate(startDateStr);
    setEndDate(endDateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;

    // Debounce untuk mencegah terlalu banyak request saat user mengubah tanggal
    const timeoutId = setTimeout(() => {
      fetchPendapatans();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchSimulasi = async (tukang_cutting_id, kurangiHutang, kurangiCashbon) => {
    try {
      console.log("Fetching simulasi cutting:", {
        tukang_cutting_id,
        tanggal_awal: startDate,
        tanggal_akhir: endDate,
        kurangi_hutang: kurangiHutang,
        kurangi_cashbon: kurangiCashbon,
      });

      const response = await API.post("/pendapatan/simulasi/cutting", {
        tukang_cutting_id,
        tanggal_awal: startDate,
        tanggal_akhir: endDate,
        kurangi_hutang: kurangiHutang,
        kurangi_cashbon: kurangiCashbon,
      });

      console.log("Simulasi response:", response.data);

      if (response.data) {
        setSimulasi({
          total_pendapatan: response.data.total_pendapatan || 0,
          potongan_hutang: response.data.potongan_hutang || 0,
          potongan_cashbon: response.data.potongan_cashbon || 0,
          total_transfer: response.data.total_transfer || 0,
          pendapatan_belum_dibayar_sebelumnya: response.data.pendapatan_belum_dibayar_sebelumnya || 0,
        });
      } else {
        console.warn("Response data is empty");
        setSimulasi({
          total_pendapatan: 0,
          potongan_hutang: 0,
          potongan_cashbon: 0,
          total_transfer: 0,
          pendapatan_belum_dibayar_sebelumnya: 0,
        });
      }
    } catch (err) {
      console.error("Gagal fetch simulasi pendapatan:", err);
      console.error("Error details:", err.response?.data || err.message);
      setSimulasi({
        total_pendapatan: 0,
        potongan_hutang: 0,
        potongan_cashbon: 0,
        total_transfer: 0,
        pendapatan_belum_dibayar_sebelumnya: 0,
      });
    }
  };

  useEffect(() => {
    if (selectedCutting) {
      fetchSimulasi(selectedCutting.tukang_cutting_id, kurangiHutang, kurangiCashbon);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCutting, kurangiHutang, kurangiCashbon, startDate, endDate]);

  const handleFilter = () => {
    if (!startDate || !endDate) {
      alert("Silakan pilih tanggal mulai dan tanggal akhir terlebih dahulu");
      return;
    }

    setSelectedCutting(null);
    setKurangiHutang(false);
    setKurangiCashbon(false);
    setSimulasi({
      total_pendapatan: 0,
      potongan_hutang: 0,
      potongan_cashbon: 0,
      total_transfer: 0,
      pendapatan_belum_dibayar_sebelumnya: 0,
    });
    setBuktiTransfer(null);
    fetchPendapatans();
  };

  const handleOpenForm = (cutting) => {
    if (!startDate || !endDate) {
      alert("Pilih periode tanggal terlebih dahulu");
      return;
    }
    setSelectedCutting(cutting);
    setShowForm(true);
  };

  const handleTambahPendapatan = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("tukang_cutting_id", selectedCutting.tukang_cutting_id);
      formData.append("tanggal_awal", startDate);
      formData.append("tanggal_akhir", endDate);
      formData.append("kurangi_hutang", kurangiHutang ? 1 : 0);
      formData.append("kurangi_cashbon", kurangiCashbon ? 1 : 0);

      if (buktiTransfer) {
        formData.append("bukti_transfer", buktiTransfer);
      }

      const response = await API.post("/pendapatan/cutting", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 201 || response.data.success) {
        alert(response.data.message || "Pendapatan berhasil ditambahkan!");
        setShowForm(false);
        setSelectedCutting(null);
        setKurangiHutang(false);
        setKurangiCashbon(false);
        setBuktiTransfer(null);
        setSimulasi({
          total_pendapatan: 0,
          potongan_hutang: 0,
          potongan_cashbon: 0,
          total_transfer: 0,
          pendapatan_belum_dibayar_sebelumnya: 0,
        });
        // Refresh data
        fetchPendapatans();
      }
    } catch (error) {
      console.error("Error saat tambah pendapatan:", error);
      if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert("Terjadi kesalahan saat menambahkan pendapatan.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setSelectedCutting(null);
    setKurangiHutang(false);
    setKurangiCashbon(false);
    setBuktiTransfer(null);
    setSimulasi({
      total_pendapatan: 0,
      potongan_hutang: 0,
      potongan_cashbon: 0,
      total_transfer: 0,
      pendapatan_belum_dibayar_sebelumnya: 0,
    });
  };

  const handleDownloadInvoicePreview = async (pendapatan) => {
    if (!startDate || !endDate) {
      alert("Pilih periode tanggal terlebih dahulu");
      return;
    }

    // Prevent multiple simultaneous requests
    if (downloadingPreview) {
      return;
    }

    setDownloadingPreview(true);
    try {
      const response = await API.post(
        "/pendapatan/cutting/download-invoice-preview",
        {
          tukang_cutting_id: pendapatan.tukang_cutting_id,
          tanggal_awal: startDate,
          tanggal_akhir: endDate,
        },
        {
          responseType: "blob",
        }
      );

      // Check if response is actually a PDF (blob type)
      if (response.data instanceof Blob && response.data.type === "application/pdf") {
        // Buat URL blob dan download
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Invoice-Preview-Pendapatan-Cutting-${pendapatan.tukang_cutting_id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // If not PDF, might be error response
        const text = await response.data.text();
        try {
          const errorData = JSON.parse(text);
          alert(errorData.message || errorData.error || "Gagal mengunduh preview invoice.");
        } catch {
          alert("Gagal mengunduh preview invoice.");
        }
      }
    } catch (error) {
      console.error("Error downloading preview invoice:", error);

      // Handle different error types
      let errorMessage = "Gagal mengunduh preview invoice.";

      if (error.response) {
        // Server responded with error status
        const contentType = error.response.headers["content-type"];

        if (contentType && contentType.includes("application/json")) {
          // JSON error response
          if (error.response.data && typeof error.response.data === "object") {
            errorMessage = error.response.data.message || error.response.data.error || "Gagal mengunduh preview invoice.";
          } else {
            // Try to parse as text
            try {
              const text = await error.response.data.text();
              const errorData = JSON.parse(text);
              errorMessage = errorData.message || errorData.error || "Gagal mengunduh preview invoice.";
            } catch {
              // Keep default errorMessage, no need to reassign
            }
          }
        } else if (contentType && contentType.includes("text/html")) {
          errorMessage = "Server mengembalikan error. Pastikan data valid.";
        }
      } else if (error.request) {
        errorMessage = "Tidak ada response dari server. Periksa koneksi internet Anda.";
      }

      alert(errorMessage);
    } finally {
      setDownloadingPreview(false);
    }
  };

  // Format rupiah
  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const filteredPendapatans = pendapatans;

  return (
    <div className="pendapatan-cutting-page">
      <div className="pendapatan-cutting-header">
        <div className="pendapatan-cutting-header-icon">
          <FaMoneyBillWave />
        </div>
        <h1>Daftar Pendapatan Cutting</h1>
      </div>

      <div className="pendapatan-cutting-table-container">
        <div className="pendapatan-cutting-filter-container">
          <div className="pendapatan-cutting-filter-header">
            <div className="pendapatan-cutting-filter-group">
              <label>
                <FaCalendarAlt style={{ marginRight: "8px" }} />
                Dari Tanggal
              </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="pendapatan-cutting-filter-group">
              <label>
                <FaCalendarAlt style={{ marginRight: "8px" }} />
                Sampai Tanggal
              </label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <button className="pendapatan-cutting-btn-filter" onClick={handleFilter}>
              Terapkan Filter
            </button>
          </div>
        </div>

        {loading ? (
          <div className="pendapatan-cutting-loading">Memuat data...</div>
        ) : error ? (
          <div className="pendapatan-cutting-error">{error}</div>
        ) : filteredPendapatans.length === 0 ? (
          <div className="pendapatan-cutting-empty-state">
            <div className="pendapatan-cutting-empty-state-icon">💰</div>
            <p>Tidak ada data pendapatan</p>
          </div>
        ) : (
          <div className="pendapatan-cutting-table-wrapper">
            <table className="pendapatan-cutting-table">
              <thead>
                <tr>
                  <th>Nama Tukang Cutting</th>
                  <th>Total Pendapatan</th>
                  <th>Potongan Hutang</th>
                  <th>Potongan Cashbon</th>
                  <th>Total Transfer</th>
                  <th>Status Pembayaran</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendapatans.map((pendapatan) => (
                  <tr key={pendapatan.tukang_cutting_id}>
                    <td>{pendapatan.nama_tukang_cutting || "-"}</td>
                    <td>
                      <span className="pendapatan-cutting-price">{formatRupiah(pendapatan.total_pendapatan || 0)}</span>
                    </td>
                    <td>
                      <span className="pendapatan-cutting-price" style={{ color: "#dc2626" }}>
                        {formatRupiah(pendapatan.potongan_hutang || 0)}
                      </span>
                    </td>
                    <td>
                      <span className="pendapatan-cutting-price" style={{ color: "#dc2626" }}>
                        {formatRupiah(pendapatan.potongan_cashbon || 0)}
                      </span>
                    </td>
                    <td>
                      <span className="pendapatan-cutting-price" style={{ color: "#0369a1" }}>
                        {formatRupiah(pendapatan.total_transfer || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={`pendapatan-cutting-status-badge ${pendapatan.status_pembayaran === "sudah dibayar" ? "sudah-dibayar" : "belum-dibayar"}`}>
                        {pendapatan.status_pembayaran === "sudah dibayar" ? "Sudah Dibayar" : "Belum Dibayar"}
                      </span>
                    </td>
                    <td>
                      <div className="pendapatan-cutting-action-buttons">
                        {pendapatan.total_pendapatan > 0 ? (
                          // Bisa dibayar kapan saja - tampilkan preview dan bayar
                          <>
                            <button className="pendapatan-cutting-btn-download-preview" onClick={() => handleDownloadInvoicePreview(pendapatan)} title="Download Preview Invoice" disabled={downloadingPreview}>
                              <FaDownload /> {downloadingPreview ? "Loading..." : "Preview"}
                            </button>
                            <button className="pendapatan-cutting-btn-bayar" onClick={() => handleOpenForm(pendapatan)}>
                              Bayar
                            </button>
                          </>
                        ) : (
                          <span className="pendapatan-cutting-btn-disabled">Tidak ada pendapatan</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="pendapatan-cutting-modal" onClick={handleCloseModal}>
          <div className="pendapatan-cutting-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pendapatan-cutting-modal-header">
              <h2>Tambah Data Pendapatan</h2>
              <button className="pendapatan-cutting-modal-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleTambahPendapatan} className="pendapatan-cutting-form">
              <div className="pendapatan-cutting-form-group">
                <label>ID Tukang Cutting:</label>
                <input type="text" value={selectedCutting?.tukang_cutting_id || ""} readOnly />
              </div>

              <div className="pendapatan-cutting-form-group">
                <label>Nama Tukang Cutting:</label>
                <input type="text" value={selectedCutting?.nama_tukang_cutting || ""} readOnly />
              </div>

              <div className="pendapatan-cutting-form-group">
                <label>Total Pendapatan:</label>
                <input type="text" value={formatRupiah(simulasi.total_pendapatan || 0)} readOnly />
              </div>

              {simulasi.pendapatan_belum_dibayar_sebelumnya > 0 && (
                <div className="pendapatan-cutting-form-group">
                  <label>Pendapatan Belum Dibayar Sebelumnya:</label>
                  <input type="text" value={formatRupiah(simulasi.pendapatan_belum_dibayar_sebelumnya || 0)} readOnly />
                </div>
              )}

              <div className="pendapatan-cutting-form-group">
                <label>Potongan Hutang:</label>
                <input type="text" value={formatRupiah(simulasi.potongan_hutang || 0)} readOnly />
              </div>

              <div className="pendapatan-cutting-form-group">
                <label>Potongan Cashbon:</label>
                <input type="text" value={formatRupiah(simulasi.potongan_cashbon || 0)} readOnly />
              </div>

              <div className="pendapatan-cutting-checkbox-group">
                <label>
                  <input type="checkbox" checked={kurangiHutang} onChange={(e) => setKurangiHutang(e.target.checked)} />
                  Potong Hutang
                </label>
              </div>

              <div className="pendapatan-cutting-checkbox-group">
                <label>
                  <input type="checkbox" checked={kurangiCashbon} onChange={(e) => setKurangiCashbon(e.target.checked)} />
                  Potong Cashbon
                </label>
              </div>

              <div className="pendapatan-cutting-form-group pendapatan-cutting-total-transfer">
                <strong>Total Transfer:</strong>
                <input type="text" value={formatRupiah(simulasi.total_transfer || 0)} readOnly />
              </div>

              <div className="pendapatan-cutting-form-group">
                <label>Upload Bukti Transfer:</label>
                <input type="file" accept="image/*" onChange={(e) => setBuktiTransfer(e.target.files[0])} />
              </div>

              <div className="pendapatan-cutting-form-actions">
                <button type="button" className="pendapatan-cutting-btn pendapatan-cutting-btn-cancel" onClick={handleCloseModal}>
                  Batal
                </button>
                <button type="submit" className="pendapatan-cutting-btn pendapatan-cutting-btn-submit" disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendapatanCutting;
