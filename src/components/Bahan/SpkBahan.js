import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./SpkBahan.css";
import API from "../../api";
import { FaFileAlt, FaIndustry, FaLayerGroup, FaPlus, FaSearch, FaTag, FaTrash } from "react-icons/fa";

const JENIS_PEMBAYARAN_OPTIONS = ["Cash", "Tempo"];
const WARNA_OPTIONS = ["Putih", "Hitam", "Merah", "Biru", "Hijau", "Kuning", "Abu-abu", "Coklat", "Pink", "Ungu", "Orange", "Navy", "Maroon", "Beige", "Khaki", "Lainnya"];
const TOAST_DURATION = 3200;
const SEARCH_DEBOUNCE_MS = 350;
const SWEETALERT_CDN = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
const PER_PAGE_OPTIONS = [25, 50];

const EMPTY_META = {
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 0,
  from: 0,
  to: 0,
};

const SpkBahan = () => {
  const [items, setItems] = useState([]);
  const [pabrikList, setPabrikList] = useState([]);
  const [bahanList, setBahanList] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [meta, setMeta] = useState(EMPTY_META);
  const [kpi, setKpi] = useState({
    total_spk: 0,
    total_pabrik_aktif: 0,
    total_rol: 0,
    total_tempo: 0,
  });

  const [newItem, setNewItem] = useState({
    pabrik_id: "",
    bahan_id: "",
    jenis_pembayaran: "Cash",
    tanggal_pembayaran: "",
    warna: [{ warna: "", jumlah_rol: 1 }],
  });

  useEffect(() => {
    const debounce = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounce);
  }, [searchInput]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const ensureSweetAlert = () =>
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
    });

  const showSuccessAlert = async (message) => {
    try {
      const Swal = await ensureSweetAlert();
      if (!Swal) throw new Error("SweetAlert2 tidak tersedia");

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: message || "Data SPK Bahan berhasil ditambahkan.",
        confirmButtonText: "OK",
        confirmButtonColor: "#1d4ed8",
      });
    } catch {
      showToast(message || "Data SPK Bahan berhasil ditambahkan.", "success");
    }
  };

  const fetchMasterData = useCallback(async () => {
    const toArr = (raw) => (Array.isArray(raw?.data) ? raw.data : null) ?? (Array.isArray(raw) ? raw : []);

    const [resPabrik, resBahan] = await Promise.allSettled([API.get("/pabrik"), API.get("/bahan")]);

    if (resPabrik.status === "fulfilled") {
      const data = resPabrik.value.data;
      setPabrikList(toArr(data) || toArr(data?.data));
    } else {
      setPabrikList([]);
    }

    if (resBahan.status === "fulfilled") {
      const data = resBahan.value.data;
      setBahanList(toArr(data) || toArr(data?.data));
    } else {
      setBahanList([]);
    }
  }, []);

  const fetchSpkBahan = useCallback(
    async (targetPage = currentPage) => {
      setLoading(true);
      setError(null);

      try {
        const res = await API.get("/spk-bahan", {
          params: {
            page: targetPage,
            per_page: perPage,
            search: searchTerm || undefined,
            sort_by: "id",
            sort_dir: "desc",
          },
        });

        const payload = res.data || {};
        setItems(Array.isArray(payload.data) ? payload.data : []);
        setMeta(payload.meta || EMPTY_META);
        setKpi(
          payload.kpi || {
            total_spk: 0,
            total_pabrik_aktif: 0,
            total_rol: 0,
            total_tempo: 0,
          }
        );
      } catch (e) {
        const msg = e?.response?.data?.message || "Gagal memuat data SPK Bahan.";
        setError(msg);
        setItems([]);
        setMeta(EMPTY_META);
      } finally {
        setLoading(false);
      }
    },
    [currentPage, perPage, searchTerm]
  );

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  useEffect(() => {
    fetchSpkBahan(currentPage);
  }, [fetchSpkBahan, currentPage]);

  const resetForm = () => {
    setNewItem({
      pabrik_id: "",
      bahan_id: "",
      jenis_pembayaran: "Cash",
      tanggal_pembayaran: "",
      warna: [{ warna: "", jumlah_rol: 1 }],
    });
    setShowForm(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem((prev) => ({ ...prev, [name]: value }));
  };

  const addWarnaRow = () => {
    setNewItem((prev) => ({
      ...prev,
      warna: [...prev.warna, { warna: "", jumlah_rol: 1 }],
    }));
  };

  const removeWarnaRow = (index) => {
    setNewItem((prev) => ({
      ...prev,
      warna: prev.warna.length > 1 ? prev.warna.filter((_, i) => i !== index) : prev.warna,
    }));
  };

  const handleWarnaChange = (index, field, value) => {
    setNewItem((prev) => {
      const arr = [...prev.warna];
      arr[index] = { ...arr[index], [field]: field === "jumlah_rol" ? Math.max(1, parseInt(value, 10) || 1) : value };
      return { ...prev, warna: arr };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newItem.pabrik_id || !newItem.bahan_id || !newItem.tanggal_pembayaran) {
      showToast("Pabrik, bahan, dan tanggal pembayaran wajib diisi.", "warning");
      return;
    }

    const validWarna = newItem.warna
      .map((w) => ({ warna: (w.warna || "").trim(), jumlah_rol: Math.max(1, parseInt(w.jumlah_rol, 10) || 1) }))
      .filter((w) => w.warna !== "");

    if (validWarna.length === 0) {
      showToast("Minimal 1 detail warna (nama warna dan jumlah rol) wajib diisi.", "warning");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        pabrik_id: parseInt(newItem.pabrik_id, 10),
        bahan_id: parseInt(newItem.bahan_id, 10),
        jenis_pembayaran: newItem.jenis_pembayaran || "Cash",
        tanggal_pembayaran: newItem.tanggal_pembayaran,
        warna: validWarna,
      };

      const res = await API.post("/spk-bahan", payload);

      resetForm();
      setCurrentPage(1);
      await fetchSpkBahan(1);
      await showSuccessAlert(res.data?.message || "Data SPK Bahan berhasil ditambahkan.");
    } catch (err) {
      const msg = err.response?.data?.message || (err.response?.data?.errors ? Object.values(err.response.data.errors || {}).flat().join(", ") : null) || "Gagal menyimpan SPK Bahan.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatWarnaSummary = (warnaArr) => {
    if (!warnaArr || !Array.isArray(warnaArr) || warnaArr.length === 0) return "-";
    return warnaArr.map((w) => `${w.warna || "-"} (${w.jumlah_rol || 0})`).join(", ");
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("id-ID");
    } catch {
      return d;
    }
  };

  const formatLamaPemesanan = (hari) => {
    if (hari === null || hari === undefined) return "-";
    return `${hari} hari`;
  };

  const getStatusClass = (status) => {
    const cleaned = (status || "").toLowerCase().trim();
    if (!cleaned) return "default";
    if (cleaned.includes("selesai")) return "selesai";
    if (cleaned.includes("proses")) return "proses";
    if (cleaned.includes("pending")) return "pending";
    if (cleaned.includes("batal")) return "dibatalkan";
    return cleaned.replace(/\s+/g, "-");
  };

  const getPembayaranClass = (jenisPembayaran) => {
    const cleaned = (jenisPembayaran || "").toLowerCase().trim();
    if (!cleaned) return "default";
    if (cleaned.includes("cash")) return "cash";
    if (cleaned.includes("tunai")) return "tunai";
    if (cleaned.includes("tempo")) return "tempo";
    if (cleaned.includes("transfer")) return "transfer";
    if (cleaned.includes("kredit")) return "kredit";
    return "default";
  };

  const getWarnaClass = (warnaName) => {
    const cleaned = (warnaName || "").toLowerCase().trim();
    if (!cleaned) return "default";
    if (cleaned.includes("putih")) return "putih";
    if (cleaned.includes("hitam")) return "hitam";
    if (cleaned.includes("merah") || cleaned.includes("maroon")) return "merah";
    if (cleaned.includes("biru") || cleaned.includes("navy")) return "biru";
    if (cleaned.includes("hijau")) return "hijau";
    if (cleaned.includes("kuning") || cleaned.includes("khaki")) return "kuning";
    if (cleaned.includes("abu")) return "abu";
    if (cleaned.includes("coklat") || cleaned.includes("beige")) return "coklat";
    if (cleaned.includes("pink")) return "pink";
    if (cleaned.includes("ungu")) return "ungu";
    if (cleaned.includes("orange")) return "orange";
    return "default";
  };

  const paginationNumbers = useMemo(() => {
    const totalPages = meta.last_page || 1;
    const page = meta.current_page || 1;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  }, [meta.current_page, meta.last_page]);

  const lastSyncLabel = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div className="spkb-page">
      <section className="spkb-shell">
        <header className="spkb-topbar">
          <div className="spkb-title-wrap">
            <div className="spkb-title-icon">
              <FaFileAlt />
            </div>
            <div>
              <h1>SPK Bahan</h1>
              <p>Monitoring order pembelian bahan, warna, dan pembayaran per pabrik.</p>
            </div>
          </div>
          <div className="spkb-topbar-right">
            <small>Terakhir sinkron: {lastSyncLabel}</small>
            <button className="spkb-btn-primary" onClick={() => setShowForm(true)}>
              <FaPlus /> Tambah SPK
            </button>
          </div>
        </header>

        <section className="spkb-kpi-grid">
          <article className="spkb-kpi-card">
            <span>Total SPK</span>
            <strong>{kpi.total_spk || 0}</strong>
          </article>
          <article className="spkb-kpi-card">
            <span>Pabrik Aktif</span>
            <strong>{kpi.total_pabrik_aktif || 0}</strong>
          </article>
          <article className="spkb-kpi-card">
            <span>Total Rol</span>
            <strong>{kpi.total_rol || 0}</strong>
          </article>
          <article className="spkb-kpi-card spkb-kpi-highlight">
            <span>Pembayaran Tempo</span>
            <strong>{kpi.total_tempo || 0}</strong>
          </article>
        </section>

        <section className="spkb-table-card">
          <div className="spkb-table-header">
            <div>
              <h2>Daftar SPK Bahan</h2>
              <p>{meta.total || 0} data tercatat</p>
            </div>
            <div className="spkb-table-tools">
              <label className="spkb-perpage-box">
                <span>Tampil</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    const nextPerPage = parseInt(e.target.value, 10);
                    setPerPage(nextPerPage);
                    setCurrentPage(1);
                  }}
                >
                  {PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="spkb-search-box">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Cari pabrik, bahan, warna, atau status..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </label>
            </div>
          </div>

          {loading ? (
            <p className="spkb-state">Memuat data SPK Bahan...</p>
          ) : error ? (
            <p className="spkb-state spkb-state-error">{error}</p>
          ) : items.length === 0 ? (
            <p className="spkb-state">Belum ada data SPK Bahan yang sesuai pencarian.</p>
          ) : (
            <>
              <div className="spkb-table-wrap">
                <table className="spkb-table">
                  <thead>
                    <tr>
                      <th className="spkb-col-no">No</th>
                      <th className="spkb-col-id">ID SPK</th>
                      <th className="spkb-col-pabrik">Pabrik</th>
                      <th className="spkb-col-bahan">Bahan</th>
                      <th className="spkb-col-warna">Detail Warna</th>
                      <th className="spkb-col-rol">Total Rol</th>
                      <th className="spkb-col-bayar">Pembayaran</th>
                      <th className="spkb-col-tanggal">Tgl Pembayaran</th>
                      <th className="spkb-col-lama">Lama Pesan</th>
                      <th className="spkb-col-status">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, index) => {
                      const rowRol =
                        Array.isArray(row.warna) && row.warna.length > 0
                          ? row.warna.reduce((sum, w) => sum + (parseInt(w.jumlah_rol, 10) || 0), 0)
                          : parseInt(row.jumlah, 10) || 0;

                      const number = ((meta.current_page || 1) - 1) * (meta.per_page || perPage) + index + 1;

                      return (
                        <tr key={row.id}>
                          <td className="spkb-col-no">{number}</td>
                          <td className="spkb-id spkb-col-id">#{row.id}</td>
                          <td className="spkb-cell-pabrik">
                            <span className="spkb-chip" title={row.pabrik?.nama_pabrik || "-"}>
                              <FaIndustry />
                              <span className="spkb-chip-label">{row.pabrik?.nama_pabrik || "-"}</span>
                            </span>
                          </td>
                          <td className="spkb-cell-bold spkb-col-bahan">{row.bahan?.nama_bahan || "-"}</td>
                          <td className="spkb-cell-warna">
                            {Array.isArray(row.warna) && row.warna.length > 0 ? (
                              <div className="spkb-warna-list">
                                {row.warna.map((w, wi) => (
                                  <span key={`${row.id}-warna-${wi}`} className={`spkb-warna-chip spkb-warna-${getWarnaClass(w.warna)}`}>
                                    <span className="spkb-warna-dot" />
                                    {(w.warna || "-").trim() || "-"} ({w.jumlah_rol || 0})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              formatWarnaSummary(row.warna)
                            )}
                          </td>
                          <td className="spkb-cell-bold spkb-col-rol">{rowRol || "-"}</td>
                          <td className="spkb-col-bayar">
                            <span className={`spkb-chip spkb-chip-pay spkb-chip-pay-${getPembayaranClass(row.jenis_pembayaran)}`}>
                              <FaTag /> {row.jenis_pembayaran || "-"}
                            </span>
                          </td>
                          <td className="spkb-col-tanggal">{formatDate(row.tanggal_pembayaran)}</td>
                          <td className="spkb-col-lama">{formatLamaPemesanan(row.lama_pemesanan)}</td>
                          <td className="spkb-col-status">
                            <span className={`spkb-badge spkb-badge-${getStatusClass(row.status)}`}>
                              <span className="spkb-badge-dot" />
                              {row.status || "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="spkb-pagination-wrap">
                <div className="spkb-pagination-info">
                  Menampilkan {meta.from || 0} - {meta.to || 0} dari {meta.total || 0} data
                </div>

                <div className="spkb-pagination">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={(meta.current_page || 1) <= 1}
                  >
                    Sebelumnya
                  </button>

                  {paginationNumbers.map((page, idx) =>
                    page === "..." ? (
                      <span key={`dots-${idx}`} className="spkb-page-dots">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${page}`}
                        type="button"
                        className={(meta.current_page || 1) === page ? "active" : ""}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(meta.last_page || 1, prev + 1))}
                    disabled={(meta.current_page || 1) >= (meta.last_page || 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </section>

      {showForm && (
        <div className="spkb-modal" onClick={resetForm}>
          <div className="spkb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="spkb-modal-head">
              <h3>Tambah SPK Bahan</h3>
              <p>Lengkapi data order bahan per pabrik untuk kebutuhan produksi.</p>
            </div>

            <form onSubmit={handleSubmit} className="spkb-form">
              <div className="spkb-form-row">
                <div className="spkb-form-group">
                  <label>Pabrik *</label>
                  <select name="pabrik_id" value={newItem.pabrik_id} onChange={handleInputChange} required>
                    <option value="">Pilih Pabrik</option>
                    {pabrikList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_pabrik || p.nama || `Pabrik #${p.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="spkb-form-group">
                  <label>Bahan *</label>
                  <select name="bahan_id" value={newItem.bahan_id} onChange={handleInputChange} required>
                    <option value="">Pilih Bahan</option>
                    {bahanList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama_bahan || b.nama || `Bahan #${b.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="spkb-form-row">
                <div className="spkb-form-group">
                  <label>Jenis Pembayaran *</label>
                  <select name="jenis_pembayaran" value={newItem.jenis_pembayaran} onChange={handleInputChange}>
                    {JENIS_PEMBAYARAN_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="spkb-form-group">
                  <label>Tanggal Pembayaran *</label>
                  <input type="date" name="tanggal_pembayaran" value={newItem.tanggal_pembayaran} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="spkb-color-box">
                <div className="spkb-color-box-head">
                  <div>
                    <h4>Detail Warna</h4>
                    <p>Isi warna bahan dan jumlah rol per warna.</p>
                  </div>
                  <button type="button" className="spkb-btn-secondary" onClick={addWarnaRow}>
                    <FaPlus /> Tambah Baris
                  </button>
                </div>

                {newItem.warna.map((w, wi) => (
                  <div key={wi} className="spkb-color-row">
                    <div className="spkb-form-group spkb-color-name">
                      <label>Warna</label>
                      <select
                        value={WARNA_OPTIONS.includes(w.warna) ? w.warna : "Lainnya"}
                        onChange={(e) => handleWarnaChange(wi, "warna", e.target.value === "Lainnya" ? "" : e.target.value)}
                      >
                        <option value="">-- Pilih / Ketik --</option>
                        {WARNA_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                        <option value="Lainnya">Lainnya</option>
                      </select>
                      {(!w.warna || w.warna === "Lainnya" || !WARNA_OPTIONS.includes(w.warna)) && (
                        <input type="text" placeholder="Nama warna" value={WARNA_OPTIONS.includes(w.warna) ? "" : w.warna || ""} onChange={(e) => handleWarnaChange(wi, "warna", e.target.value)} />
                      )}
                    </div>
                    <div className="spkb-form-group spkb-color-total">
                      <label>Jumlah Rol</label>
                      <input type="number" min={1} value={w.jumlah_rol} onChange={(e) => handleWarnaChange(wi, "jumlah_rol", e.target.value)} />
                    </div>
                    <div className="spkb-color-action">
                      <button type="button" className="spkb-btn-icon-delete" onClick={() => removeWarnaRow(wi)} title="Hapus baris" disabled={newItem.warna.length <= 1}>
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="spkb-color-footer">
                  <FaLayerGroup />
                  Total rol:
                  <strong>{newItem.warna.reduce((s, w) => s + (parseInt(w.jumlah_rol, 10) || 0), 0)}</strong>
                </div>
              </div>

              <div className="spkb-form-actions">
                <button type="button" className="spkb-btn-secondary" onClick={resetForm}>
                  Batal
                </button>
                <button type="submit" className="spkb-btn-primary" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan SPK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`spkb-toast spkb-toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
};

export default SpkBahan;
