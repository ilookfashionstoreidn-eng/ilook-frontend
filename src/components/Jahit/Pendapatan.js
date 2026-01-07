import React, { useEffect, useState } from "react";
import { FaInfoCircle, FaDownload, FaCalendarAlt, FaMoneyBillWave, FaTimes } from "react-icons/fa";
import "./Pendapatan.css";
import API from "../../api";

const Pendapatan = () => {
  const [pendapatans, setPendapatans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPendapatan, setSelectedPendapatan] = useState(null);
  const [detailPengiriman, setDetailPengiriman] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPenjahit, setSelectedPenjahit] = useState(null);
  const [kurangiHutang, setKurangiHutang] = useState(false);
  const [kurangiCashbon, setKurangiCashbon] = useState(false);
  const [aksesorisDipilih, setAksesorisDipilih] = useState([]);
  const [detailAksesoris, setDetailAksesoris] = useState([]);
  const [claimBelumDibayar, setClaimBelumDibayar] = useState([]);
  const [claimDipilih, setClaimDipilih] = useState([]);
  const [buktiTransfer, setBuktiTransfer] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadingPreview, setDownloadingPreview] = useState(false);

  const [simulasi, setSimulasi] = useState({
    total_pendapatan: 0,
    total_claim: 0,
    potongan_hutang: 0,
    potongan_cashbon: 0,
    potongan_aksesoris: 0,
    total_transfer: 0,
  });

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

  const fetchSimulasi = async (id_penjahit, kurangiHutang, kurangiCashbon, aksesorisIds = [], claimIds = []) => {
    if (!startDate || !endDate) return;

    try {
      const response = await API.post("/simulasi-pendapatan", {
        id_penjahit,
        tanggal_awal: startDate,
        tanggal_akhir: endDate,
        kurangi_hutang: kurangiHutang,
        kurangi_cashbon: kurangiCashbon,
        detail_aksesoris_ids: aksesorisIds, // kirim array id
        claim_ids: claimIds, // kirim array id_pengiriman untuk claim
      });

      if (response.data) {
        setSimulasi({
          total_pendapatan: response.data.total_pendapatan || 0,
          total_claim: response.data.total_claim || 0,
          potongan_hutang: response.data.potongan_hutang || 0,
          potongan_cashbon: response.data.potongan_cashbon || 0,
          potongan_aksesoris: response.data.potongan_aksesoris || 0,
          total_transfer: response.data.total_transfer || 0,
        });
      } else {
        console.warn("Data simulasi kosong:", response.data);
        setSimulasi({
          total_pendapatan: 0,
          total_claim: 0,
          potongan_hutang: 0,
          potongan_cashbon: 0,
          potongan_aksesoris: 0,
          total_transfer: 0,
        });
      }
    } catch (err) {
      console.error("Gagal fetch simulasi pendapatan", err);
      setSimulasi({
        total_pendapatan: 0,
        total_claim: 0,
        potongan_hutang: 0,
        potongan_cashbon: 0,
        potongan_aksesoris: 0,
        total_transfer: 0,
      });
    }
  };

  // Di event handler (misal di onChange checkbox)
  useEffect(() => {
    if (selectedPenjahit && startDate && endDate) {
      fetchSimulasi(selectedPenjahit.id_penjahit, kurangiHutang, kurangiCashbon, aksesorisDipilih, claimDipilih);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenjahit, aksesorisDipilih, claimDipilih, kurangiHutang, kurangiCashbon, startDate, endDate]);

  const fetchDetailAksesoris = async (penjahitId) => {
    try {
      const response = await API.get(`/detail-pesanan-aksesoris?penjahit_id=${penjahitId}`);
      setDetailAksesoris(response.data);
    } catch (error) {
      console.error("Gagal mengambil aksesoris:", error);
    }
  };

  const fetchClaimBelumDibayar = async (penjahitId) => {
    try {
      const response = await API.get(`/pendapatan/claim-belum-dibayar/${penjahitId}`);
      setClaimBelumDibayar(response.data.data || []);
    } catch (error) {
      console.error("Gagal mengambil claim belum dibayar:", error);
      setClaimBelumDibayar([]);
    }
  };

  const fetchPendapatans = async () => {
    if (!startDate || !endDate) {
      console.warn("Start date atau end date belum diisi");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await API.get("/pendapatan", {
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

  const handleTambahPendapatan = async (e) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      alert("Pilih periode tanggal terlebih dahulu");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("id_penjahit", selectedPenjahit.id_penjahit);
      formData.append("tanggal_awal", startDate);
      formData.append("tanggal_akhir", endDate);
      formData.append("kurangi_hutang", kurangiHutang ? 1 : 0);
      formData.append("kurangi_cashbon", kurangiCashbon ? 1 : 0);

      if (buktiTransfer) {
        formData.append("bukti_transfer", buktiTransfer);
      }

      if (aksesorisDipilih.length > 0) {
        aksesorisDipilih.forEach((id, index) => {
          formData.append(`detail_aksesoris_ids[${index}]`, id);
        });
      }

      if (claimDipilih.length > 0) {
        claimDipilih.forEach((id, index) => {
          formData.append(`claim_ids[${index}]`, id);
        });
      }

      const response = await API.post("/pendapatan", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 201) {
        alert(response.data.message || "Pendapatan berhasil ditambahkan!");
        setShowForm(false);
        setSelectedPenjahit(null);
        setKurangiHutang(false);
        setKurangiCashbon(false);
        setAksesorisDipilih([]);
        setClaimDipilih([]);
        setBuktiTransfer(null);
        setSimulasi({
          total_pendapatan: 0,
          total_claim: 0,
          potongan_hutang: 0,
          potongan_cashbon: 0,
          potongan_aksesoris: 0,
          total_transfer: 0,
        });
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
        "/pendapatan/download-invoice-preview",
        {
          id_penjahit: pendapatan.id_penjahit,
          tanggal_awal: startDate,
          tanggal_akhir: endDate,
        },
        {
          responseType: "blob",
        }
      );

      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-Preview-Pendapatan-${pendapatan.id_penjahit}_${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading invoice preview:", error);
      if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert("Gagal mengunduh preview invoice.");
      }
    } finally {
      setDownloadingPreview(false);
    }
  };

  const handleDetailClick = async (pendapatan) => {
    setSelectedPendapatan(pendapatan);
    setLoading(true);
    setError("");

    try {
      // Panggil API untuk mendapatkan detail pengiriman
      const response = await API.get(`/pendapatan/${pendapatan.id_pendapatan}/pengiriman`);
      setDetailPengiriman(response.data.pengiriman || []); // Simpan detail pengiriman ke state
    } catch (error) {
      console.error("Error fetching detail pengiriman:", error);
      setError(error.response?.data?.message || "Gagal memuat detail pengiriman.");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedPendapatan(null);
    setDetailPengiriman([]);
  };

  const handleDownload = async (idPendapatan) => {
    try {
      const response = await API.get(`/pendapatan/${idPendapatan}/download-nota`, {
        responseType: "blob", // Pastikan menerima file sebagai blob
      });

      // Buat URL blob dari response data
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `nota_pendapatan_${idPendapatan}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Hapus URL blob setelah selesai
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert(error.response?.data?.message || "Gagal mengunduh nota.");
    }
  };

  const handleOpenForm = (penjahit) => {
    if (!startDate || !endDate) {
      alert("Pilih periode tanggal terlebih dahulu");
      return;
    }
    setSelectedPenjahit(penjahit);
    setShowForm(true);
    fetchDetailAksesoris(penjahit.id_penjahit);
    fetchClaimBelumDibayar(penjahit.id_penjahit);
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setSelectedPenjahit(null);
    setKurangiHutang(false);
    setKurangiCashbon(false);
    setAksesorisDipilih([]);
    setClaimDipilih([]);
    setClaimBelumDibayar([]);
    setBuktiTransfer(null);
    setSimulasi({
      total_pendapatan: 0,
      total_claim: 0,
      potongan_hutang: 0,
      potongan_cashbon: 0,
      potongan_aksesoris: 0,
      total_transfer: 0,
    });
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      alert("Silakan pilih tanggal mulai dan tanggal akhir terlebih dahulu");
      return;
    }

    setSelectedPenjahit(null);
    setKurangiHutang(false);
    setKurangiCashbon(false);
    setAksesorisDipilih([]);
    setClaimDipilih([]);
    setBuktiTransfer(null);
    setSimulasi({
      total_pendapatan: 0,
      total_claim: 0,
      potongan_hutang: 0,
      potongan_cashbon: 0,
      potongan_aksesoris: 0,
      total_transfer: 0,
    });
    fetchPendapatans();
  };

  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  return (
    <div className="pendapatan-container">
      <div className="pendapatan-header">
        <FaMoneyBillWave style={{ fontSize: "32px", color: "#0369a1" }} />
        <h1>Daftar Pendapatan</h1>
      </div>

      <div className="pendapatan-filter-card">
        <div className="pendapatan-filter-group">
          <div className="pendapatan-filter-item">
            <label>
              <FaCalendarAlt /> Dari Tanggal
            </label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="pendapatan-filter-item">
            <label>
              <FaCalendarAlt /> Sampai Tanggal
            </label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <button onClick={handleFilter} className="pendapatan-btn-filter">
            Terapkan Filter
          </button>
        </div>
      </div>

      <div className="pendapatan-table-card">
        {loading ? (
          <div className="pendapatan-loading">Memuat data...</div>
        ) : error ? (
          <div className="pendapatan-error">{error}</div>
        ) : pendapatans.length === 0 ? (
          <div className="pendapatan-empty">
            <div className="pendapatan-empty-icon">💰</div>
            <p>Tidak ada data pendapatan</p>
          </div>
        ) : (
          <div className="pendapatan-table-wrapper">
            <table className="pendapatan-table">
              <thead>
                <tr>
                  <th>Nama Penjahit</th>
                  <th>Total Pendapatan</th>
                  <th>Total Transfer</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pendapatans.map((pendapatan) => (
                  <tr key={pendapatan.id_penjahit}>
                    <td>
                      <span className="pendapatan-name">{pendapatan.nama_penjahit || "Tidak Diketahui"}</span>
                    </td>
                    <td>
                      <span className="pendapatan-amount">{formatRupiah(pendapatan.total_pendapatan || 0)}</span>
                    </td>
                    <td>
                      <span className="pendapatan-amount">{formatRupiah(pendapatan.total_transfer || 0)}</span>
                    </td>
                    <td>
                      {pendapatan.total_pendapatan > 0 ? (
                        <button onClick={() => handleOpenForm(pendapatan)} className="pendapatan-btn pendapatan-btn-primary">
                          Bayar
                        </button>
                      ) : (
                        <span className="pendapatan-badge pendapatan-badge-disabled">Tidak ada pendapatan</span>
                      )}
                    </td>
                    <td>
                      <div className="pendapatan-actions">
                        {pendapatan.pendapatan_id ? (
                          <>
                            <button className="pendapatan-btn-icon" onClick={() => handleDetailClick(pendapatan)} title="Detail">
                              <FaInfoCircle />
                            </button>
                            <button className="pendapatan-btn-icon" onClick={() => handleDownload(pendapatan.pendapatan_id)} title="Download Invoice">
                              <FaDownload />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="pendapatan-btn-icon"
                              onClick={() => handleDownloadInvoicePreview(pendapatan)}
                              title="Download Preview Invoice"
                              disabled={downloadingPreview || pendapatan.total_pendapatan === 0}
                              style={{ opacity: downloadingPreview || pendapatan.total_pendapatan === 0 ? 0.5 : 1 }}
                            >
                              <FaDownload />
                            </button>
                          </>
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

      {/* Modal Detail Pendapatan */}
      {selectedPendapatan && (
        <div className="pendapatan-modal-overlay" onClick={closeModal}>
          <div className="pendapatan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pendapatan-modal-header">
              <h2>Detail Pendapatan #{selectedPendapatan.id_pendapatan}</h2>
              <button className="pendapatan-modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className="pendapatan-modal-body">
              <div className="pendapatan-detail-grid">
                <div className="pendapatan-detail-item">
                  <label>Total Claim</label>
                  <span>{formatRupiah(selectedPendapatan.total_claim || 0)}</span>
                </div>
                <div className="pendapatan-detail-item">
                  <label>Total Refund Claim</label>
                  <span>{formatRupiah(selectedPendapatan.total_refund_claim || 0)}</span>
                </div>
                <div className="pendapatan-detail-item">
                  <label>Total Cashbon</label>
                  <span>{formatRupiah(selectedPendapatan.total_cashbon || 0)}</span>
                </div>
                <div className="pendapatan-detail-item">
                  <label>Total Hutang</label>
                  <span>{formatRupiah(selectedPendapatan.total_hutang || 0)}</span>
                </div>
                <div className="pendapatan-detail-item">
                  <label>Handtag</label>
                  <span>{formatRupiah(selectedPendapatan.handtag || 0)}</span>
                </div>
                <div className="pendapatan-detail-item">
                  <label>Transportasi</label>
                  <span>{formatRupiah(selectedPendapatan.transportasi || 0)}</span>
                </div>
              </div>

              <h3 style={{ marginTop: "32px", marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#1e293b" }}>Detail Pengiriman</h3>

              {loading ? (
                <div className="pendapatan-loading">Memuat detail...</div>
              ) : error ? (
                <div className="pendapatan-error">{error}</div>
              ) : (
                <div className="pendapatan-table-wrapper">
                  <table className="pendapatan-modal-table">
                    <thead>
                      <tr>
                        <th>ID Pengiriman</th>
                        <th>Tanggal Pengiriman</th>
                        <th>Total Pengiriman</th>
                        <th>Gaji</th>
                        <th>Claim</th>
                        <th>Refund Claim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailPengiriman.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                            Tidak ada data pengiriman
                          </td>
                        </tr>
                      ) : (
                        detailPengiriman.map((pengiriman) => (
                          <tr key={pengiriman.id_pengiriman}>
                            <td>{pengiriman.id_pengiriman}</td>
                            <td>{new Date(pengiriman.tanggal_pengiriman).toLocaleDateString("id-ID")}</td>
                            <td>{pengiriman.total_barang_dikirim || 0}</td>
                            <td>{formatRupiah(pengiriman.total_bayar || 0)}</td>
                            <td>{formatRupiah(pengiriman.claim || 0)}</td>
                            <td>{formatRupiah(pengiriman.refund_claim || 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Pembayaran */}
      {showForm && (
        <div className="pendapatan-modal-overlay" onClick={handleCloseModal}>
          <div className="pendapatan-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="pendapatan-modal-header">
              <h2>Tambah Data Pendapatan</h2>
              <button className="pendapatan-modal-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>
            <div className="pendapatan-modal-body">
              <form onSubmit={handleTambahPendapatan} className="pendapatan-form">
                <div className="pendapatan-form-group">
                  <label>ID Penjahit</label>
                  <input type="text" value={selectedPenjahit?.id_penjahit || ""} readOnly />
                </div>

                <div className="pendapatan-form-group">
                  <label>Nama Penjahit</label>
                  <input type="text" value={selectedPenjahit?.nama_penjahit || ""} readOnly />
                </div>

                <div className="pendapatan-form-group">
                  <label>Total Pendapatan</label>
                  <input type="text" value={formatRupiah(simulasi.total_pendapatan || 0)} readOnly />
                </div>

                <div className="pendapatan-form-group">
                  <label>Potongan Hutang</label>
                  <input type="text" value={formatRupiah(simulasi.potongan_hutang || 0)} readOnly />
                </div>

                <div className="pendapatan-form-group">
                  <label>Potongan Cashbon</label>
                  <input type="text" value={formatRupiah(simulasi.potongan_cashbon || 0)} readOnly />
                </div>

                <div className="pendapatan-form-group">
                  <label>Potongan Aksesoris</label>
                  <input type="text" value={formatRupiah(simulasi.potongan_aksesoris || 0)} readOnly />
                </div>

                <div className="pendapatan-form-group">
                  <label>Potongan Claim</label>
                  <input type="text" value={formatRupiah(simulasi.total_claim || 0)} readOnly />
                </div>

                <div className="pendapatan-checkbox-group">
                  <label>
                    <input type="checkbox" checked={kurangiHutang} onChange={(e) => setKurangiHutang(e.target.checked)} />
                    Potong Hutang
                  </label>
                </div>

                <div className="pendapatan-checkbox-group">
                  <label>
                    <input type="checkbox" checked={kurangiCashbon} onChange={(e) => setKurangiCashbon(e.target.checked)} />
                    Potong Cashbon
                  </label>
                </div>

                {detailAksesoris.length > 0 && (
                  <div className="pendapatan-checkbox-group">
                    <label style={{ marginBottom: "8px", fontWeight: "600" }}>Potong Aksesoris:</label>
                    {detailAksesoris.map((item) => (
                      <div key={item.id} className="pendapatan-checkbox-item">
                        <label>
                          <input
                            type="checkbox"
                            value={item.id}
                            checked={aksesorisDipilih.includes(item.id)}
                            onChange={(e) => {
                              const id = parseInt(e.target.value);
                              if (e.target.checked) {
                                setAksesorisDipilih([...aksesorisDipilih, id]);
                              } else {
                                setAksesorisDipilih(aksesorisDipilih.filter((itemId) => itemId !== id));
                              }
                            }}
                          />
                          {item.aksesoris.nama_aksesoris} - {formatRupiah(parseInt(item.total_harga))}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pendapatan-checkbox-group">
                  <label style={{ marginBottom: "8px", fontWeight: "600" }}>Potong Claim:</label>
                  {claimBelumDibayar.length > 0 ? (
                    claimBelumDibayar.map((claim) => (
                      <div key={claim.id_pengiriman} className="pendapatan-checkbox-item">
                        <label>
                          <input
                            type="checkbox"
                            value={claim.id_pengiriman}
                            checked={claimDipilih.includes(claim.id_pengiriman)}
                            onChange={(e) => {
                              const id = parseInt(e.target.value);
                              if (e.target.checked) {
                                setClaimDipilih([...claimDipilih, id]);
                              } else {
                                setClaimDipilih(claimDipilih.filter((itemId) => itemId !== id));
                              }
                            }}
                          />
                          ID Pengiriman: {claim.id_pengiriman} - Tanggal: {new Date(claim.tanggal_pengiriman).toLocaleDateString("id-ID")} - Claim: {formatRupiah(parseInt(claim.claim))}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "8px", color: "#94a3b8", fontStyle: "italic" }}>Tidak ada claim yang belum dibayar</div>
                  )}
                </div>

                <div className="pendapatan-form-group pendapatan-total-transfer">
                  <label>Total Transfer</label>
                  <input type="text" value={formatRupiah(simulasi.total_transfer || 0)} readOnly />
                </div>

                <div className="pendapatan-form-group">
                  <label>Upload Bukti Transfer</label>
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => setBuktiTransfer(e.target.files[0])} />
                </div>

                <div className="pendapatan-form-actions">
                  <button type="button" className="pendapatan-btn pendapatan-btn-cancel" onClick={handleCloseModal}>
                    Batal
                  </button>
                  <button type="submit" className="pendapatan-btn pendapatan-btn-submit" disabled={loading}>
                    {loading ? "Menyimpan..." : "Simpan"}
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

export default Pendapatan;
