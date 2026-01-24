import React, { useEffect, useState } from "react";
import "./PendapatanPabrik.css";
import API from "../../api";
import { FaMoneyBillWave, FaEye, FaCheck, FaBuilding } from "react-icons/fa";

const PendapatanPabrik = () => {
  const [pabrikList, setPabrikList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPabrik, setSelectedPabrik] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBayarModal, setShowBayarModal] = useState(false);
  const [pembelianList, setPembelianList] = useState([]);
  const [selectedPembelian, setSelectedPembelian] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingBayar, setLoadingBayar] = useState(false);

  // Form pembayaran
  const [formBayar, setFormBayar] = useState({
    tanggal_bayar: new Date().toISOString().split("T")[0],
    keterangan: "",
  });

  // Fetch list pabrik dengan total hutang
  useEffect(() => {
    const fetchPabrik = async () => {
      try {
        setLoading(true);
        const res = await API.get("/pendapatan-pabrik");
        if (res.data && res.data.success) {
          setPabrikList(res.data.data || []);
        } else {
          setPabrikList(res.data || []);
        }
      } catch (e) {
        setError("Gagal memuat data pabrik.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPabrik();
  }, []);

  // Handle lihat detail hutang
  const handleLihatDetail = async (pabrik) => {
    try {
      setLoadingDetail(true);
      const res = await API.get(`/pendapatan-pabrik/${pabrik.id}`);
      if (res.data && res.data.success) {
        setSelectedPabrik(res.data.pabrik || pabrik);
        setPembelianList(res.data.pembelian || []);
        setShowDetailModal(true);
      } else {
        setSelectedPabrik(pabrik);
        setPembelianList(res.data?.pembelian || []);
        setShowDetailModal(true);
      }
    } catch (e) {
      alert("Gagal memuat detail hutang.");
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle buka modal bayar
  const handleBukaBayar = async (pabrik) => {
    try {
      setLoadingDetail(true);
      const res = await API.get(`/pendapatan-pabrik/${pabrik.id}`);
      if (res.data && res.data.success) {
        setSelectedPabrik(res.data.pabrik || pabrik);
        setPembelianList(res.data.pembelian || []);
        setSelectedPembelian([]);
        setFormBayar({
          tanggal_bayar: new Date().toISOString().split("T")[0],
          keterangan: "",
        });
        setShowBayarModal(true);
      } else {
        setSelectedPabrik(pabrik);
        setPembelianList(res.data?.pembelian || []);
        setSelectedPembelian([]);
        setFormBayar({
          tanggal_bayar: new Date().toISOString().split("T")[0],
          keterangan: "",
        });
        setShowBayarModal(true);
      }
    } catch (e) {
      alert("Gagal memuat data pembelian.");
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle toggle checkbox pembelian
  const handleTogglePembelian = (pembelianId) => {
    setSelectedPembelian((prev) => {
      if (prev.includes(pembelianId)) {
        return prev.filter((id) => id !== pembelianId);
      } else {
        return [...prev, pembelianId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedPembelian.length === pembelianList.length) {
      setSelectedPembelian([]);
    } else {
      setSelectedPembelian(pembelianList.map((p) => p.id));
    }
  };

  // Handle submit pembayaran
  const handleSubmitBayar = async (e) => {
    e.preventDefault();

    if (selectedPembelian.length === 0) {
      alert("Silakan pilih minimal 1 pembelian yang akan dibayar.");
      return;
    }

    if (!formBayar.tanggal_bayar) {
      alert("Tanggal bayar wajib diisi.");
      return;
    }

    try {
      setLoadingBayar(true);
      const res = await API.post("/pendapatan-pabrik", {
        pabrik_id: selectedPabrik.id,
        tanggal_bayar: formBayar.tanggal_bayar,
        keterangan: formBayar.keterangan || null,
        pembelian_ids: selectedPembelian,
      });

      if (res.data && res.data.success) {
        alert("Pembayaran berhasil!");
        setShowBayarModal(false);
        setSelectedPabrik(null);
        setPembelianList([]);
        setSelectedPembelian([]);

        // Refresh list pabrik
        const refreshRes = await API.get("/pendapatan-pabrik");
        if (refreshRes.data && refreshRes.data.success) {
          setPabrikList(refreshRes.data.data || []);
        } else {
          setPabrikList(refreshRes.data || []);
        }
      } else {
        alert(res.data?.message || "Pembayaran berhasil!");
        setShowBayarModal(false);
        // Refresh list
        const refreshRes = await API.get("/pendapatan-pabrik");
        if (refreshRes.data && refreshRes.data.success) {
          setPabrikList(refreshRes.data.data || []);
        } else {
          setPabrikList(refreshRes.data || []);
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Gagal melakukan pembayaran.";
      alert(errorMsg);
      console.error(err);
    } finally {
      setLoadingBayar(false);
    }
  };

  // Format rupiah
  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  // Filter pabrik
  const filteredPabrik = pabrikList.filter((p) => (p.nama_pabrik || "").toLowerCase().includes(searchTerm.toLowerCase()));

  // Hitung total yang dipilih
  const totalSelected = pembelianList
    .filter((p) => selectedPembelian.includes(p.id))
    .reduce((sum, p) => sum + (parseFloat(p.harga) || 0), 0);

  return (
    <div className="pendapatan-pabrik-page">
      <div className="pendapatan-pabrik-header">
        <div className="pendapatan-pabrik-header-icon">
          <FaMoneyBillWave />
        </div>
        <h1>Pendapatan Pabrik</h1>
      </div>

      <div className="pendapatan-pabrik-table-container">
        <div className="pendapatan-pabrik-filter-header">
          <div className="pendapatan-pabrik-search-bar">
            <input
              type="text"
              placeholder="Cari nama pabrik..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="pendapatan-pabrik-loading">Memuat data...</p>
        ) : error ? (
          <p className="pendapatan-pabrik-error">{error}</p>
        ) : filteredPabrik.length === 0 ? (
          <p className="pendapatan-pabrik-loading">Belum ada data pabrik dengan hutang</p>
        ) : (
          <table className="pendapatan-pabrik-table">
            <thead>
              <tr>
                <th>NO</th>
                <th>NAMA PABRIK</th>
                <th>TOTAL HUTANG</th>
                <th style={{ textAlign: "center" }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredPabrik.map((pabrik, index) => (
                <tr key={pabrik.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FaBuilding style={{ color: "#0487d8", fontSize: "18px" }} />
                      <span>{pabrik.nama_pabrik}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`pendapatan-pabrik-badge ${parseFloat(pabrik.total_hutang || 0) > 0 ? "hutang" : "lunas"}`}>
                      {formatRupiah(pabrik.total_hutang || 0)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        className="pendapatan-pabrik-btn-icon view"
                        onClick={() => handleLihatDetail(pabrik)}
                        title="Lihat Detail"
                      >
                        <FaEye /> Detail
                      </button>
                      {parseFloat(pabrik.total_hutang || 0) > 0 && (
                        <button
                          className="pendapatan-pabrik-btn-icon bayar"
                          onClick={() => handleBukaBayar(pabrik)}
                          title="Bayar Hutang"
                        >
                          <FaCheck /> Bayar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Detail Hutang */}
      {showDetailModal && selectedPabrik && (
        <div className="pendapatan-pabrik-modal" onClick={() => setShowDetailModal(false)}>
          <div className="pendapatan-pabrik-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pendapatan-pabrik-modal-header">
              <h2>Detail Hutang - {selectedPabrik.nama_pabrik}</h2>
              <button onClick={() => setShowDetailModal(false)} className="pendapatan-pabrik-modal-close">
                ×
              </button>
            </div>

            {loadingDetail ? (
              <p className="pendapatan-pabrik-loading">Memuat data...</p>
            ) : pembelianList.length === 0 ? (
              <p className="pendapatan-pabrik-loading">Tidak ada pembelian yang belum dibayar</p>
            ) : (
              <div className="pendapatan-pabrik-modal-body">
                <div className="pendapatan-pabrik-info-card">
                  <div className="pendapatan-pabrik-info-item">
                    <strong>Total Hutang:</strong>
                    <span className="pendapatan-pabrik-total-hutang">
                      {formatRupiah(pembelianList.reduce((sum, p) => sum + (parseFloat(p.harga) || 0), 0))}
                    </span>
                  </div>
                  <div className="pendapatan-pabrik-info-item">
                    <strong>Jumlah Pembelian:</strong>
                    <span>{pembelianList.length} item</span>
                  </div>
                </div>

                <div className="pendapatan-pabrik-detail-table-container">
                  <table className="pendapatan-pabrik-detail-table">
                    <thead>
                      <tr>
                        <th>NO</th>
                        <th>SPK BAHAN</th>
                        <th>BAHAN</th>
                        <th>TANGGAL KIRIM</th>
                        <th>HARGA</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pembelianList.map((pembelian, index) => (
                        <tr key={pembelian.id}>
                          <td>{index + 1}</td>
                          <td>
                            {pembelian.spkBahan ? (
                              <div>
                                <div>ID: {pembelian.spkBahan.id}</div>
                                {pembelian.spkBahan.status && (
                                  <div style={{ fontSize: "12px", color: "#666" }}>Status: {pembelian.spkBahan.status}</div>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>{pembelian.bahan?.nama_bahan || "-"}</td>
                          <td>{pembelian.tanggal_kirim || "-"}</td>
                          <td className="pendapatan-pabrik-price">{formatRupiah(pembelian.harga)}</td>
                          <td>
                            <span className={`pendapatan-pabrik-badge ${pembelian.status_bayar === "sudah" ? "lunas" : "belum"}`}>
                              {pembelian.status_bayar === "sudah" ? "Lunas" : "Belum Bayar"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pendapatan-pabrik-form-actions">
              <button
                className="pendapatan-pabrik-btn pendapatan-pabrik-btn-secondary"
                onClick={() => setShowDetailModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bayar */}
      {showBayarModal && selectedPabrik && (
        <div className="pendapatan-pabrik-modal" onClick={() => setShowBayarModal(false)}>
          <div className="pendapatan-pabrik-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px" }}>
            <div className="pendapatan-pabrik-modal-header">
              <h2>Bayar Hutang - {selectedPabrik.nama_pabrik}</h2>
              <button onClick={() => setShowBayarModal(false)} className="pendapatan-pabrik-modal-close">
                ×
              </button>
            </div>

            {loadingDetail ? (
              <p className="pendapatan-pabrik-loading">Memuat data...</p>
            ) : (
              <form onSubmit={handleSubmitBayar} className="pendapatan-pabrik-form">
                <div className="pendapatan-pabrik-form-group">
                  <label>Tanggal Bayar *</label>
                  <input
                    type="date"
                    value={formBayar.tanggal_bayar}
                    onChange={(e) => setFormBayar({ ...formBayar, tanggal_bayar: e.target.value })}
                    required
                  />
                </div>

                <div className="pendapatan-pabrik-form-group">
                  <label>Keterangan</label>
                  <textarea
                    value={formBayar.keterangan}
                    onChange={(e) => setFormBayar({ ...formBayar, keterangan: e.target.value })}
                    rows="3"
                    placeholder="Masukkan keterangan (opsional)"
                  />
                </div>

                <div className="pendapatan-pabrik-form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedPembelian.length === pembelianList.length && pembelianList.length > 0}
                      onChange={handleSelectAll}
                      style={{ marginRight: "8px" }}
                    />
                    Pilih Semua ({pembelianList.length} pembelian)
                  </label>
                </div>

                <div className="pendapatan-pabrik-detail-table-container" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <table className="pendapatan-pabrik-detail-table">
                    <thead>
                      <tr>
                        <th style={{ width: "50px" }}>
                          <input
                            type="checkbox"
                            checked={selectedPembelian.length === pembelianList.length && pembelianList.length > 0}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th>NO</th>
                        <th>SPK BAHAN</th>
                        <th>BAHAN</th>
                        <th>TANGGAL KIRIM</th>
                        <th>HARGA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pembelianList.map((pembelian, index) => (
                        <tr key={pembelian.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedPembelian.includes(pembelian.id)}
                              onChange={() => handleTogglePembelian(pembelian.id)}
                            />
                          </td>
                          <td>{index + 1}</td>
                          <td>
                            {pembelian.spkBahan ? (
                              <div>
                                <div>ID: {pembelian.spkBahan.id}</div>
                                {pembelian.spkBahan.status && (
                                  <div style={{ fontSize: "12px", color: "#666" }}>Status: {pembelian.spkBahan.status}</div>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>{pembelian.bahan?.nama_bahan || "-"}</td>
                          <td>{pembelian.tanggal_kirim || "-"}</td>
                          <td className="pendapatan-pabrik-price">{formatRupiah(pembelian.harga)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedPembelian.length > 0 && (
                  <div className="pendapatan-pabrik-total-section">
                    <div className="pendapatan-pabrik-total-item">
                      <strong>Total yang Dipilih:</strong>
                      <span className="pendapatan-pabrik-total-hutang">{formatRupiah(totalSelected)}</span>
                    </div>
                    <div className="pendapatan-pabrik-total-item">
                      <strong>Jumlah Item:</strong>
                      <span>{selectedPembelian.length} pembelian</span>
                    </div>
                  </div>
                )}

                <div className="pendapatan-pabrik-form-actions">
                  <button type="submit" className="pendapatan-pabrik-btn pendapatan-pabrik-btn-primary" disabled={loadingBayar || selectedPembelian.length === 0}>
                    {loadingBayar ? "Memproses..." : "Bayar"}
                  </button>
                  <button
                    type="button"
                    className="pendapatan-pabrik-btn pendapatan-pabrik-btn-secondary"
                    onClick={() => setShowBayarModal(false)}
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PendapatanPabrik;
