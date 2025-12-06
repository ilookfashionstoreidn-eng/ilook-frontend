import React, { useEffect, useState } from "react";
import "./SpkCutting.css";
import API from "../../../api";
import { FaPlus, FaInfoCircle } from "react-icons/fa";

const SpkCutting = () => {
  const [spkCutting, setSpkCutting] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [produkList, setProdukList] = useState([]);
  const [tukangList, setTukangList] = useState([]);
  const [bahanList, setBahanList] = useState([]);
  const [selectedDetailSpk, setSelectedDetailSpk] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // List warna untuk dropdown
  const warnaList = ["Putih", "Hitam", "Merah", "Biru", "Hijau", "Kuning", "Abu-abu", "Coklat", "Pink", "Ungu", "Orange", "Navy", "Maroon", "Beige", "Khaki", "Lainnya"];

  // Fungsi untuk fetch nomor seri SPK dari backend berdasarkan tukang cutting
  const fetchSpkNumber = async (tukangCuttingId) => {
    if (!tukangCuttingId) {
      setNewSpkCutting((prev) => ({ ...prev, id_spk_cutting: "" }));
      return;
    }

    try {
      const response = await API.post("/spk_cutting/generate-number", {
        tukang_cutting_id: tukangCuttingId,
      });
      setNewSpkCutting((prev) => ({
        ...prev,
        id_spk_cutting: response.data.id_spk_cutting,
      }));
    } catch (error) {
      console.error("Error generating SPK number:", error);
      alert("Gagal generate nomor seri SPK. Silakan coba lagi.");
    }
  };

  const [newSpkCutting, setNewSpkCutting] = useState({
    id_spk_cutting: "",
    produk_id: "",
    tanggal_batas_kirim: "",
    harga_jasa: "",
    satuan_harga: "Pcs",
    keterangan: "",
    tukang_cutting_id: "",
    bagian: [],
  });

  useEffect(() => {
    const fetchSpkCutting = async () => {
      try {
        setLoading(true);
        const response = await API.get("/spk_cutting");
        // Urutkan data berdasarkan ID descending (terbaru di atas)
        const sortedData = Array.isArray(response.data) ? response.data.sort((a, b) => b.id - a.id) : [];
        setSpkCutting(sortedData);
      } catch (error) {
        setError("Gagal mengambil data");
      } finally {
        setLoading(false);
      }
    };
    fetchSpkCutting();
  }, []);

  useEffect(() => {
    const fetchProduk = async () => {
      try {
        setLoading(true);
        const response = await API.get("/produk");
        setProdukList(response.data.data);
      } catch (error) {
        setError("Gagal mengambil data produk.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduk();
  }, []);

  useEffect(() => {
    const fetchTukang = async () => {
      try {
        setLoading(true);
        const response = await API.get("/tukang_cutting");
        setTukangList(response.data);
      } catch (error) {
        setError("Gagal mengambil data produk.");
      } finally {
        setLoading(false);
      }
    };

    fetchTukang();
  }, []);

  useEffect(() => {
    const fetchBahan = async () => {
      try {
        setLoading(true);
        const response = await API.get("/bahan");
        setBahanList(response.data);
      } catch (error) {
        setError("Gagal mengambil data bahan.");
      } finally {
        setLoading(false);
      }
    };

    fetchBahan();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // === PAGINATION ===
  const filteredSpkCutting = spkCutting.filter(
    (item) =>
      item.id.toString().includes(searchTerm.toLowerCase()) ||
      (item.id_spk_cutting || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tukang_cutting?.nama_tukang_cutting || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.produk?.nama_produk || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSpkCutting.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSpkCutting.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatRupiah = (angka) => {
    if (!angka && angka !== 0) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validasi nomor seri SPK harus ada (akan di-generate otomatis oleh backend jika kosong)
    if (!newSpkCutting.tukang_cutting_id) {
      alert("Pilih tukang cutting terlebih dahulu!");
      return;
    }

    // Validasi frontend sebelum submit
    if (!newSpkCutting.bagian || newSpkCutting.bagian.length === 0) {
      alert("Minimal harus ada 1 bagian!");
      return;
    }

    // Validasi setiap bagian dan bahan
    for (let i = 0; i < newSpkCutting.bagian.length; i++) {
      const bagian = newSpkCutting.bagian[i];
      if (!bagian.nama_bagian || bagian.nama_bagian.trim() === "") {
        alert(`Bagian ${i + 1}: Nama bagian harus diisi!`);
        return;
      }
      if (!bagian.bahan || bagian.bahan.length === 0) {
        alert(`Bagian ${i + 1}: Minimal harus ada 1 bahan!`);
        return;
      }
      for (let j = 0; j < bagian.bahan.length; j++) {
        const bahan = bagian.bahan[j];
        if (!bahan.bahan_id || bahan.bahan_id === "") {
          alert(`Bagian ${i + 1}, Bahan ${j + 1}: Pilih bahan terlebih dahulu!`);
          return;
        }
        if (bahan.warna === "Lainnya" && (!bahan.warna_custom || bahan.warna_custom.trim() === "")) {
          alert(`Bagian ${i + 1}, Bahan ${j + 1}: Masukkan warna custom terlebih dahulu!`);
          return;
        }
        if (!bahan.qty || bahan.qty <= 0) {
          alert(`Bagian ${i + 1}, Bahan ${j + 1}: Qty harus lebih dari 0!`);
          return;
        }
      }
    }

    // Konversi bahan_id menjadi integer
    // Hapus id_spk_cutting karena akan di-generate otomatis oleh backend
    const { id_spk_cutting, ...dataWithoutSpkNumber } = newSpkCutting;
    const dataToSend = {
      ...dataWithoutSpkNumber,
      bagian: newSpkCutting.bagian.map((bagian) => ({
        ...bagian,
        bahan: bagian.bahan.map((bahan) => ({
          bahan_id: parseInt(bahan.bahan_id),
          // Jika warna adalah "Lainnya", gunakan warna_custom, jika tidak gunakan warna
          warna: bahan.warna === "Lainnya" ? bahan.warna_custom || null : bahan.warna || null,
          qty: parseFloat(bahan.qty),
        })),
      })),
    };

    console.log("Data SPK Cutting yang dikirim:", dataToSend);

    try {
      const response = await API.post("/spk_cutting", dataToSend);

      console.log("Response:", response.data);
      alert("SPK Cutting berhasil ditambahkan!");

      // Update list SPK Cutting dengan data terbaru, urutkan descending
      setSpkCutting((prev) => {
        const updated = [response.data.data, ...prev];
        return updated.sort((a, b) => b.id - a.id);
      });

      // Reset form
      setNewSpkCutting({
        id_spk_cutting: "",
        produk_id: "",
        tanggal_batas_kirim: "",
        harga_jasa: "",
        satuan_harga: "Pcs",
        keterangan: "",
        tukang_cutting_id: "",
        bagian: [],
      });

      setShowForm(false);
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);

      // Tampilkan error detail dari backend
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.keys(errors)
          .map((key) => {
            return `${key}: ${errors[key].join(", ")}`;
          })
          .join("\n");
        alert(`Validasi gagal:\n${errorMessages}`);
      } else {
        alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan SPK Cutting.");
      }
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setNewSpkCutting((prev) => ({ ...prev, [name]: value }));

    // Jika tukang cutting berubah, generate nomor seri baru
    if (name === "tukang_cutting_id") {
      await fetchSpkNumber(value);
    }
  };

  const handleBagianChange = (index, key, value) => {
    const updated = [...newSpkCutting.bagian];
    updated[index][key] = value;
    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const handleBahanChange = (bagianIndex, bahanIndex, key, value) => {
    const updated = [...newSpkCutting.bagian];
    updated[bagianIndex].bahan[bahanIndex][key] = value;

    // Jika warna diubah ke "Lainnya", reset warna_custom
    if (key === "warna" && value !== "Lainnya") {
      updated[bagianIndex].bahan[bahanIndex].warna_custom = "";
    }

    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const handleWarnaCustomChange = (bagianIndex, bahanIndex, value) => {
    const updated = [...newSpkCutting.bagian];
    updated[bagianIndex].bahan[bahanIndex].warna_custom = value;
    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const addBagian = () => {
    setNewSpkCutting((prev) => ({
      ...prev,
      bagian: [...prev.bagian, { nama_bagian: "", bahan: [] }],
    }));
  };

  const addBahan = (bagianIndex) => {
    const updated = [...newSpkCutting.bagian];
    updated[bagianIndex].bahan.push({ bahan_id: "", warna: "", warna_custom: "", qty: "" });
    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const removeBahan = (bagianIndex, bahanIndex) => {
    const updated = [...newSpkCutting.bagian];
    updated[bagianIndex].bahan.splice(bahanIndex, 1);
    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const handleDetailClick = (spk) => {
    setSelectedDetailSpk(spk); // Simpan data hutang yang dipilih
  };

  return (
    <div className="spk-cutting-page">
      <div className="spk-cutting-header">
        <div className="spk-cutting-header-icon">
          <FaInfoCircle />
        </div>
        <h1>Data SPK Cutting</h1>
      </div>

      <div className="spk-cutting-table-container">
        <div className="spk-cutting-filter-header">
          <button
            className="spk-cutting-btn-add"
            onClick={() => {
              // Reset form saat membuka
              setNewSpkCutting({
                id_spk_cutting: "",
                produk_id: "",
                tanggal_batas_kirim: "",
                harga_jasa: "",
                satuan_harga: "Pcs",
                keterangan: "",
                tukang_cutting_id: "",
                bagian: [],
              });
              setShowForm(true);
            }}
          >
            <FaPlus /> Tambah SPK Cutting
          </button>
          <div className="spk-cutting-search-bar">
            <input type="text" placeholder="Cari ID, Nomor SPK, Tukang, atau Produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <p className="spk-cutting-loading">Memuat data...</p>
        ) : error ? (
          <p className="spk-cutting-error">{error}</p>
        ) : (
          <>
            <table className="spk-cutting-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>SPK Cutting ID</th>
                  <th>Tukang Cutting</th>
                  <th>Nama Produk</th>
                  <th>Deadline</th>
                  <th>Sisa Hari</th>
                  <th>Harga Jasa</th>
                  <th>Harga Per Pcs</th>
                  <th>Status</th>
                  <th>Tanggal Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((spk, index) => (
                  <tr key={spk.id}>
                    <td>{indexOfFirstItem + index + 1}</td>
                    <td>{spk.id_spk_cutting}</td>
                    <td>{spk.tukang_cutting?.nama_tukang_cutting || "-"}</td>
                    <td>{spk.produk?.nama_produk || "-"}</td>
                    <td>{spk.tanggal_batas_kirim || "-"}</td>
                    <td>{spk.sisa_hari !== null ? spk.sisa_hari + " hari" : "Belum ada deadline"}</td>
                    <td className="spk-cutting-price">
                      {formatRupiah(spk.harga_jasa)} / {spk.satuan_harga}
                    </td>
                    <td className="spk-cutting-price">{formatRupiah(spk.harga_per_pcs)}</td>
                    <td>
                      <span className={`spk-cutting-badge ${spk.status_cutting?.toLowerCase().replace(" ", "-") || "in-progress"}`}>{spk.status_cutting || "In Progress"}</span>
                    </td>
                    <td>{new Date(spk.created_at).toLocaleDateString("id-ID")}</td>
                    <td>
                      <button className="spk-cutting-btn-icon view" onClick={() => handleDetailClick(spk)} title="Lihat Detail">
                        <FaInfoCircle />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="spk-cutting-pagination">
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button key={page} className={currentPage === page ? "active" : ""} onClick={() => goToPage(page)}>
                      {page}
                    </button>
                  );
                })}

                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="spk-cutting-modal">
          <div className="spk-cutting-modal-content">
            <h2>Tambah SPK Cutting</h2>
            <form onSubmit={handleFormSubmit} className="spk-cutting-form">
              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Tukang Cutting:</label>
                  <select name="tukang_cutting_id" value={newSpkCutting.tukang_cutting_id} onChange={handleInputChange} required>
                    <option value="">Pilih Tukang</option>
                    {tukangList.map((tukang) => (
                      <option key={tukang.id} value={tukang.id}>
                        {tukang.nama_tukang_cutting}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="spk-cutting-form-group">
                  <label>Nomor Seri SPK:</label>
                  <input type="text" name="id_spk_cutting" value={newSpkCutting.id_spk_cutting || "Pilih tukang cutting terlebih dahulu"} readOnly disabled />
                  <small style={{ color: "#666", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    Nomor seri akan di-generate otomatis berdasarkan nama tukang cutting yang dipilih. Format: [Inisial]-[Nomor Urut] (contoh: NR-01, NR-02). Nomor seri tidak dapat diubah.
                  </small>
                </div>
              </div>

              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Produk:</label>
                  <select name="produk_id" value={newSpkCutting.produk_id} onChange={handleInputChange} required>
                    <option value="">Pilih Produk</option>
                    {produkList.map((produk) => (
                      <option key={produk.id} value={produk.id}>
                        {produk.nama_produk}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="spk-cutting-form-group">
                  <label>Tanggal Batas Kirim:</label>
                  <input type="date" name="tanggal_batas_kirim" value={newSpkCutting.tanggal_batas_kirim} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="spk-cutting-form-row">
                <div className="spk-cutting-form-group">
                  <label>Harga Jasa:</label>
                  <input type="number" name="harga_jasa" value={newSpkCutting.harga_jasa} onChange={handleInputChange} required />
                </div>

                <div className="spk-cutting-form-group">
                  <label>Satuan Harga:</label>
                  <select name="satuan_harga" value={newSpkCutting.satuan_harga} onChange={handleInputChange} required>
                    <option value="Pcs">Pcs</option>
                    <option value="Lusin">Lusin</option>
                  </select>
                </div>
              </div>

              <div className="spk-cutting-form-group">
                <label>Keterangan:</label>
                <textarea name="keterangan" value={newSpkCutting.keterangan} onChange={handleInputChange} />
              </div>

              {/* Bagian dan Bahan */}
              <h3>Bagian & Bahan</h3>
              {newSpkCutting.bagian.map((bagian, bagianIndex) => (
                <div key={bagianIndex} className="spk-cutting-bagian-section">
                  <h4>Bagian {bagianIndex + 1}</h4>
                  <div className="spk-cutting-form-group">
                    <label>Nama Bagian:</label>
                    <input type="text" placeholder="Nama Bagian" value={bagian.nama_bagian} onChange={(e) => handleBagianChange(bagianIndex, "nama_bagian", e.target.value)} required />
                  </div>

                  {bagian.bahan.map((bahan, bahanIndex) => (
                    <div key={bahanIndex} className="spk-cutting-bahan-group">
                      <select value={bahan.bahan_id || ""} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "bahan_id", e.target.value)} required>
                        <option value="">Pilih Bahan</option>
                        {bahanList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nama_bahan}
                          </option>
                        ))}
                      </select>
                      <select value={bahan.warna || ""} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "warna", e.target.value)}>
                        <option value="">Pilih Warna</option>
                        {warnaList.map((warna, idx) => (
                          <option key={idx} value={warna}>
                            {warna}
                          </option>
                        ))}
                      </select>
                      {bahan.warna === "Lainnya" && <input type="text" placeholder="Masukkan warna custom..." value={bahan.warna_custom || ""} onChange={(e) => handleWarnaCustomChange(bagianIndex, bahanIndex, e.target.value)} required />}
                      <input type="number" placeholder="Qty (Jumlah Rol)" value={bahan.qty} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "qty", e.target.value)} required />
                      <button type="button" onClick={() => removeBahan(bagianIndex, bahanIndex)}>
                        Hapus Bahan
                      </button>
                    </div>
                  ))}

                  <button type="button" className="spk-cutting-btn spk-cutting-btn-success" onClick={() => addBahan(bagianIndex)}>
                    <FaPlus /> Tambah Bahan
                  </button>
                </div>
              ))}

              <button type="button" className="spk-cutting-btn spk-cutting-btn-success" onClick={addBagian}>
                <FaPlus /> Tambah Bagian
              </button>

              <div className="spk-cutting-form-actions">
                <button type="submit" className="spk-cutting-btn spk-cutting-btn-primary">
                  Simpan
                </button>
                <button type="button" className="spk-cutting-btn spk-cutting-btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDetailSpk && (
        <div className="spk-cutting-modal">
          <div className="spk-cutting-modal-content">
            <h2>Detail SPK Cutting</h2>
            <div className="spk-cutting-detail-grid">
              <div className="spk-cutting-detail-item">
                <strong>ID SPK</strong>
                <span>{selectedDetailSpk.id}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Nomor SPK</strong>
                <span>{selectedDetailSpk.id_spk_cutting}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Tukang Cutting</strong>
                <span>{selectedDetailSpk.tukang_cutting?.nama_tukang_cutting || "-"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Produk</strong>
                <span>{selectedDetailSpk.produk?.nama_produk || "-"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Deadline</strong>
                <span>{selectedDetailSpk.tanggal_batas_kirim || "-"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Sisa Hari</strong>
                <span>{selectedDetailSpk.sisa_hari !== null ? selectedDetailSpk.sisa_hari + " hari" : "Belum ada deadline"}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Harga Jasa</strong>
                <span className="spk-cutting-price">
                  {formatRupiah(selectedDetailSpk.harga_jasa)} / {selectedDetailSpk.satuan_harga}
                </span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Harga Per Pcs</strong>
                <span className="spk-cutting-price">{formatRupiah(selectedDetailSpk.harga_per_pcs)}</span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Status</strong>
                <span>
                  <span className={`spk-cutting-badge ${selectedDetailSpk.status_cutting?.toLowerCase().replace(" ", "-") || "in-progress"}`}>{selectedDetailSpk.status_cutting || "In Progress"}</span>
                </span>
              </div>
              <div className="spk-cutting-detail-item">
                <strong>Tanggal Dibuat</strong>
                <span>{new Date(selectedDetailSpk.created_at).toLocaleDateString("id-ID")}</span>
              </div>
              {selectedDetailSpk.keterangan && (
                <div className="spk-cutting-detail-item">
                  <strong>Keterangan</strong>
                  <span>{selectedDetailSpk.keterangan}</span>
                </div>
              )}
            </div>

            <h3>Detail Bagian & Bahan:</h3>

            {selectedDetailSpk.bagian?.length > 0 ? (
              <div className="spk-cutting-scrollable-table">
                <table className="spk-cutting-log-table">
                  <thead>
                    <tr>
                      {selectedDetailSpk.bagian.map((bagian, i) => (
                        <th key={i} colSpan="3" style={{ textAlign: "center" }}>
                          {bagian.nama_bagian.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {selectedDetailSpk.bagian.map((_, i) => (
                        <React.Fragment key={`subheader-${i}`}>
                          <th>NAMA BAHAN</th>
                          <th>WARNA</th>
                          <th>QTY</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({
                      length: Math.max(...selectedDetailSpk.bagian.map((b) => b.bahan.length)),
                    }).map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {selectedDetailSpk.bagian.map((bagian, bagianIndex) => {
                          const bahan = bagian.bahan[rowIndex];
                          return (
                            <>
                              <td key={`nama-${bagianIndex}-${rowIndex}`}>{bahan ? bahan.bahan?.nama_bahan || bahan.nama_bahan : ""}</td>
                              <td key={`warna-${bagianIndex}-${rowIndex}`}>{bahan ? bahan.warna || "-" : ""}</td>
                              <td key={`qty-${bagianIndex}-${rowIndex}`}>{bahan ? bahan.qty : ""}</td>
                            </>
                          );
                        })}
                      </tr>
                    ))}

                    {/* total per bagian */}
                    <tr>
                      {selectedDetailSpk.bagian.map((bagian, i) => {
                        const total = bagian.bahan.reduce((sum, b) => sum + (parseFloat(b.qty) || 0), 0);
                        return (
                          <>
                            <td key={`label-total-${i}`}>
                              <strong>JUMLAH</strong>
                            </td>
                            <td key={`warna-total-${i}`}>-</td>
                            <td key={`value-total-${i}`}>
                              <strong>{total}</strong>
                            </td>
                          </>
                        );
                      })}
                    </tr>

                    {/* total keseluruhan */}
                    <tr>
                      <td colSpan={selectedDetailSpk.bagian.length * 3} style={{ textAlign: "right" }}>
                        <strong>JUMLAH TOTAL: {selectedDetailSpk.bagian.reduce((sum, bagian) => sum + bagian.bahan.reduce((s, b) => s + (parseFloat(b.qty) || 0), 0), 0)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="spk-cutting-loading">Tidak ada bagian ditemukan.</p>
            )}

            <div className="spk-cutting-form-actions">
              <button className="spk-cutting-btn spk-cutting-btn-secondary" onClick={() => setSelectedDetailSpk(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpkCutting;
