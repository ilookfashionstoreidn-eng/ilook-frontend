import React, { useEffect, useState } from "react";
import "../../Jahit/Penjahit.css";
import API from "../../../api";
import { FaTrash, FaInfoCircle } from "react-icons/fa";

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
  const [bagianSpk, setbagianSpk] = useState([]);

  // List warna untuk dropdown
  const warnaList = ["Putih", "Hitam", "Merah", "Biru", "Hijau", "Kuning", "Abu-abu", "Coklat", "Pink", "Ungu", "Orange", "Navy", "Maroon", "Beige", "Khaki", "Lainnya"];

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
        setSpkCutting(response.data);
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

  const filteredSpkCutting = spkCutting.filter((item) => item.id.toString().includes(searchTerm.toLowerCase()));

  const handleFormSubmit = async (e) => {
    e.preventDefault();

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
        if (!bahan.qty || bahan.qty <= 0) {
          alert(`Bagian ${i + 1}, Bahan ${j + 1}: Qty harus lebih dari 0!`);
          return;
        }
      }
    }

    // Konversi bahan_id menjadi integer
    const dataToSend = {
      ...newSpkCutting,
      bagian: newSpkCutting.bagian.map((bagian) => ({
        ...bagian,
        bahan: bagian.bahan.map((bahan) => ({
          bahan_id: parseInt(bahan.bahan_id),
          warna: bahan.warna || null,
          qty: parseFloat(bahan.qty),
          berat: bahan.berat ? parseFloat(bahan.berat) : null,
        })),
      })),
    };

    console.log("Data SPK Cutting yang dikirim:", dataToSend);

    try {
      const response = await API.post("/spk_cutting", dataToSend);

      console.log("Response:", response.data);
      alert("SPK Cutting berhasil ditambahkan!");

      // Jika ingin menambahkan ke list state SPK Cutting
      setSpkCutting((prev) => [...prev, response.data.data]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSpkCutting((prev) => ({ ...prev, [name]: value }));
  };

  const handleBagianChange = (index, key, value) => {
    const updated = [...newSpkCutting.bagian];
    updated[index][key] = value;
    setNewSpkCutting((prev) => ({ ...prev, bagian: updated }));
  };

  const handleBahanChange = (bagianIndex, bahanIndex, key, value) => {
    const updated = [...newSpkCutting.bagian];
    updated[bagianIndex].bahan[bahanIndex][key] = value;
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
    updated[bagianIndex].bahan.push({ bahan_id: "", warna: "", qty: "", berat: "" });
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
    <div>
      <div className="penjahit-container">
        <h1>Data SPK Cutting</h1>
      </div>

      <div className="table-container">
        <div className="filter-header1">
          <button onClick={() => setShowForm(true)}>Tambah</button>
          <div className="search-bar1">
            <input type="text" placeholder="Cari nama aksesoris..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="table-container">
          <table className="penjahit-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>SPK Cutting ID</th>
                <th>Tukang Cutting</th>
                <th>Nama Produk</th>
                <th>Deadline</th>
                <th> Sisa Hari</th>
                <th>harga jasa</th>
                <th>harga per pcs </th>
                <th>Status</th>
                <th>Tanggal dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpkCutting.map((spk) => (
                <tr key={spk.id}>
                  <td data-label="Id : ">{spk.id}</td>
                  <td data-label="Id : ">{spk.id_spk_cutting}</td>
                  <td data-label="tukang cutting : ">{spk.tukang_cutting?.nama_tukang_cutting}</td>
                  <td data-label="harga jasa : ">{spk.produk?.nama_produk}</td>
                  <td data-label="harga jasa : ">{spk.tanggal_batas_kirim}</td>
                  <td data-label="Sisa Hari:">{spk.sisa_hari !== null ? spk.sisa_hari + " hari" : "Belum ada deadline"}</td>

                  <td data-label="harga jasa : ">
                    Rp. {spk.harga_jasa} / {spk.satuan_harga}
                  </td>
                  <td data-label="harga jasa : ">Rp. {spk.harga_per_pcs}</td>

                  <td data-label="harga jasa : ">{spk.status_cutting}</td>
                  <td data-label="htanggal : ">{new Date(spk.created_at).toLocaleDateString("id-ID")}</td>

                  <td>
                    <div className="action-card">
                      <button className="btn1-icon" onClick={() => handleDetailClick(spk)}>
                        <FaInfoCircle className="icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Tambah SPK Cutting</h2>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
                <label>ID SPK Cutting:</label>
                <input type="text" name="id_spk_cutting" value={newSpkCutting.id_spk_cutting} onChange={handleInputChange} placeholder="Masukkan ID SPK" required />
              </div>
              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group">
                <label>Tanggal Batas Kirim:</label>
                <input type="date" name="tanggal_batas_kirim" value={newSpkCutting.tanggal_batas_kirim} onChange={handleInputChange} required />
              </div>

              <div className="form-group">
                <label>Harga Jasa:</label>
                <input type="number" name="harga_jasa" value={newSpkCutting.harga_jasa} onChange={handleInputChange} required />
              </div>

              <div className="form-group">
                <label>Satuan Harga:</label>
                <select name="satuan_harga" value={newSpkCutting.satuan_harga} onChange={handleInputChange} required>
                  <option value="Pcs">Pcs</option>
                  <option value="Lusin">Lusin</option>
                </select>
              </div>

              <div className="form-group">
                <label>Keterangan:</label>
                <textarea name="keterangan" value={newSpkCutting.keterangan} onChange={handleInputChange} />
              </div>

              {/* Bagian dan Bahan */}
              {newSpkCutting.bagian.map((bagian, bagianIndex) => (
                <div key={bagianIndex} className="form-subsection">
                  <h4>Bagian {bagianIndex + 1}</h4>
                  <input type="text" placeholder="Nama Bagian" value={bagian.nama_bagian} onChange={(e) => handleBagianChange(bagianIndex, "nama_bagian", e.target.value)} required />

                  {bagian.bahan.map((bahan, bahanIndex) => (
                    <div key={bahanIndex} className="bahan-group">
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
                      <input type="number" placeholder="Qty (Jumlah Rol)" value={bahan.qty} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "qty", e.target.value)} required />
                      <input type="number" step="0.01" placeholder="Berat (Estimasi)" value={bahan.berat || ""} onChange={(e) => handleBahanChange(bagianIndex, bahanIndex, "berat", e.target.value)} />
                      <button type="button" onClick={() => removeBahan(bagianIndex, bahanIndex)}>
                        Hapus Bahan
                      </button>
                    </div>
                  ))}

                  <button type="button" onClick={() => addBahan(bagianIndex)}>
                    Tambah Bahan
                  </button>
                  <hr />
                </div>
              ))}

              <button type="button" onClick={addBagian}>
                Tambah Bagian
              </button>

              <div className="form-actions">
                <button type="submit" className="btn btn-submit">
                  Simpan
                </button>
                <button type="button" className="btn btn-cancel" onClick={() => setShowForm(false)}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDetailSpk && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Detail SPK</h3>
            </div>
            <div className="modal-body">
              <h4>ID SPK: {selectedDetailSpk.id}</h4>
              <p>
                <strong>Deadline:</strong> {selectedDetailSpk.tanggal_batas_kirim}
              </p>
              <p>
                <strong>Keterangan:</strong> {selectedDetailSpk.keterangan}
              </p>

              <br />
              <h4>Detail Bagian & Bahan:</h4>

              {selectedDetailSpk.bagian?.length > 0 ? (
                <div className="scrollable-table">
                  <table className="log-table">
                    <thead>
                      <tr>
                        {selectedDetailSpk.bagian.map((bagian, i) => (
                          <th key={i} colSpan="4" style={{ textAlign: "center" }}>
                            {bagian.nama_bagian.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {selectedDetailSpk.bagian.map((_, i) => (
                          <>
                            <th key={`nama-${i}`}>NAMA BAHAN</th>
                            <th key={`qty-${i}`}>QTY</th>
                          </>
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
                                <td key={`berat-${bagianIndex}-${rowIndex}`}>{bahan ? (bahan.berat ? `${bahan.berat} kg` : "-") : ""}</td>
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
                              <td key={`berat-total-${i}`}>-</td>
                            </>
                          );
                        })}
                      </tr>

                      {/* total keseluruhan */}
                      <tr>
                        <td colSpan={selectedDetailSpk.bagian.length * 4} style={{ textAlign: "right" }}>
                          <strong>JUMLAH TOTAL: {selectedDetailSpk.bagian.reduce((sum, bagian) => sum + bagian.bahan.reduce((s, b) => s + (parseFloat(b.qty) || 0), 0), 0)}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-logs">Tidak ada bagian ditemukan.</p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-close" onClick={() => setSelectedDetailSpk(null)}>
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
