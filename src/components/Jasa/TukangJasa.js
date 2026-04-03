import React, { useEffect, useMemo, useState } from "react";
import API from "../../api";
import "./TukangJasa.css";
import { FaClipboardCheck, FaPlus } from "react-icons/fa";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCreditCard,
  FiMapPin,
  FiPhone,
  FiSearch,
  FiTool,
  FiX,
} from "react-icons/fi";

const initialFormState = {
  nama: "",
  kontak: "",
  bank: "",
  no_rekening: "",
  alamat: "",
  jenis_jasa: "",
};

const ToastIcon = ({ type }) => {
  if (type === "error") {
    return <FiAlertTriangle />;
  }
  return <FiCheckCircle />;
};

const TukangJasa = () => {
  const [tukangJasa, setTukangJasa] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [newTukangJasa, setNewTukangJasa] = useState(initialFormState);

  useEffect(() => {
    const fetchTukangJasa = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await API.get("/tukang-jasa");
        const rows = Array.isArray(response.data) ? response.data : [];
        setTukangJasa(rows);
      } catch (fetchError) {
        setError("Data tukang jasa belum bisa dimuat. Coba muat ulang halaman.");
      } finally {
        setLoading(false);
      }
    };

    fetchTukangJasa();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => clearTimeout(timeoutId);
  }, [toast]);

  const filteredTukangJasa = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return tukangJasa;
    }

    return tukangJasa.filter((item) => {
      const searchableText = [
        item?.nama,
        item?.kontak,
        item?.bank,
        item?.jenis_jasa,
        item?.alamat,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [searchTerm, tukangJasa]);

  const stats = useMemo(() => {
    const total = tukangJasa.length;
    const withKontak = tukangJasa.filter((item) => item?.kontak).length;
    const withRekening = tukangJasa.filter((item) => item?.bank && item?.no_rekening).length;
    const jenisUnik = new Set(
      tukangJasa
        .map((item) => item?.jenis_jasa?.trim())
        .filter((jenis) => Boolean(jenis))
    ).size;

    return { total, withKontak, withRekening, jenisUnik };
  }, [tukangJasa]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewTukangJasa((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("nama", newTukangJasa.nama);
    formData.append("kontak", newTukangJasa.kontak || "");
    formData.append("bank", newTukangJasa.bank || "");
    formData.append("no_rekening", newTukangJasa.no_rekening || "");
    formData.append("alamat", newTukangJasa.alamat || "");
    formData.append("jenis_jasa", newTukangJasa.jenis_jasa || "");

    try {
      setSubmitting(true);
      const response = await API.post("/tukang-jasa", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const createdData = response?.data?.data || response?.data;
      if (createdData) {
        setTukangJasa((prev) => [createdData, ...prev]);
      }

      setToast({
        type: "success",
        message: "Tukang jasa berhasil ditambahkan.",
      });
      setNewTukangJasa(initialFormState);
      setShowForm(false);
    } catch (submitError) {
      setToast({
        type: "error",
        message: submitError.response?.data?.message || "Gagal menambahkan data tukang jasa.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tukang-jasa-page">
      <header className="tukang-jasa-header-card">
        <div className="tukang-jasa-brand">
          <div className="tukang-jasa-brand-icon">
            <FaClipboardCheck />
          </div>
          <div className="tukang-jasa-brand-text">
            <h1>Master Data Tukang Jasa</h1>
            <p>Kontrol mitra jasa produksi, detail kontak, dan kelengkapan pembayaran.</p>
          </div>
        </div>
      </header>

      <section className="tukang-jasa-stats-grid">
        <article className="tukang-jasa-stat-card">
          <span>Total Mitra</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="tukang-jasa-stat-card">
          <span>Kontak Tersedia</span>
          <strong>{stats.withKontak}</strong>
        </article>
        <article className="tukang-jasa-stat-card">
          <span>Rekening Lengkap</span>
          <strong>{stats.withRekening}</strong>
        </article>
        <article className="tukang-jasa-stat-card">
          <span>Jenis Jasa</span>
          <strong>{stats.jenisUnik}</strong>
        </article>
      </section>

      <section className="tukang-jasa-panel">
        <div className="tukang-jasa-toolbar">
          <button type="button" className="tukang-jasa-btn-primary" onClick={() => setShowForm(true)}>
            <FaPlus />
            <span>Tambah Mitra</span>
          </button>

          <div className="tukang-jasa-search">
            <FiSearch />
            <input
              type="text"
              placeholder="Cari nama, kontak, bank, alamat, atau jenis jasa..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        {loading && (
          <div className="tukang-jasa-state-card">Memuat data tukang jasa...</div>
        )}

        {!loading && error && (
          <div className="tukang-jasa-state-card tukang-jasa-state-error">{error}</div>
        )}

        {!loading && !error && filteredTukangJasa.length === 0 && (
          <div className="tukang-jasa-state-card">
            Tidak ada data yang cocok dengan kata kunci <strong>{searchTerm}</strong>.
          </div>
        )}

        {!loading && !error && filteredTukangJasa.length > 0 && (
          <div className="tukang-jasa-table-wrap">
            <table className="tukang-jasa-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Mitra</th>
                  <th>Jenis Jasa</th>
                  <th>Kontak</th>
                  <th>Pembayaran</th>
                  <th>Alamat</th>
                </tr>
              </thead>
              <tbody>
                {filteredTukangJasa.map((item, index) => (
                  <tr key={item.id ?? `${item.nama}-${index}`}>
                    <td className="tukang-jasa-cell-id">{item.id ?? "-"}</td>
                    <td>
                      <p className="tukang-jasa-name">{item.nama || "-"}</p>
                    </td>
                    <td>
                      {item.jenis_jasa ? (
                        <span className="tukang-jasa-badge">
                          <FiTool />
                          <span>{item.jenis_jasa}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {item.kontak ? (
                        <span className="tukang-jasa-meta">
                          <FiPhone />
                          <span>{item.kontak}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {item.bank && item.no_rekening ? (
                        <div className="tukang-jasa-payment">
                          <span className="tukang-jasa-meta">
                            <FiCreditCard />
                            <span>{item.bank}</span>
                          </span>
                          <small>{item.no_rekening}</small>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {item.alamat ? (
                        <span className="tukang-jasa-meta">
                          <FiMapPin />
                          <span>{item.alamat}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="tukang-jasa-modal" onClick={() => setShowForm(false)}>
          <div className="tukang-jasa-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="tukang-jasa-modal-header">
              <div>
                <h2>Tambah Tukang Jasa</h2>
                <p>Lengkapi profil mitra untuk kebutuhan operasional dan pembayaran.</p>
              </div>
              <button
                type="button"
                className="tukang-jasa-close-btn"
                aria-label="Tutup form"
                onClick={() => setShowForm(false)}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="tukang-jasa-form" encType="multipart/form-data">
              <div className="tukang-jasa-form-grid">
                <div className="tukang-jasa-field">
                  <label htmlFor="nama">Nama Tukang Jasa</label>
                  <input
                    id="nama"
                    type="text"
                    name="nama"
                    value={newTukangJasa.nama}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama mitra"
                    required
                  />
                </div>

                <div className="tukang-jasa-field">
                  <label htmlFor="kontak">Kontak</label>
                  <input
                    id="kontak"
                    type="text"
                    name="kontak"
                    value={newTukangJasa.kontak}
                    onChange={handleInputChange}
                    placeholder="Contoh: 0812xxxx"
                  />
                </div>

                <div className="tukang-jasa-field">
                  <label htmlFor="jenis_jasa">Jenis Jasa</label>
                  <input
                    id="jenis_jasa"
                    type="text"
                    name="jenis_jasa"
                    value={newTukangJasa.jenis_jasa}
                    onChange={handleInputChange}
                    placeholder="Contoh: Sablon, Obras, Jahit"
                  />
                </div>

                <div className="tukang-jasa-field">
                  <label htmlFor="bank">Bank</label>
                  <input
                    id="bank"
                    type="text"
                    name="bank"
                    value={newTukangJasa.bank}
                    onChange={handleInputChange}
                    placeholder="Contoh: BCA"
                  />
                </div>

                <div className="tukang-jasa-field">
                  <label htmlFor="no_rekening">Nomor Rekening</label>
                  <input
                    id="no_rekening"
                    type="text"
                    name="no_rekening"
                    value={newTukangJasa.no_rekening}
                    onChange={handleInputChange}
                    placeholder="Masukkan nomor rekening"
                  />
                </div>

                <div className="tukang-jasa-field tukang-jasa-field-full">
                  <label htmlFor="alamat">Alamat</label>
                  <textarea
                    id="alamat"
                    name="alamat"
                    value={newTukangJasa.alamat}
                    onChange={handleInputChange}
                    placeholder="Masukkan alamat lengkap"
                    rows={3}
                  />
                </div>
              </div>

              <div className="tukang-jasa-form-actions">
                <button type="button" className="tukang-jasa-btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="tukang-jasa-btn-primary" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`tukang-jasa-toast tukang-jasa-toast-${toast.type}`}>
          <ToastIcon type={toast.type} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default TukangJasa;
