import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./HasilJasa.css";
import API from "../../api";
import {
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiDollarSign,
  FiPackage,
  FiPlus,
  FiSearch,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";

const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js";

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatRupiah = (angka) => {
  if (angka === null || angka === undefined || angka === "") return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(safeNumber(angka));
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getQualityStatus = (row) => {
  const hasil = safeNumber(row?.jumlah_hasil);
  const rusak = safeNumber(row?.jumlah_rusak);

  if (hasil === 0 && rusak === 0) {
    return { label: "Belum ada output", className: "neutral" };
  }

  if (rusak === 0) {
    return { label: "Sangat baik", className: "good" };
  }

  const defectRate = rusak / Math.max(hasil + rusak, 1);

  if (defectRate <= 0.05) {
    return { label: "Perlu monitor", className: "watch" };
  }

  return { label: "Perlu evaluasi", className: "risk" };
};

const EMPTY_META = {
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 0,
  from: 0,
  to: 0,
};

const EMPTY_SUMMARY = {
  total_transaksi: 0,
  total_hasil: 0,
  total_rusak: 0,
  total_pendapatan: 0,
  good_rate: 0,
};

const getSummaryFromRows = (rows) => {
  const totalTransaksi = rows.length;
  const totalHasil = rows.reduce((sum, row) => sum + safeNumber(row.jumlah_hasil), 0);
  const totalRusak = rows.reduce((sum, row) => sum + safeNumber(row.jumlah_rusak), 0);
  const totalPendapatan = rows.reduce((sum, row) => sum + safeNumber(row.total_pendapatan), 0);
  const totalOutput = totalHasil + totalRusak;

  return {
    total_transaksi: totalTransaksi,
    total_hasil: totalHasil,
    total_rusak: totalRusak,
    total_pendapatan: totalPendapatan,
    good_rate: totalOutput > 0 ? Number(((totalHasil / totalOutput) * 100).toFixed(1)) : 0,
  };
};

const HasilJasa = () => {
  const ensureSweetAlert = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (window.Swal) {
          resolve(window.Swal);
          return;
        }

        const existingScript = document.querySelector('script[data-sweetalert2="cdn"]');
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(window.Swal), { once: true });
          existingScript.addEventListener("error", reject, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = SWEETALERT_CDN;
        script.async = true;
        script.setAttribute("data-sweetalert2", "cdn");
        script.onload = () => resolve(window.Swal);
        script.onerror = reject;
        document.body.appendChild(script);
      }),
    []
  );

  const showStatusAlert = useCallback(
    async (icon, title, text) => {
      try {
        const Swal = await ensureSweetAlert();
        if (!Swal) throw new Error("SweetAlert2 tidak tersedia");

        await Swal.fire({
          icon: icon || "info",
          title: title || "Informasi",
          text: text || "",
          confirmButtonText: "OK",
          buttonsStyling: false,
          customClass: {
            popup: "hj-swal-popup",
            confirmButton: "hj-swal-btn hj-swal-btn-primary",
          },
        });

        return true;
      } catch (alertError) {
        console.error("Gagal menampilkan SweetAlert:", alertError);
        window.alert(text || title || "Terjadi kesalahan");
        return false;
      }
    },
    [ensureSweetAlert]
  );

  const [hasilJasa, setHasilJasa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [pagination, setPagination] = useState(EMPTY_META);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [reloadKey, setReloadKey] = useState(0);

  const [spkJasaList, setSpkJasaList] = useState([]);
  const [newHasilJasa, setNewHasilJasa] = useState({
    spk_jasa_id: "",
    tanggal: "",
    jumlah_hasil: "",
    jumlah_rusak: 0,
  });

  const requestIdRef = useRef(0);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);

  useEffect(() => {
    let active = true;
    const requestId = ++requestIdRef.current;

    const fetchHasilJasa = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          page: currentPage,
          per_page: perPage,
          search_mode: "smart",
        };

        if (debouncedSearch) {
          params.search = debouncedSearch;
        }

        const response = await API.get("/HasilJasa", { params });
        if (!active || requestId !== requestIdRef.current) return;

        const payload = response.data;

        if (Array.isArray(payload)) {
          setHasilJasa(payload);
          setPagination({
            current_page: 1,
            last_page: 1,
            per_page: payload.length,
            total: payload.length,
            from: payload.length ? 1 : 0,
            to: payload.length,
          });
          setSummary(getSummaryFromRows(payload));
          return;
        }

        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const meta = payload?.meta || {};
        const responseSummary = payload?.summary || {};

        setHasilJasa(rows);
        setPagination({
          current_page: safeNumber(meta.current_page) || currentPage,
          last_page: safeNumber(meta.last_page) || 1,
          per_page: safeNumber(meta.per_page) || perPage,
          total: safeNumber(meta.total),
          from: meta.from ?? (rows.length ? (currentPage - 1) * perPage + 1 : 0),
          to: meta.to ?? (rows.length ? (currentPage - 1) * perPage + rows.length : 0),
        });

        setSummary({
          total_transaksi: safeNumber(responseSummary.total_transaksi),
          total_hasil: safeNumber(responseSummary.total_hasil),
          total_rusak: safeNumber(responseSummary.total_rusak),
          total_pendapatan: safeNumber(responseSummary.total_pendapatan),
          good_rate: Number.isFinite(Number(responseSummary.good_rate))
            ? Number(responseSummary.good_rate)
            : 0,
        });
      } catch (fetchError) {
        if (!active || requestId !== requestIdRef.current) return;

        console.error("Error fetching Hasil Jasa:", fetchError);
        setError("Gagal mengambil data hasil jasa");
        setHasilJasa([]);
        setPagination(EMPTY_META);
        setSummary(EMPTY_SUMMARY);
      } finally {
        if (active && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchHasilJasa();

    return () => {
      active = false;
    };
  }, [currentPage, perPage, debouncedSearch, reloadKey]);

  useEffect(() => {
    const fetchSpkJasa = async () => {
      try {
        const res = await API.get("/SpkJasa?per_page=1000&status=sudah_diambil");
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.data || res.data || [];
        setSpkJasaList(data);
      } catch (fetchError) {
        console.error("Gagal fetch SPK Jasa:", fetchError);
        setSpkJasaList([]);
      }
    };

    fetchSpkJasa();
  }, []);

  const goodRate = useMemo(() => {
    if (Number.isFinite(Number(summary.good_rate))) {
      return Number(summary.good_rate).toFixed(1);
    }

    const totalOutput = safeNumber(summary.total_hasil) + safeNumber(summary.total_rusak);
    if (!totalOutput) return "0.0";

    return ((safeNumber(summary.total_hasil) / totalOutput) * 100).toFixed(1);
  }, [summary]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setNewHasilJasa((prev) => ({
      ...prev,
      [name]:
        name === "jumlah_rusak" || name === "jumlah_hasil"
          ? value === ""
            ? ""
            : parseInt(value, 10) || 0
          : value,
    }));
  };

  const resetForm = () => {
    setNewHasilJasa({
      spk_jasa_id: "",
      tanggal: "",
      jumlah_hasil: "",
      jumlah_rusak: 0,
    });
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setShowForm(false);
    resetForm();
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      await API.post("/HasilJasa", {
        spk_jasa_id: newHasilJasa.spk_jasa_id,
        tanggal: newHasilJasa.tanggal,
        jumlah_hasil: newHasilJasa.jumlah_hasil,
        jumlah_rusak: newHasilJasa.jumlah_rusak || 0,
      });

      await showStatusAlert("success", "Berhasil", "Hasil jasa berhasil ditambahkan.");
      setShowForm(false);
      resetForm();

      setCurrentPage(1);
      setReloadKey((prev) => prev + 1);
    } catch (submitError) {
      console.error("Full error:", submitError);
      console.error("Error response:", submitError.response?.data);
      await showStatusAlert(
        "error",
        "Gagal Menyimpan",
        submitError.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan hasil jasa."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePerPageChange = (e) => {
    const nextPerPage = parseInt(e.target.value, 10) || 25;
    setPerPage(nextPerPage);
    setCurrentPage(1);
  };

  const totalRows = safeNumber(pagination.total);
  const fromRow = safeNumber(pagination.from);
  const toRow = safeNumber(pagination.to);
  const lastPage = Math.max(1, safeNumber(pagination.last_page) || 1);

  return (
    <div className="hasil-jasa-page">
      <div className="hasil-jasa-shell">
        <header className="hasil-jasa-topbar">
          <div className="hasil-jasa-title-group">
            <div className="hasil-jasa-brand-icon">
              <FiClipboard />
            </div>
            <div className="hasil-jasa-title-wrap">
              <div className="hasil-jasa-module-pill">Modul Jasa</div>
              <h1>Hasil Jasa</h1>
              <p className="hasil-jasa-subtitle">Monitoring output, kualitas, dan nilai jasa produksi harian</p>
            </div>
          </div>

          <button className="hasil-jasa-btn-add" onClick={() => setShowForm(true)}>
            <FiPlus />
            Tambah Hasil
          </button>
        </header>

        <div className="hasil-jasa-toolbar">
          <div className="hasil-jasa-search-bar">
            <FiSearch className="hasil-jasa-search-icon" />
            <input
              type="text"
              placeholder="Cari ID, seri distribusi, tukang jasa, atau produk"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="hasil-jasa-toolbar-meta">
            <FiTrendingUp />
            Rasio output baik: {goodRate}%
          </div>
        </div>

        <section className="hasil-jasa-kpi-grid">
          <article className="hasil-jasa-kpi-card">
            <div className="hasil-jasa-kpi-icon blue">
              <FiClipboard />
            </div>
            <div>
              <p>Total Transaksi</p>
              <h3>{safeNumber(summary.total_transaksi).toLocaleString("id-ID")}</h3>
            </div>
          </article>

          <article className="hasil-jasa-kpi-card">
            <div className="hasil-jasa-kpi-icon cyan">
              <FiPackage />
            </div>
            <div>
              <p>Total Hasil</p>
              <h3>{safeNumber(summary.total_hasil).toLocaleString("id-ID")}</h3>
            </div>
          </article>

          <article className="hasil-jasa-kpi-card">
            <div className="hasil-jasa-kpi-icon amber">
              <FiAlertTriangle />
            </div>
            <div>
              <p>Total Rusak</p>
              <h3>{safeNumber(summary.total_rusak).toLocaleString("id-ID")}</h3>
            </div>
          </article>

          <article className="hasil-jasa-kpi-card">
            <div className="hasil-jasa-kpi-icon green">
              <FiDollarSign />
            </div>
            <div>
              <p>Total Pendapatan</p>
              <h3>{formatRupiah(summary.total_pendapatan)}</h3>
            </div>
          </article>
        </section>

        <section className="hasil-jasa-table-card">
          <div className="hasil-jasa-table-header">
            <div>
              <h2>Daftar Hasil Jasa</h2>
              <p>
                Menampilkan {fromRow} - {toRow} dari {totalRows} data
              </p>
            </div>
          </div>

          {loading ? (
            <div className="hasil-jasa-state">Memuat data hasil jasa...</div>
          ) : error ? (
            <div className="hasil-jasa-state error">{error}</div>
          ) : hasilJasa.length === 0 ? (
            <div className="hasil-jasa-empty-state">
              <div className="hasil-jasa-empty-icon">
                <FiClipboard />
              </div>
              <h4>Data tidak ditemukan</h4>
              <p>Sesuaikan kata kunci pencarian atau tambahkan data hasil jasa baru.</p>
            </div>
          ) : (
            <>
              <div className="hasil-jasa-table-wrapper">
                <table className="hasil-jasa-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Tukang Jasa</th>
                      <th>Distribusi Seri</th>
                      <th>Nama Produk</th>
                      <th>Jumlah Hasil</th>
                      <th>Jumlah Rusak</th>
                      <th>Status Kualitas</th>
                      <th>Total Bayar</th>
                      <th>Tanggal Input</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hasilJasa.map((hasil, index) => {
                      const distribusi =
                        hasil.spk_jasa?.spkCuttingDistribusi ||
                        hasil.spk_jasa?.spk_cutting_distribusi;
                      const spkCutting =
                        distribusi?.spkCutting || distribusi?.spk_cutting;
                      const produk = spkCutting?.produk || hasil.spk_jasa?.produk;

                      const namaProduk = produk?.nama_produk || "-";
                      const kodeSeri = distribusi?.kode_seri || "-";
                      const quality = getQualityStatus(hasil);
                      const rowNumber = fromRow ? fromRow + index : index + 1;

                      return (
                        <tr key={hasil.id}>
                          <td>{rowNumber}</td>
                          <td className="text-strong">
                            {hasil.spk_jasa?.tukang_jasa?.nama || "-"}
                          </td>
                          <td className="text-mono">{kodeSeri}</td>
                          <td>{namaProduk}</td>
                          <td>{safeNumber(hasil.jumlah_hasil).toLocaleString("id-ID")}</td>
                          <td>{safeNumber(hasil.jumlah_rusak).toLocaleString("id-ID")}</td>
                          <td>
                            <span className={`hasil-jasa-quality ${quality.className}`}>
                              {quality.label}
                            </span>
                          </td>
                          <td className="text-money">
                            {formatRupiah(hasil.total_pendapatan || 0)}
                          </td>
                          <td>{formatDate(hasil.tanggal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="hasil-jasa-table-footer">
                <div className="hasil-jasa-page-info">
                  Menampilkan {fromRow} - {toRow} dari {totalRows} data
                </div>

                <div className="hasil-jasa-page-controls">
                  <label htmlFor="hasil-jasa-per-page">Baris</label>
                  <select
                    id="hasil-jasa-per-page"
                    value={perPage}
                    onChange={handlePerPageChange}
                    disabled={loading}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>

                  <button
                    type="button"
                    className="page-btn"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={loading || currentPage <= 1}
                  >
                    <FiChevronLeft />
                  </button>

                  <span className="page-indicator">
                    Halaman {currentPage} / {lastPage}
                  </span>

                  <button
                    type="button"
                    className="page-btn"
                    onClick={() => setCurrentPage((prev) => Math.min(lastPage, prev + 1))}
                    disabled={loading || currentPage >= lastPage}
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {showForm && (
        <div className="hasil-jasa-modal" onClick={handleCloseModal}>
          <div
            className="hasil-jasa-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hasil-jasa-modal-header">
              <div>
                <h2>Input Hasil Jasa</h2>
                <p>Lengkapi detail hasil produksi untuk pencatatan operasional</p>
              </div>
              <button
                className="hasil-jasa-modal-close"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="hasil-jasa-form">
              <div className="hasil-jasa-form-group full-width">
                <label>SPK Jasa</label>
                <select
                  name="spk_jasa_id"
                  value={newHasilJasa.spk_jasa_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Pilih SPK Jasa</option>
                  {spkJasaList.map((spk) => {
                    const distribusi =
                      spk.spkCuttingDistribusi || spk.spk_cutting_distribusi;
                    const spkCutting =
                      distribusi?.spkCutting || distribusi?.spk_cutting;
                    const produk = spkCutting?.produk || spk.produk;

                    const nomorSeri = distribusi?.kode_seri || "-";
                    const namaProduk = produk?.nama_produk || "-";
                    const namaTukang = spk.tukang_jasa?.nama || "Tanpa tukang";

                    return (
                      <option key={spk.id} value={spk.id}>
                        {`Seri ${nomorSeri} | ${namaProduk} | ${namaTukang}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="hasil-jasa-form-grid">
                <div className="hasil-jasa-form-group">
                  <label>Tanggal Input</label>
                  <input
                    type="date"
                    name="tanggal"
                    value={newHasilJasa.tanggal}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="hasil-jasa-form-group">
                  <label>Jumlah Hasil</label>
                  <input
                    type="number"
                    name="jumlah_hasil"
                    value={newHasilJasa.jumlah_hasil}
                    onChange={handleInputChange}
                    min="0"
                    required
                    placeholder="0"
                  />
                </div>

                <div className="hasil-jasa-form-group">
                  <label>Jumlah Rusak</label>
                  <input
                    type="number"
                    name="jumlah_rusak"
                    value={newHasilJasa.jumlah_rusak}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="hasil-jasa-form-actions">
                <button
                  type="button"
                  className="hasil-jasa-btn-cancel"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="hasil-jasa-btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HasilJasa;
