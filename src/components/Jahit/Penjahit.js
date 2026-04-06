import React, { useEffect, useState } from "react";
import "./Penjahit.css";
import API from "../../api";
import {
  FiCheckCircle,
  FiCreditCard,
  FiEdit2,
  FiEye,
  FiFileText,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiScissors,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";

const emptyPenjahit = {
  nama_penjahit: "",
  kontak: "",
  alamat: "",
  kategori_penjahit: "",
  jumlah_tim: "",
  no_rekening: "",
  bank: "",
  mesin: [],
  ktp: null,
};

const parseMesin = (mesin) => {
  if (!mesin) {
    return [];
  }

  const source = Array.isArray(mesin)
    ? mesin
    : (() => {
        try {
          const parsed = JSON.parse(mesin);
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          return [];
        }
      })();

  return source.map((item) => ({
    nama: item?.nama || "",
    jumlah: item?.jumlah || "",
  }));
};

const createPenjahitPayload = (penjahit) => ({
  nama_penjahit: penjahit.nama_penjahit || "",
  kontak: penjahit.kontak || "",
  alamat: penjahit.alamat || "",
  kategori_penjahit: penjahit.kategori_penjahit || "",
  jumlah_tim: penjahit.jumlah_tim || "",
  no_rekening: penjahit.no_rekening || "",
  bank: penjahit.bank || "",
  mesin: parseMesin(penjahit.mesin),
  ktp: penjahit.ktp || null,
});

const Penjahit = () => {
  const [penjahits, setPenjahits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPenjahit, setSelectedPenjahit] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [newPenjahit, setNewPenjahit] = useState(emptyPenjahit);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchPenjahits = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await API.get("/penjahit");
        setPenjahits(Array.isArray(response.data) ? response.data : []);
      } catch (fetchError) {
        setError("Gagal mengambil data penjahit.");
      } finally {
        setLoading(false);
      }
    };

    fetchPenjahits();
  }, []);

  useEffect(() => {
    if (!successMessage && !error) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage("");
      setError("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage, error]);

  const filteredPenjahits = penjahits.filter((penjahit) => {
    const keyword = searchTerm.toLowerCase();
    return [
      penjahit.id_penjahit,
      penjahit.nama_penjahit,
      penjahit.kontak,
      penjahit.kategori_penjahit,
      penjahit.bank,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  const totalTim = penjahits.reduce(
    (total, penjahit) => total + Number(penjahit.jumlah_tim || 0),
    0
  );

  const totalDokumen = penjahits.filter((penjahit) => Boolean(penjahit.ktp)).length;

  const resetFormState = () => {
    setNewPenjahit(emptyPenjahit);
    setShowForm(false);
  };

  const handleOpenCreateForm = () => {
    setSelectedPenjahit(null);
    setShowPopup(false);
    setError("");
    setSuccessMessage("");
    setNewPenjahit(emptyPenjahit);
    setShowForm(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedPenjahit(null);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");
      const formData = new FormData();
      formData.append("nama_penjahit", newPenjahit.nama_penjahit);
      formData.append("kontak", newPenjahit.kontak);
      formData.append("alamat", newPenjahit.alamat);
      formData.append("kategori_penjahit", newPenjahit.kategori_penjahit);
      formData.append("jumlah_tim", newPenjahit.jumlah_tim);
      formData.append("no_rekening", newPenjahit.no_rekening);
      formData.append("bank", newPenjahit.bank);
      formData.append("mesin", JSON.stringify(newPenjahit.mesin));

      if (newPenjahit.ktp) {
        formData.append("ktp", newPenjahit.ktp);
      }

      const response = await API.post("/penjahit", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setPenjahits((prev) => [response.data, ...prev]);
      resetFormState();
      setSuccessMessage("Data penjahit berhasil ditambahkan.");
    } catch (submitError) {
      setError(
        submitError.response?.data?.message || "Gagal menambahkan penjahit."
      );
    }
  };

  const handleFormUpdate = async (event) => {
    event.preventDefault();

    if (!newPenjahit.id) {
      setError("ID penjahit tidak ditemukan, update dibatalkan.");
      return;
    }

    try {
      setError("");
      const formData = new FormData();

      Object.keys(newPenjahit).forEach((key) => {
        if (key !== "mesin" && key !== "ktp" && key !== "id") {
          formData.append(key, newPenjahit[key]);
        }
      });

      formData.append("mesin", JSON.stringify(newPenjahit.mesin));

      if (newPenjahit.ktp instanceof File) {
        formData.append("ktp", newPenjahit.ktp);
      }

      formData.append("_method", "PUT");

      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8000/api/penjahit/${newPenjahit.id}`,
        {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Gagal update penjahit");
      }

      const updatedPenjahit = result.data || result;

      setPenjahits((prev) =>
        prev.map((penjahit) =>
          penjahit.id_penjahit === newPenjahit.id
            ? {
                ...penjahit,
                ...updatedPenjahit,
                id_penjahit: updatedPenjahit.id_penjahit || newPenjahit.id,
              }
            : penjahit
        )
      );

      if (selectedPenjahit?.id_penjahit === newPenjahit.id) {
        setSelectedPenjahit((prev) => ({
          ...prev,
          ...updatedPenjahit,
          id_penjahit: updatedPenjahit.id_penjahit || newPenjahit.id,
        }));
      }

      resetFormState();
      setSuccessMessage("Data penjahit berhasil diperbarui.");
    } catch (updateError) {
      setError(updateError.message || "Terjadi kesalahan saat update data.");
    }
  };

  const handleDetailClick = (penjahit) => {
    setSelectedPenjahit(penjahit);
    setShowPopup(true);
  };

  const handleEditClick = (penjahit) => {
    setShowPopup(false);
    setSelectedPenjahit(penjahit);
    setNewPenjahit({
      ...createPenjahitPayload(penjahit),
      id: penjahit.id_penjahit,
    });
    setShowForm(true);
  };

  const handleMesinChange = (index, field, value) => {
    setNewPenjahit((prev) => {
      const updatedMesin = [...prev.mesin];
      updatedMesin[index] = {
        ...updatedMesin[index],
        [field]: value,
      };

      return {
        ...prev,
        mesin: updatedMesin,
      };
    });
  };

  const handleRemoveMesin = (index) => {
    setNewPenjahit((prev) => ({
      ...prev,
      mesin: prev.mesin.filter((_, mesinIndex) => mesinIndex !== index),
    }));
  };

  const selectedMesin = parseMesin(selectedPenjahit?.mesin);

  return (
    <div className="penjahit-page">
      <div className="penjahit-shell">
        <header className="penjahit-header-card">
          <div className="penjahit-header-main">
            <div className="penjahit-header-icon">
              <FiScissors size={20} />
            </div>
            <div>
              <span className="penjahit-label">Jahit Master</span>
              <h1>Data Penjahit</h1>
              <p>Kelola partner jahit, data kontak, dan informasi pembayaran.</p>
              <div className="penjahit-header-tags">
                <span className="header-tag header-tag-primary"> Master Data</span>
                <span className="header-tag">Vendor Workspace</span>
              </div>
            </div>
          </div>

          <div className="penjahit-header-actions">
            <label className="penjahit-searchbar" htmlFor="penjahit-search">
              <FiSearch size={18} />
              <input
                id="penjahit-search"
                type="text"
                placeholder="Cari penjahit..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="penjahit-primary-btn"
              onClick={handleOpenCreateForm}
            >
              <FiPlus size={18} />
              Tambah Data
            </button>
          </div>
        </header>

        {(successMessage || error) && (
          <div className={`penjahit-alert ${error ? "error" : "success"}`}>
            {error ? <FiX size={16} /> : <FiCheckCircle size={16} />}
            <span>{error || successMessage}</span>
          </div>
        )}

        <section className="penjahit-summary-grid">
          <article className="summary-card summary-card-blue">
            <div className="summary-icon">
              <FiUsers size={18} />
            </div>
            <div>
              <span>Total Penjahit</span>
              <strong>{penjahits.length}</strong>
            </div>
          </article>
          <article className="summary-card summary-card-amber">
            <div className="summary-icon">
              <FiScissors size={18} />
            </div>
            <div>
              <span>Total Tim</span>
              <strong>{totalTim}</strong>
            </div>
          </article>
          <article className="summary-card summary-card-emerald">
            <div className="summary-icon">
              <FiFileText size={18} />
            </div>
            <div>
              <span>Dokumen KTP</span>
              <strong>{totalDokumen}</strong>
            </div>
          </article>
        </section>

        <section className="penjahit-table-card">
          <div className="penjahit-table-top">
            <div>
              <span className="table-section-label">Master Directory</span>
              <h2>Daftar Penjahit</h2>
              <p>
                {loading
                  ? "Memuat data..."
                  : `${filteredPenjahits.length} dari ${penjahits.length} data ditampilkan`}
              </p>
            </div>
          </div>

          <div className="penjahit-table-wrap">
            <table className="penjahit-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Penjahit</th>
                  <th>Kategori</th>
                  <th>Kontak</th>
                  <th>Jumlah Tim</th>
                  <th>Bank</th>
                  <th className="align-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filteredPenjahits.length > 0 &&
                  filteredPenjahits.map((penjahit) => (
                    <tr key={penjahit.id_penjahit}>
                      <td data-label="ID">
                        <span className="table-id-badge">#{penjahit.id_penjahit}</span>
                      </td>
                      <td data-label="Nama Penjahit">
                        <div className="penjahit-name-cell">
                          <strong>{penjahit.nama_penjahit}</strong>
                          <span>{penjahit.alamat || "Alamat belum tersedia"}</span>
                        </div>
                      </td>
                      <td data-label="Kategori">
                        <span className="table-badge">{penjahit.kategori_penjahit || "-"}</span>
                      </td>
                      <td data-label="Kontak">{penjahit.kontak || "-"}</td>
                      <td data-label="Jumlah Tim">{penjahit.jumlah_tim || 0}</td>
                      <td data-label="Bank">{penjahit.bank || "-"}</td>
                      <td data-label="Aksi" className="align-right">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-icon-btn table-icon-view"
                            onClick={() => handleDetailClick(penjahit)}
                            aria-label={`Lihat detail ${penjahit.nama_penjahit}`}
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            type="button"
                            className="table-icon-btn table-icon-edit"
                            onClick={() => handleEditClick(penjahit)}
                            aria-label={`Edit ${penjahit.nama_penjahit}`}
                          >
                            <FiEdit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && filteredPenjahits.length === 0 && (
                  <tr>
                    <td colSpan="7" className="table-empty-state">
                      Tidak ada data yang sesuai dengan pencarian.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan="7" className="table-empty-state">
                      Memuat direktori penjahit...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showPopup && selectedPenjahit && (
        <div className="penjahit-modal-layer">
          <button
            type="button"
            className="penjahit-modal-backdrop"
            onClick={handleClosePopup}
            aria-label="Tutup detail penjahit"
          />

          <div className="penjahit-modal detail-modal">
            <div className="penjahit-modal-header">
              <div>
                <span className="penjahit-label">Detail</span>
                <h3>{selectedPenjahit.nama_penjahit}</h3>
                <p>Ringkasan informasi partner jahit.</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleClosePopup}
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-card">
                <span><FiPhone size={15} /> Kontak</span>
                <strong>{selectedPenjahit.kontak || "-"}</strong>
              </div>
              <div className="detail-card">
                <span><FiUsers size={15} /> Jumlah Tim</span>
                <strong>{selectedPenjahit.jumlah_tim || 0}</strong>
              </div>
              <div className="detail-card">
                <span><FiCreditCard size={15} /> Bank</span>
                <strong>{selectedPenjahit.bank || "-"}</strong>
              </div>
              <div className="detail-card">
                <span><FiFileText size={15} /> No. Rekening</span>
                <strong>{selectedPenjahit.no_rekening || "-"}</strong>
              </div>
              <div className="detail-card wide">
                <span><FiMapPin size={15} /> Alamat</span>
                <p>{selectedPenjahit.alamat || "Alamat belum tersedia."}</p>
              </div>
              <div className="detail-card wide">
                <span><FiFileText size={15} /> Dokumen & Mesin</span>
                <div className="detail-meta">
                  <p>
                    Status KTP: {selectedPenjahit.ktp ? "Tersedia" : "Belum tersedia"}
                  </p>
                  {selectedMesin.length > 0 ? (
                    <div className="mesin-list">
                      {selectedMesin.map((item, index) => (
                        <div className="mesin-item" key={`${item.nama}-${index}`}>
                          <strong>{item.nama || "Mesin"}</strong>
                          <span>{item.jumlah || 0} unit</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Belum ada data mesin.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="penjahit-modal-layer">
          <button
            type="button"
            className="penjahit-modal-backdrop"
            onClick={resetFormState}
            aria-label="Tutup form penjahit"
          />

          <div className="penjahit-modal form-modal">
            <div className="penjahit-modal-header">
              <div>
                <span className="penjahit-label">{newPenjahit.id ? "Edit" : "Tambah"}</span>
                <h3>{newPenjahit.id ? "Edit Penjahit" : "Tambah Penjahit"}</h3>
                <p>Lengkapi informasi utama dan pembayaran.</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={resetFormState}
              >
                <FiX size={18} />
              </button>
            </div>

            <form
              className="penjahit-form"
              onSubmit={newPenjahit.id ? handleFormUpdate : handleFormSubmit}
            >
              <div className="form-grid">
                <label className="field-group">
                  <span>Nama Penjahit</span>
                  <input
                    type="text"
                    value={newPenjahit.nama_penjahit}
                    onChange={(event) =>
                      setNewPenjahit({
                        ...newPenjahit,
                        nama_penjahit: event.target.value,
                      })
                    }
                    placeholder="Masukkan nama penjahit"
                    required
                  />
                </label>

                <label className="field-group">
                  <span>Kontak</span>
                  <input
                    type="text"
                    value={newPenjahit.kontak}
                    onChange={(event) =>
                      setNewPenjahit({
                        ...newPenjahit,
                        kontak: event.target.value,
                      })
                    }
                    placeholder="Nomor telepon"
                    required
                  />
                </label>

                <label className="field-group">
                  <span>Kategori Penjahit</span>
                  <input
                    type="text"
                    value={newPenjahit.kategori_penjahit}
                    onChange={(event) =>
                      setNewPenjahit({
                        ...newPenjahit,
                        kategori_penjahit: event.target.value,
                      })
                    }
                    placeholder="Contoh: CMT"
                    required
                  />
                </label>

                <label className="field-group">
                  <span>Jumlah Tim</span>
                  <input
                    type="number"
                    min="0"
                    value={newPenjahit.jumlah_tim}
                    onChange={(event) =>
                      setNewPenjahit({
                        ...newPenjahit,
                        jumlah_tim: event.target.value,
                      })
                    }
                    placeholder="0"
                    required
                  />
                </label>

                <label className="field-group full-width">
                  <span>Alamat</span>
                  <textarea
                    value={newPenjahit.alamat}
                    onChange={(event) =>
                      setNewPenjahit({
                        ...newPenjahit,
                        alamat: event.target.value,
                      })
                    }
                    placeholder="Masukkan alamat lengkap"
                    required
                  />
                </label>

                <label className="field-group">
                  <span>Nama Bank</span>
                  <input
                    type="text"
                    value={newPenjahit.bank}
                    onChange={(event) =>
                      setNewPenjahit({
                        ...newPenjahit,
                        bank: event.target.value,
                      })
                    }
                    placeholder="Contoh: BCA"
                    required
                  />
                </label>

                <label className="field-group">
                  <span>No. Rekening</span>
                  <input
                    type="text"
                    value={newPenjahit.no_rekening}
                    onChange={(event) =>
                      setNewPenjahit({
                        ...newPenjahit,
                        no_rekening: event.target.value,
                      })
                    }
                    placeholder="Masukkan nomor rekening"
                    required
                  />
                </label>
              </div>

              <div className="form-section-inline">
                <div>
                  <h4>Data Mesin</h4>
                  <p>Tambahkan bila perlu.</p>
                </div>
                <button
                  type="button"
                  className="penjahit-secondary-btn"
                  onClick={() =>
                    setNewPenjahit({
                      ...newPenjahit,
                      mesin: [...newPenjahit.mesin, { nama: "", jumlah: "" }],
                    })
                  }
                >
                  <FiPlus size={16} />
                  Tambah Mesin
                </button>
              </div>

              {newPenjahit.mesin.length > 0 ? (
                <div className="mesin-form-list">
                  {newPenjahit.mesin.map((item, index) => (
                    <div className="mesin-form-row" key={`mesin-${index}`}>
                      <label className="field-group">
                        <span>Nama Mesin</span>
                        <input
                          type="text"
                          value={item.nama}
                          onChange={(event) =>
                            handleMesinChange(index, "nama", event.target.value)
                          }
                          placeholder="Nama mesin"
                          required
                        />
                      </label>

                      <label className="field-group small-field">
                        <span>Jumlah</span>
                        <input
                          type="number"
                          min="0"
                          value={item.jumlah}
                          onChange={(event) =>
                            handleMesinChange(index, "jumlah", event.target.value)
                          }
                          placeholder="0"
                          required
                        />
                      </label>

                      <button
                        type="button"
                        className="penjahit-text-btn"
                        onClick={() => handleRemoveMesin(index)}
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="simple-empty-box">Belum ada data mesin.</div>
              )}

              <label className="field-group">
                <span>Upload KTP</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setNewPenjahit({
                      ...newPenjahit,
                      ktp: event.target.files?.[0] || null,
                    })
                  }
                />
              </label>

              <div className="form-footer">
                <button
                  type="button"
                  className="penjahit-secondary-ghost"
                  onClick={resetFormState}
                >
                  Batal
                </button>
                <button type="submit" className="penjahit-primary-btn">
                  <FiCheckCircle size={18} />
                  {newPenjahit.id ? "Simpan Perubahan" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Penjahit;

