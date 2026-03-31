import React, { useEffect, useMemo, useState } from "react";
import "./PendapatanPabrik.css";
import API from "../../api";
import {
  FaMoneyBillWave,
  FaEye,
  FaCheck,
  FaBuilding,
  FaSearch,
  FaTimes,
  FaClipboardList,
  FaIndustry,
} from "react-icons/fa";

const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11";

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
  const [filterBulan, setFilterBulan] = useState("");

  const [formBayar, setFormBayar] = useState({
    tanggal_bayar: new Date().toISOString().split("T")[0],
    tanggal_jatuh_tempo: "",
    keterangan: "",
  });

  const ensureSweetAlert = () =>
    new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        resolve(null);
        return;
      }

      if (window.Swal) {
        resolve(window.Swal);
        return;
      }

      const existingScript = document.querySelector('script[data-sweetalert2="cdn"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.Swal), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Gagal memuat SweetAlert2")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.src = `${SWEETALERT_CDN}/dist/sweetalert2.all.min.js`;
      script.async = true;
      script.setAttribute("data-sweetalert2", "cdn");
      script.onload = () => resolve(window.Swal);
      script.onerror = () => reject(new Error("Gagal memuat SweetAlert2"));
      document.body.appendChild(script);
    });

  const showSuccessAlert = async (message) => {
    const fallbackMessage = message || "Pembayaran berhasil!";

    try {
      const Swal = await ensureSweetAlert();
      if (!Swal) {
        alert(fallbackMessage);
        return;
      }

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: fallbackMessage,
        confirmButtonText: "OK",
        confirmButtonColor: "#1d4ed8",
      });
    } catch (error) {
      alert(fallbackMessage);
    }
  };
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

  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const formatDateDisplay = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const resetPaymentForm = () => {
    setSelectedPembelian([]);
    setFilterBulan("");
    setFormBayar({
      tanggal_bayar: new Date().toISOString().split("T")[0],
      tanggal_jatuh_tempo: "",
      keterangan: "",
    });
  };

  const refreshPabrikList = async () => {
    const refreshRes = await API.get("/pendapatan-pabrik");
    if (refreshRes.data && refreshRes.data.success) {
      setPabrikList(refreshRes.data.data || []);
    } else {
      setPabrikList(refreshRes.data || []);
    }
  };

  const handleLihatDetail = async (pabrik) => {
    try {
      setLoadingDetail(true);
      const res = await API.get(`/pendapatan-pabrik/${pabrik.id}`);

      if (res.data && res.data.success) {
        setSelectedPabrik(res.data.pabrik || pabrik);
        setPembelianList(res.data.pembelian || []);
      } else {
        setSelectedPabrik(pabrik);
        setPembelianList(res.data?.pembelian || []);
      }

      setShowDetailModal(true);
    } catch (e) {
      alert("Gagal memuat detail hutang.");
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleBukaBayar = async (pabrik) => {
    try {
      setLoadingDetail(true);
      const res = await API.get(`/pendapatan-pabrik/${pabrik.id}`);

      if (res.data && res.data.success) {
        setSelectedPabrik(res.data.pabrik || pabrik);
        setPembelianList(res.data.pembelian || []);
      } else {
        setSelectedPabrik(pabrik);
        setPembelianList(res.data?.pembelian || []);
      }

      resetPaymentForm();
      setShowBayarModal(true);
    } catch (e) {
      alert("Gagal memuat data pembelian.");
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleTogglePembelian = (pembelianId) => {
    setSelectedPembelian((prev) => {
      if (prev.includes(pembelianId)) {
        return prev.filter((id) => id !== pembelianId);
      }
      return [...prev, pembelianId];
    });
  };

  const filteredPabrik = useMemo(
    () =>
      pabrikList.filter((p) =>
        (p.nama_pabrik || "").toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [pabrikList, searchTerm]
  );

  const filteredPembelianList = useMemo(
    () =>
      pembelianList.filter((pembelian) => {
        if (!filterBulan) return true;
        if (!pembelian.tanggal_kirim) return false;

        const bulanPembelian = pembelian.tanggal_kirim.substring(5, 7);
        return bulanPembelian === filterBulan;
      }),
    [pembelianList, filterBulan]
  );

  const totalHutangKeseluruhan = useMemo(
    () =>
      pabrikList.reduce(
        (sum, pabrik) => sum + (parseFloat(pabrik.total_hutang) || 0),
        0
      ),
    [pabrikList]
  );

  const jumlahPabrikOutstanding = useMemo(
    () => pabrikList.filter((p) => (parseFloat(p.total_hutang) || 0) > 0).length,
    [pabrikList]
  );

  const isAllFilteredSelected =
    filteredPembelianList.length > 0 &&
    filteredPembelianList.every((p) => selectedPembelian.includes(p.id));

  const handleSelectAll = () => {
    const filteredIds = filteredPembelianList.map((p) => p.id);

    if (isAllFilteredSelected) {
      setSelectedPembelian((prev) =>
        prev.filter((id) => !filteredIds.includes(id))
      );
      return;
    }

    setSelectedPembelian((prev) => {
      const newSelection = [...prev];
      filteredIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  const totalSelected = filteredPembelianList
    .filter((p) => selectedPembelian.includes(p.id))
    .reduce((sum, p) => sum + (parseFloat(p.harga) || 0), 0);

  const getAvailableMonths = () => {
    const months = [];
    for (let month = 1; month <= 12; month += 1) {
      months.push(String(month).padStart(2, "0"));
    }
    return months;
  };

  const formatMonthDisplay = (monthNumber) => {
    if (!monthNumber) return "Semua Bulan";
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const monthIndex = parseInt(monthNumber, 10) - 1;
    return monthNames[monthIndex] || monthNumber;
  };

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
        tanggal_jatuh_tempo: formBayar.tanggal_jatuh_tempo || null,
        keterangan: formBayar.keterangan || null,
        pembelian_ids: selectedPembelian,
      });
      const successMessage =
        (res.data && res.data.success
          ? "Pembayaran berhasil!"
          : res.data?.message) || "Pembayaran berhasil!";

      setShowBayarModal(false);
      setSelectedPabrik(null);
      setPembelianList([]);
      setSelectedPembelian([]);
      await refreshPabrikList();
      await showSuccessAlert(successMessage);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Gagal melakukan pembayaran.";
      alert(errorMsg);
      console.error(err);
    } finally {
      setLoadingBayar(false);
    }
  };

  return (
    <div className="pendapatan-pabrik-page">
      <div className="pendapatan-pabrik-shell">
        <section className="pendapatan-pabrik-content">
          <header className="pendapatan-pabrik-topbar">
            <div className="pendapatan-pabrik-title-group">
              <div className="pendapatan-pabrik-brand-icon">
                <FaMoneyBillWave />
              </div>
              <div className="pendapatan-pabrik-brand-text">
                <h1>Pendapatan Pabrik</h1>
                <p>Monitoring dan pembayaran hutang pembelian bahan baku</p>
              </div>
            </div>

            <div className="pendapatan-pabrik-toolbar">
              <div className="pendapatan-pabrik-search-bar">
                <FaSearch className="pendapatan-pabrik-search-icon" />
                <input
                  type="text"
                  placeholder="Cari nama pabrik..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </header>

          <main className="pendapatan-pabrik-main">
            <section className="pendapatan-pabrik-kpi-grid">
              <article className="pendapatan-pabrik-kpi-card">
                <div className="kpi-icon is-indigo">
                  <FaIndustry />
                </div>
                <div>
                  <p>Total Pabrik</p>
                  <h3>{pabrikList.length}</h3>
                </div>
              </article>

              <article className="pendapatan-pabrik-kpi-card">
                <div className="kpi-icon is-red">
                  <FaMoneyBillWave />
                </div>
                <div>
                  <p>Total Hutang</p>
                  <h3>{formatRupiah(totalHutangKeseluruhan)}</h3>
                </div>
              </article>

              <article className="pendapatan-pabrik-kpi-card">
                <div className="kpi-icon is-amber">
                  <FaClipboardList />
                </div>
                <div>
                  <p>Pabrik Outstanding</p>
                  <h3>{jumlahPabrikOutstanding}</h3>
                </div>
              </article>
            </section>

            <section className="pendapatan-pabrik-table-card">
              <div className="pendapatan-pabrik-table-header">
                <div>
                  <h2>Daftar Hutang Pabrik</h2>
                  <p>
                    Menampilkan {filteredPabrik.length} dari {pabrikList.length} pabrik
                  </p>
                </div>
              </div>

              <div className="pendapatan-pabrik-table-wrap">
                {loading ? (
                  <p className="pendapatan-pabrik-loading">Memuat data...</p>
                ) : error ? (
                  <p className="pendapatan-pabrik-error">{error}</p>
                ) : filteredPabrik.length === 0 ? (
                  <p className="pendapatan-pabrik-loading">
                    Tidak ada data pabrik yang sesuai pencarian.
                  </p>
                ) : (
                  <table className="pendapatan-pabrik-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Nama Pabrik</th>
                        <th>Total Hutang</th>
                        <th className="text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPabrik.map((pabrik, index) => {
                        const totalHutang = parseFloat(pabrik.total_hutang) || 0;

                        return (
                          <tr key={pabrik.id}>
                            <td>{index + 1}</td>
                            <td>
                              <div className="pendapatan-pabrik-name-cell">
                                <span className="factory-icon">
                                  <FaBuilding />
                                </span>
                                <span>{pabrik.nama_pabrik}</span>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`pendapatan-pabrik-badge ${
                                  totalHutang > 0 ? "hutang" : "lunas"
                                }`}
                              >
                                {formatRupiah(totalHutang)}
                              </span>
                            </td>
                            <td>
                              <div className="pendapatan-pabrik-actions-cell">
                                <button
                                  className="pendapatan-pabrik-action-btn neutral"
                                  onClick={() => handleLihatDetail(pabrik)}
                                  title="Lihat detail"
                                >
                                  <FaEye />
                                  Detail
                                </button>
                                {totalHutang > 0 && (
                                  <button
                                    className="pendapatan-pabrik-action-btn primary"
                                    onClick={() => handleBukaBayar(pabrik)}
                                    title="Bayar hutang"
                                  >
                                    <FaCheck />
                                    Bayar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </main>
        </section>
      </div>

      {showDetailModal && selectedPabrik && (
        <div className="pendapatan-pabrik-modal" role="dialog" aria-modal="true">
          <div
            className="pendapatan-pabrik-modal-backdrop"
            onClick={() => setShowDetailModal(false)}
          />
          <div className="pendapatan-pabrik-modal-content">
            <div className="pendapatan-pabrik-modal-header">
              <div>
                <h2>Detail Hutang</h2>
                <p>{selectedPabrik.nama_pabrik}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="pendapatan-pabrik-modal-close"
                type="button"
                aria-label="Tutup modal"
              >
                <FaTimes />
              </button>
            </div>

            {loadingDetail ? (
              <div className="pendapatan-pabrik-modal-scroll">
                <p className="pendapatan-pabrik-loading">Memuat data...</p>
              </div>
            ) : pembelianList.length === 0 ? (
              <div className="pendapatan-pabrik-modal-scroll">
                <p className="pendapatan-pabrik-loading">
                  Tidak ada pembelian yang belum dibayar.
                </p>
              </div>
            ) : (
              <div className="pendapatan-pabrik-modal-scroll">
                <div className="pendapatan-pabrik-modal-body">
                  <div className="pendapatan-pabrik-info-card">
                    <div className="pendapatan-pabrik-info-item">
                      <strong>Total Hutang</strong>
                      <span className="pendapatan-pabrik-total-hutang">
                        {formatRupiah(
                          pembelianList.reduce(
                            (sum, p) => sum + (parseFloat(p.harga) || 0),
                            0
                          )
                        )}
                      </span>
                    </div>
                    <div className="pendapatan-pabrik-info-item">
                      <strong>Jumlah Pembelian</strong>
                      <span>{pembelianList.length} item</span>
                    </div>
                  </div>

                  <div className="pendapatan-pabrik-detail-table-container">
                    <table className="pendapatan-pabrik-detail-table">
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>SPK Bahan</th>
                          <th>Bahan</th>
                          <th>Tanggal Kirim</th>
                          <th>Harga</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pembelianList.map((pembelian, index) => (
                          <tr key={pembelian.id} className={selectedPembelian.includes(pembelian.id) ? "is-selected" : ""}>
                            <td>{index + 1}</td>
                            <td>
                              {pembelian.spkBahan ? (
                                <div className="pendapatan-pabrik-spk-meta">
                                  <div>ID: {pembelian.spkBahan.id}</div>
                                  {pembelian.spkBahan.status && (
                                    <small>Status: {pembelian.spkBahan.status}</small>
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>{pembelian.bahan?.nama_bahan || "-"}</td>
                            <td>{formatDateDisplay(pembelian.tanggal_kirim)}</td>
                            <td className="pendapatan-pabrik-price">
                              {formatRupiah(pembelian.harga)}
                            </td>
                            <td>
                              <span
                                className={`pendapatan-pabrik-badge ${
                                  pembelian.status_bayar === "sudah"
                                    ? "lunas"
                                    : "belum"
                                }`}
                              >
                                {pembelian.status_bayar === "sudah"
                                  ? "Lunas"
                                  : "Belum Bayar"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="pendapatan-pabrik-modal-footer">
              <button
                className="pendapatan-pabrik-btn pendapatan-pabrik-btn-secondary"
                onClick={() => setShowDetailModal(false)}
                type="button"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showBayarModal && selectedPabrik && (
        <div className="pendapatan-pabrik-modal" role="dialog" aria-modal="true">
          <div
            className="pendapatan-pabrik-modal-backdrop"
            onClick={() => setShowBayarModal(false)}
          />
          <div className="pendapatan-pabrik-modal-content wide">
            <div className="pendapatan-pabrik-modal-header">
              <div>
                <h2>Pembayaran Hutang</h2>
                <p>{selectedPabrik.nama_pabrik}</p>
              </div>
              <button
                onClick={() => setShowBayarModal(false)}
                className="pendapatan-pabrik-modal-close"
                type="button"
                aria-label="Tutup modal"
              >
                <FaTimes />
              </button>
            </div>

            {loadingDetail ? (
              <div className="pendapatan-pabrik-modal-scroll">
                <p className="pendapatan-pabrik-loading">Memuat data...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitBayar} className="pendapatan-pabrik-form">
                <div className="pendapatan-pabrik-form-body">
                  <div className="pendapatan-pabrik-form-row">
                    <div className="pendapatan-pabrik-form-group">
                      <label>Tanggal Bayar *</label>
                      <input
                        type="date"
                        value={formBayar.tanggal_bayar}
                        onChange={(e) =>
                          setFormBayar({ ...formBayar, tanggal_bayar: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="pendapatan-pabrik-form-group">
                      <label>Tanggal Jatuh Tempo</label>
                      <input
                        type="date"
                        value={formBayar.tanggal_jatuh_tempo}
                        onChange={(e) =>
                          setFormBayar({
                            ...formBayar,
                            tanggal_jatuh_tempo: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="pendapatan-pabrik-form-group">
                    <label>Keterangan</label>
                    <textarea
                      value={formBayar.keterangan}
                      onChange={(e) =>
                        setFormBayar({ ...formBayar, keterangan: e.target.value })
                      }
                      rows="3"
                      placeholder="Masukkan keterangan (opsional)"
                    />
                  </div>

                  <div className="pendapatan-pabrik-form-row">
                    <div className="pendapatan-pabrik-form-group">
                      <label>Filter Bulan Pengiriman</label>
                      <select
                        value={filterBulan}
                        onChange={(e) => {
                          setFilterBulan(e.target.value);
                          setSelectedPembelian([]);
                        }}
                      >
                        <option value="">Semua Bulan</option>
                        {getAvailableMonths().map((month) => (
                          <option key={month} value={month}>
                            {formatMonthDisplay(month)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pendapatan-pabrik-form-group">
                      <label>Pemilihan Massal</label>
                      <label className="pendapatan-pabrik-check-label">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={handleSelectAll}
                        />
                        <span>
                          Pilih semua ({filteredPembelianList.length} pembelian
                          {filterBulan ? ` - ${formatMonthDisplay(filterBulan)}` : ""})
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="pendapatan-pabrik-detail-table-container fixed-height">
                    <table className="pendapatan-pabrik-detail-table">
                      <thead>
                        <tr>
                          <th className="checkbox-column">
                            <input
                              type="checkbox"
                              checked={isAllFilteredSelected}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th>No</th>
                          <th>SPK Bahan</th>
                          <th>Bahan</th>
                          <th>Tanggal Kirim</th>
                          <th>Harga</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPembelianList.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="pendapatan-pabrik-empty-row">
                              {filterBulan
                                ? `Tidak ada pembelian pada ${formatMonthDisplay(
                                    filterBulan
                                  )}`
                                : "Tidak ada pembelian"}
                            </td>
                          </tr>
                        ) : (
                          filteredPembelianList.map((pembelian, index) => (
                            <tr key={pembelian.id} className={selectedPembelian.includes(pembelian.id) ? "is-selected" : ""}>
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
                                  <div className="pendapatan-pabrik-spk-meta">
                                    <div>ID: {pembelian.spkBahan.id}</div>
                                    {pembelian.spkBahan.status && (
                                      <small>Status: {pembelian.spkBahan.status}</small>
                                    )}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>{pembelian.bahan?.nama_bahan || "-"}</td>
                              <td>{formatDateDisplay(pembelian.tanggal_kirim)}</td>
                              <td className="pendapatan-pabrik-price">
                                {formatRupiah(pembelian.harga)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {selectedPembelian.length > 0 && (
                    <div className="pendapatan-pabrik-total-section">
                      <div className="pendapatan-pabrik-total-item">
                        <strong>Total yang Dipilih</strong>
                        <span className="pendapatan-pabrik-total-hutang">
                          {formatRupiah(totalSelected)}
                        </span>
                      </div>
                      <div className="pendapatan-pabrik-total-item">
                        <strong>Jumlah Item</strong>
                        <span>{selectedPembelian.length} pembelian</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pendapatan-pabrik-modal-footer is-form">
                  <button
                    type="submit"
                    className="pendapatan-pabrik-btn pendapatan-pabrik-btn-primary"
                    disabled={loadingBayar || selectedPembelian.length === 0}
                  >
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



