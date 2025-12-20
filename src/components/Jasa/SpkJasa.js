import React, { useEffect, useState } from "react";
import "./SpkJasa.css";
import API from "../../api";
import { FaTimes, FaPlus } from "react-icons/fa";

const SpkJasa = () => {
  const [spkJasa, setSpkJasa] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tukangList, setTukangList] = useState([]);
  const [distribusiList, setDistribusiList] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [selectedDistribusiId, setSelectedDistribusiId] = useState("");
  const [searchDistribusi, setSearchDistribusi] = useState("");
  const [showDistribusiDropdown, setShowDistribusiDropdown] = useState(false);
  const [newSpkJasa, setNewSpkJasa] = useState({
    tukang_jasa_id: "",
    spk_cutting_distribusi_id: "",
    deadline: "",
    harga: "",
    opsi_harga: "pcs",
    tanggal_ambil: "",
  });

  useEffect(() => {
    const fetchSpkJasa = async () => {
      try {
        setLoading(true);
        const response = await API.get("/SpkJasa");
        const data = Array.isArray(response.data) ? response.data : [];
        console.log("Data SPK Jasa:", data);
        if (data.length > 0) {
          console.log("Sample SPK Jasa:", data[0]);
          console.log("Distribusi:", data[0].spkCuttingDistribusi);
        }
        setSpkJasa(data);
      } catch (error) {
        console.error("Error fetching SPK Jasa:", error);
        setError("Gagal mengambil data");
        setSpkJasa([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSpkJasa();
  }, []);

  useEffect(() => {
    const fetchTukang = async () => {
      try {
        const response = await API.get("/tukang-jasa");
        const data = Array.isArray(response.data) ? response.data : [];
        setTukangList(data);
      } catch (error) {
        console.error("Gagal mengambil data tukang jasa:", error);
        setTukangList([]);
      }
    };
    fetchTukang();
  }, []);

  useEffect(() => {
    const fetchDistribusi = async () => {
      try {
        const distribusiArray = [];
        let currentPage = 1;
        let hasMorePages = true;
        const hasilCuttingIds = [];

        while (hasMorePages) {
          const response = await API.get(`/hasil_cutting?per_page=100&page=${currentPage}`);

          let hasilCuttingData = [];
          let pagination = null;

          if (response.data && response.data.data) {
            hasilCuttingData = response.data.data;
            pagination = response.data;
          } else if (Array.isArray(response.data)) {
            hasilCuttingData = response.data;
            hasMorePages = false;
          } else {
            hasilCuttingData = [];
            hasMorePages = false;
          }

          if (Array.isArray(hasilCuttingData)) {
            hasilCuttingData.forEach((hasil) => {
              if (hasil.id) {
                hasilCuttingIds.push(hasil.id);
              }
            });
          }

          if (pagination && pagination.current_page && pagination.last_page) {
            hasMorePages = currentPage < pagination.last_page;
            currentPage++;
          } else {
            hasMorePages = false;
          }
        }

        console.log("Total hasil cutting ditemukan:", hasilCuttingIds.length);

        const batchSize = 10;
        for (let i = 0; i < hasilCuttingIds.length; i += batchSize) {
          const batch = hasilCuttingIds.slice(i, i + batchSize);

          const detailPromises = batch.map(async (id) => {
            try {
              const detailResponse = await API.get(`/hasil_cutting/${id}`);
              return detailResponse.data;
            } catch (error) {
              console.error(`Gagal mengambil detail hasil cutting ${id}:`, error);
              return null;
            }
          });

          const detailResults = await Promise.all(detailPromises);

          detailResults.forEach((hasil) => {
            if (hasil && hasil.distribusi_seri && Array.isArray(hasil.distribusi_seri)) {
              hasil.distribusi_seri.forEach((dist) => {
                if (dist.id) {
                  distribusiArray.push({
                    id: dist.id,
                    kode_seri: dist.kode_seri || `Seri ${dist.id}`,
                    jumlah_produk: dist.jumlah_produk || 0,
                    hasil_cutting_id: hasil.id,
                    produk: hasil.spk_cutting?.produk?.nama_produk || hasil.nama_produk || "-",
                  });
                }
              });
            }
          });
        }

        console.log("Total distribusi ditemukan:", distribusiArray.length, distribusiArray);
        setDistribusiList(distribusiArray);
      } catch (error) {
        console.error("Gagal mengambil data distribusi:", error);
        setDistribusiList([]);
      }
    };
    fetchDistribusi();
  }, []);

  useEffect(() => {
    const fetchPreview = async () => {
      if (selectedDistribusiId) {
        try {
          const response = await API.get(`/preview/${selectedDistribusiId}`);
          setPreviewData(response.data);
        } catch (error) {
          console.error("Gagal mengambil preview:", error);
          setPreviewData(null);
        }
      } else {
        setPreviewData(null);
      }
    };
    fetchPreview();
  }, [selectedDistribusiId]);

  const filteredSpkJasa = spkJasa.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.id.toString().includes(searchLower) ||
      item.tukangJasa?.nama?.toLowerCase().includes(searchLower) ||
      item.spkCuttingDistribusi?.spkCutting?.produk?.nama_produk?.toLowerCase().includes(searchLower) ||
      item.spkCuttingDistribusi?.kode_seri?.toLowerCase().includes(searchLower)
    );
  });

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!newSpkJasa.spk_cutting_distribusi_id) {
      alert("Silakan pilih Distribusi Seri terlebih dahulu");
      return;
    }

    try {
      await API.post("/SpkJasa", {
        tukang_jasa_id: newSpkJasa.tukang_jasa_id,
        spk_cutting_distribusi_id: newSpkJasa.spk_cutting_distribusi_id,
        deadline: newSpkJasa.deadline,
        harga: newSpkJasa.harga || null,
        opsi_harga: newSpkJasa.opsi_harga || null,
        tanggal_ambil: newSpkJasa.tanggal_ambil || null,
      });

      alert("SPK Jasa berhasil ditambahkan!");

      const refreshResponse = await API.get("/SpkJasa");
      setSpkJasa(refreshResponse.data);

      setNewSpkJasa({
        tukang_jasa_id: "",
        spk_cutting_distribusi_id: "",
        deadline: "",
        harga: "",
        opsi_harga: "pcs",
        tanggal_ambil: "",
      });
      setSelectedDistribusiId("");
      setPreviewData(null);
      setSearchDistribusi("");
      setShowDistribusiDropdown(false);
      setShowForm(false);
    } catch (error) {
      console.error("Error:", error);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan SPK Jasa.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSpkJasa((prev) => ({ ...prev, [name]: value }));

    if (name === "spk_cutting_distribusi_id") {
      setSelectedDistribusiId(value);
    }
  };

  const filteredDistribusiList = Array.isArray(distribusiList)
    ? distribusiList.filter((dist) => {
        const searchLower = searchDistribusi.toLowerCase();
        return dist.kode_seri?.toLowerCase().includes(searchLower) || dist.produk?.toLowerCase().includes(searchLower) || dist.id?.toString().includes(searchLower);
      })
    : [];

  const handleDistribusiSelect = (distId) => {
    setNewSpkJasa((prev) => ({ ...prev, spk_cutting_distribusi_id: distId }));
    setSelectedDistribusiId(distId);
    setShowDistribusiDropdown(false);
    setSearchDistribusi("");
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await API.patch(`/spk-jasa/${id}/status-pengambilan`, {
        status: newStatus,
      });
      alert("Status berhasil diperbarui");

      const refreshResponse = await API.get("/SpkJasa");
      setSpkJasa(refreshResponse.data);
    } catch (error) {
      console.error("Error:", error);
      alert(error.response?.data?.message || "Terjadi kesalahan saat memperbarui status.");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      belum_diambil: "belum-diambil",
      sudah_diambil: "sudah-diambil",
      batal_diambil: "batal-diambil",
      selesai: "selesai",
    };
    const statusLabels = {
      belum_diambil: "Belum Diambil",
      sudah_diambil: "Sudah Diambil",
      batal_diambil: "Batal Diambil",
      selesai: "Selesai",
    };
    const className = statusMap[status] || "";
    const label = statusLabels[status] || status;

    return <span className={`status-badge ${className}`}>{label}</span>;
  };

  const handleCloseModal = () => {
    setShowForm(false);
    setNewSpkJasa({
      tukang_jasa_id: "",
      spk_cutting_distribusi_id: "",
      deadline: "",
      harga: "",
      opsi_harga: "pcs",
      tanggal_ambil: "",
    });
    setSelectedDistribusiId("");
    setPreviewData(null);
    setSearchDistribusi("");
    setShowDistribusiDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDistribusiDropdown) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest(".searchable-select-wrapper")) {
        setShowDistribusiDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDistribusiDropdown]);

  return (
    <div className="spk-jasa-container">
      <div className="spk-jasa-header">
        <h1>Data SPK Jasa</h1>
      </div>

      <div className="spk-jasa-actions">
        <button className="btn-tambah" onClick={() => setShowForm(true)}>
          <FaPlus style={{ marginRight: "8px" }} />
          Tambah SPK Jasa
        </button>
        <div className="search-wrapper">
          <input type="text" placeholder="Cari ID, Tukang Jasa, Produk, atau Kode Seri..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Memuat data...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : (
        <div className="table-wrapper">
          <table className="spk-jasa-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tukang Jasa</th>
                <th>Kode Seri</th>
                <th>Nama Produk</th>
                <th>Jumlah</th>
                <th>Harga per Pcs</th>
                <th>Deadline</th>
                <th>Sisa Hari</th>
                <th>Status</th>
                <th>Tanggal Ambil</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpkJasa.length === 0 ? (
                <tr>
                  <td colSpan="11" className="empty-state">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                Array.isArray(filteredSpkJasa) &&
                filteredSpkJasa.map((spk) => {
                  if (spk.id === 1 || spk.id === 2 || spk.id === 3) {
                    console.log(`SPK ID ${spk.id}:`, {
                      distribusi: spk.spkCuttingDistribusi,
                      fullSpk: spk,
                    });
                  }

                  const distribusi = spk.spkCuttingDistribusi || spk.spk_cutting_distribusi;
                  const kodeSeri = distribusi?.kode_seri || distribusi?.kodeSeri || "-";

                  let namaProduk = "-";
                  if (distribusi?.spkCutting?.produk?.nama_produk) {
                    namaProduk = distribusi.spkCutting.produk.nama_produk;
                  } else if (distribusi?.spk_cutting?.produk?.nama_produk) {
                    namaProduk = distribusi.spk_cutting.produk.nama_produk;
                  } else if (distribusi?.spkCutting?.produk?.namaProduk) {
                    namaProduk = distribusi.spkCutting.produk.namaProduk;
                  } else if (spk.produk?.nama_produk) {
                    namaProduk = spk.produk.nama_produk;
                  } else if (spk.nama_produk) {
                    namaProduk = spk.nama_produk;
                  }

                  return (
                    <tr key={spk.id}>
                      <td>{spk.id}</td>
                      <td>{spk.tukangJasa?.nama || spk.tukang_jasa?.nama || "-"}</td>
                      <td>{kodeSeri}</td>
                      <td>{namaProduk}</td>
                      <td>{spk.jumlah || "-"}</td>
                      <td>{spk.harga_per_pcs ? <span style={{ whiteSpace: "nowrap" }}>Rp {Number(spk.harga_per_pcs).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> : "-"}</td>
                      <td>{spk.deadline ? new Date(spk.deadline).toLocaleDateString("id-ID") : "-"}</td>
                      <td>{spk.sisa_hari !== null && spk.sisa_hari !== undefined ? `${spk.sisa_hari} hari` : "-"}</td>
                      <td>{getStatusBadge(spk.status_pengambilan)}</td>
                      <td>{spk.tanggal_ambil ? new Date(spk.tanggal_ambil).toLocaleDateString("id-ID") : "-"}</td>
                      <td>
                        <select className="status-select" value={spk.status_pengambilan} onChange={(e) => handleStatusUpdate(spk.id, e.target.value)}>
                          <option value="belum_diambil">Belum Diambil</option>
                          <option value="sudah_diambil">Sudah Diambil</option>
                          <option value="batal_diambil">Batal Diambil</option>
                          <option value="selesai">Selesai</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah SPK Jasa</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label>Distribusi Seri:</label>
                  <div className={`searchable-select-wrapper ${showDistribusiDropdown ? "active" : ""}`}>
                    <div className="searchable-select-input" onClick={() => setShowDistribusiDropdown(!showDistribusiDropdown)}>
                      {newSpkJasa.spk_cutting_distribusi_id ? (
                        <span>
                          {distribusiList.find((d) => d.id.toString() === newSpkJasa.spk_cutting_distribusi_id.toString())?.kode_seri} -{" "}
                          {distribusiList.find((d) => d.id.toString() === newSpkJasa.spk_cutting_distribusi_id.toString())?.produk} (
                          {distribusiList.find((d) => d.id.toString() === newSpkJasa.spk_cutting_distribusi_id.toString())?.jumlah_produk} pcs)
                        </span>
                      ) : (
                        <span className="placeholder-text">-- Pilih Distribusi Seri --</span>
                      )}
                      <span className="dropdown-arrow">▼</span>
                    </div>
                    {showDistribusiDropdown && (
                      <div className="searchable-select-dropdown">
                        <div className="searchable-select-search">
                          <input
                            type="text"
                            placeholder="Cari kode seri, produk..."
                            value={searchDistribusi}
                            onChange={(e) => {
                              setSearchDistribusi(e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div className="searchable-select-options">
                          {filteredDistribusiList.length === 0 ? (
                            <div className="no-options">Tidak ada data ditemukan</div>
                          ) : (
                            filteredDistribusiList.map((dist) => (
                              <div key={dist.id} className={`searchable-select-option ${newSpkJasa.spk_cutting_distribusi_id === dist.id.toString() ? "selected" : ""}`} onClick={() => handleDistribusiSelect(dist.id.toString())}>
                                <div className="option-main">
                                  <strong>{dist.kode_seri}</strong> - {dist.produk}
                                </div>
                                <div className="option-sub">({dist.jumlah_produk} pcs)</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {previewData && (
                    <div className="preview-box">
                      <strong>Preview:</strong>
                      <div>Kode Seri: {previewData.kode_seri}</div>
                      <div>Jumlah: {previewData.jumlah} pcs</div>
                      <div>Produk: {previewData.produk}</div>
                      <div>Tukang Cutting: {previewData.tukang_cutting}</div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Tukang Jasa:</label>
                  <select name="tukang_jasa_id" value={newSpkJasa.tukang_jasa_id} onChange={handleInputChange} required>
                    <option value="">Pilih Tukang Jasa</option>
                    {Array.isArray(tukangList) &&
                      tukangList.map((tukang) => (
                        <option key={tukang.id} value={tukang.id}>
                          {tukang.nama}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Deadline:</label>
                  <input type="date" name="deadline" value={newSpkJasa.deadline} onChange={handleInputChange} required min={new Date().toISOString().split("T")[0]} />
                </div>

                <div className="form-group">
                  <label>Harga (Opsional):</label>
                  <input type="number" name="harga" value={newSpkJasa.harga} onChange={handleInputChange} min="0" step="0.01" />
                </div>

                <div className="form-group">
                  <label>Satuan Harga (Opsional):</label>
                  <select name="opsi_harga" value={newSpkJasa.opsi_harga} onChange={handleInputChange}>
                    <option value="pcs">Pcs</option>
                    <option value="lusin">Lusin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tanggal Ambil (Opsional):</label>
                  <input type="date" name="tanggal_ambil" value={newSpkJasa.tanggal_ambil} onChange={handleInputChange} />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit">
                    Simpan
                  </button>
                  <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                    Batal
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

export default SpkJasa;
