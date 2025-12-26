import React, { useEffect, useState } from "react";
import "./HasilJasa.css";
import API from "../../api";
import { FaPlus, FaTimes, FaClipboardCheck } from "react-icons/fa";

const HasilJasa = () => {
  const [hasilJasa, setHasilJasa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [spkJasaList, setSpkJasaList] = useState([]);
  const [newHasilJasa, setNewHasilJasa] = useState({
    spk_jasa_id: "",
    tanggal: "",
    jumlah_hasil: "",
    jumlah_rusak: 0,
  });

  useEffect(() => {
    const fetchHasilJasa = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await API.get("/HasilJasa");
        const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setHasilJasa(data);
      } catch (error) {
        console.error("Error fetching Hasil Jasa:", error);
        setError("Gagal mengambil data");
        setHasilJasa([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHasilJasa();
  }, []);

  useEffect(() => {
    const fetchSpkJasa = async () => {
      try {
        const res = await API.get("/SpkJasa?per_page=1000");
        const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data || [];
        setSpkJasaList(data);
      } catch (err) {
        console.error("Gagal fetch SPK Jasa:", err);
        setSpkJasaList([]);
      }
    };
    fetchSpkJasa();
  }, []);

  const filteredHasilJasa = hasilJasa.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.id?.toString().includes(searchLower) ||
      item.spk_jasa?.id?.toString().includes(searchLower) ||
      item.spk_jasa?.tukang_jasa?.nama?.toLowerCase().includes(searchLower) ||
      item.spk_jasa?.produk?.nama_produk?.toLowerCase().includes(searchLower) ||
      item.jumlah_hasil?.toString().includes(searchLower)
    );
  });

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await API.post("/HasilJasa", {
        spk_jasa_id: newHasilJasa.spk_jasa_id,
        tanggal: newHasilJasa.tanggal,
        jumlah_hasil: newHasilJasa.jumlah_hasil,
        jumlah_rusak: newHasilJasa.jumlah_rusak || 0,
      });

      alert("Hasil Jasa berhasil ditambahkan!");

      // Refresh data
      const refreshResponse = await API.get("/HasilJasa");
      const data = Array.isArray(refreshResponse.data) ? refreshResponse.data : refreshResponse.data?.data || [];
      setHasilJasa(data);

      // Reset form
      setNewHasilJasa({
        spk_jasa_id: "",
        tanggal: "",
        jumlah_hasil: "",
        jumlah_rusak: 0,
      });

      setShowForm(false);
    } catch (error) {
      console.error("Full error:", error);
      console.error("Error response:", error.response?.data);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan Hasil Jasa.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewHasilJasa((prev) => ({
      ...prev,
      [name]: name === "jumlah_rusak" || name === "jumlah_hasil" ? (value === "" ? "" : parseInt(value) || 0) : value,
    }));
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setNewHasilJasa({
      spk_jasa_id: "",
      tanggal: "",
      jumlah_hasil: "",
      jumlah_rusak: 0,
    });
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

  return (
    <div className="hasil-jasa-page">
      <div className="hasil-jasa-header">
        <div className="hasil-jasa-header-icon">
          <FaClipboardCheck />
        </div>
        <h1>Data Hasil Jasa</h1>
      </div>

      <div className="hasil-jasa-table-container">
        <div className="hasil-jasa-filter-header">
          <button className="hasil-jasa-btn-add" onClick={() => setShowForm(true)}>
            <FaPlus /> Tambah Hasil Jasa
          </button>
          <div className="hasil-jasa-search-bar">
            <input type="text" placeholder="Cari ID, SPK Jasa, Tukang Jasa, atau Nama Produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="hasil-jasa-loading">Memuat data...</div>
        ) : error ? (
          <div className="hasil-jasa-error">{error}</div>
        ) : filteredHasilJasa.length === 0 ? (
          <div className="hasil-jasa-empty-state">
            <div className="hasil-jasa-empty-state-icon">📋</div>
            <p>Tidak ada data hasil jasa</p>
          </div>
        ) : (
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
                  <th>Total Bayar</th>
                  <th>Tanggal Input</th>
                </tr>
              </thead>
              <tbody>
                {filteredHasilJasa.map((hasil, index) => {
                  // Ambil distribusi dan nama produk dari relasi yang benar
                  const distribusi = hasil.spk_jasa?.spkCuttingDistribusi || hasil.spk_jasa?.spk_cutting_distribusi;
                  const spkCutting = distribusi?.spkCutting || distribusi?.spk_cutting;
                  const produk = spkCutting?.produk || hasil.spk_jasa?.produk;
                  const namaProduk = produk?.nama_produk || "-";
                  const kodeSeri = distribusi?.kode_seri || "-";

                  return (
                    <tr key={hasil.id}>
                      <td>{index + 1}</td>
                      <td>{hasil.spk_jasa?.tukang_jasa?.nama || "-"}</td>
                      <td>{kodeSeri}</td>
                      <td>{namaProduk}</td>
                      <td>{hasil.jumlah_hasil || 0}</td>
                      <td>{hasil.jumlah_rusak || 0}</td>
                      <td>
                        <span className="hasil-jasa-price">{formatRupiah(hasil.total_pendapatan || 0)}</span>
                      </td>
                      <td>
                        {hasil.tanggal
                          ? new Date(hasil.tanggal).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "-"}  
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="hasil-jasa-modal" onClick={handleCloseModal}>
          <div className="hasil-jasa-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="hasil-jasa-modal-header">
              <h2>Tambah Hasil Jasa</h2>
              <button className="hasil-jasa-modal-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="hasil-jasa-form">
              <div className="hasil-jasa-form-group">
                <label>SPK Jasa:</label>
                <select name="spk_jasa_id" value={newHasilJasa.spk_jasa_id} onChange={handleInputChange} required>
                  <option value="">Pilih SPK Jasa</option>
                  {spkJasaList
                    .filter((spk) => spk.status_pengambilan === "sudah_diambil")
                    .map((spk) => {
                      // Antisipasi nama properti snake_case dari Laravel
                      const distribusi = spk.spkCuttingDistribusi || spk.spk_cutting_distribusi;
                      const spkCutting = distribusi?.spkCutting || distribusi?.spk_cutting;
                      const produk = spkCutting?.produk || spk.produk;

                      const nomorSeri = distribusi?.kode_seri || "-";
                      const namaProduk = produk?.nama_produk || "-";

                      return (
                        <option key={spk.id} value={spk.id}>
                          {`Seri ${nomorSeri} | Produk ${namaProduk}`}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="hasil-jasa-form-group">
                <label>Tanggal:</label>
                <input type="date" name="tanggal" value={newHasilJasa.tanggal} onChange={handleInputChange} required />
              </div>

              <div className="hasil-jasa-form-group">
                <label>Jumlah Hasil:</label>
                <input type="number" name="jumlah_hasil" value={newHasilJasa.jumlah_hasil} onChange={handleInputChange} min="0" required placeholder="Masukkan jumlah hasil" />
              </div>

              <div className="hasil-jasa-form-group">
                <label>Jumlah Rusak:</label>
                <input type="number" name="jumlah_rusak" value={newHasilJasa.jumlah_rusak} onChange={handleInputChange} min="0" placeholder="Masukkan jumlah rusak (opsional)" />
              </div>

              <div className="hasil-jasa-form-actions">
                <button type="button" className="hasil-jasa-btn hasil-jasa-btn-cancel" onClick={handleCloseModal}>
                  Batal
                </button>
                <button type="submit" className="hasil-jasa-btn hasil-jasa-btn-submit">
                  Simpan
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
