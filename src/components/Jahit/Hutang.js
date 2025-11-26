import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaSave, FaTimes, FaRegEye, FaClock,FaInfoCircle,FaClipboard , FaList,FaMoneyBillWave  } from 'react-icons/fa';
import "./Penjahit.css";
import API from "../../api"; 

const Hutang = () => {
  const [hutangs, setHutangs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [penjahitList, setPenjahitList] = useState([]); 
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [selectedJenisPerubahan, setSelectedJenisPerubahan] = useState(""); // State filter
  const [selectedDetailHutang, setSelectedDetailHutang] = useState(null);
  const [logHistory, setLogHistory] = useState([]);

  const [newHutang, setNewHutang] = useState({
    id_penjahit: "",
    jumlah_hutang: "",
    jenis_hutang: "overtime", 
    potongan_per_minggu: "",
    is_potongan_persen: false,
    persentase_potongan: null,
    bukti_transfer: null,


  });
  const [selectedHutang, setSelectedHutang] = useState(null); // Form pembayaran hutang
  const [logPembayaran, setLogPembayaran] = useState({
    jumlah_dibayar: "",
    tanggal_bayar: "",
    catatan: "",
  });

  const jenisHutangOptions = [
    { value: "overtime", label: "Overtime" },
    { value: "lainnya", label: "Lainnya" },
  ];


  
  useEffect(() => {
    const fetchHutangs= async () => {
      try {
        setLoading(true);
  
        const response = await API.get(`/hutang`, {
        });
  
        console.log("Data Hutang:", response.data); // Debugging
  
        setHutangs(response.data.data);
        setLastPage(response.data.last_page);
      } catch (error) {
        setError(error.response?.data?.message || "Failed to fetch data");
        console.error("Error fetching SPK:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchHutangs();
  }, [currentPage]); 
  
  
  
 


useEffect(() => {
  const fetchPenjahits = async () => {
    try {
      setLoading(true);
      const response = await API.get("/penjahit"); 
      setPenjahitList(response.data);
    } catch (error) {
      setError("Gagal mengambil data penjahit.");
    } finally {
      setLoading(false);
    }
  };

  fetchPenjahits();
}, []);



const handleFormSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("id_penjahit", newHutang.id_penjahit);
  formData.append("jumlah_hutang", newHutang.jumlah_hutang);
  formData.append("jenis_hutang", newHutang.jenis_hutang || "overtime");
  formData.append("is_potongan_persen", newHutang.is_potongan_persen ? "1" : "0"); 

  if (newHutang.is_potongan_persen) {
    formData.append("persentase_potongan", newHutang.persentase_potongan);
  } else {
    formData.append("potongan_per_minggu", newHutang.potongan_per_minggu);
  }

  if (newHutang.bukti_transfer) {
    formData.append("bukti_transfer", newHutang.bukti_transfer);
  }

  try {
    const response = await API.post("/hutang/tambah", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    alert(response.data.message);

    setHutangs([...hutangs, response.data.data]); // gunakan response.data.data
    setShowForm(false);

    setNewHutang({
      id_penjahit: "",
      jumlah_hutang: "",
      jenis_hutang: "overtime",
      potongan_per_minggu: "",
      is_potongan_persen: false,
      persentase_potongan: null,
      bukti_transfer: null,
    });
  } catch (error) {
    console.error("Error:", error.response?.data?.message || error.message);
    alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan data hutang.");
  }
};



  const handlePaymentSubmit = async (e) => {
    e.preventDefault(); // Mencegah refresh halaman

    // Membuat FormData untuk mengirimkan data bersama file
    const formData = new FormData();
    formData.append('perubahan_hutang', newHutang.jumlah_hutang);

    // Jika ada bukti transfer, tambahkan ke FormData
    if (newHutang.bukti_transfer) {
      formData.append('bukti_transfer', newHutang.bukti_transfer);
    }

    try {
      const response = await API.post(`/hutang/tambah/${selectedHutang.id_hutang}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data", // Pastikan menggunakan multipart untuk upload file
        },
      });

      alert(response.data.message); // Tampilkan pesan sukses

      // Perbarui daftar hutang dengan data baru
      const updatedHutangs = hutangs.map(hutang =>
        hutang.id_hutang === selectedHutang.id_hutang
          ? { ...hutang, jumlah_hutang: hutang.jumlah_hutang + parseFloat(newHutang.jumlah_hutang) }
          : hutang
      );

      setHutangs(updatedHutangs);
      setShowForm(false); // Tutup form modal

      // Reset form input
      setNewHutang({
        id_penjahit: "",
        jumlah_hutang: "",
        jenis_hutang: "",
        potongan_per_minggu: "",
        bukti_transfer: null, // Reset bukti transfer
      });

    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);

      // Tampilkan pesan error dari backend jika ada
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan data hutang.");
    }
  };



     // Handle klik bayar
  const handleTambahClick = (hutang) => {
    setSelectedHutang(hutang); // Set hutang yang dipilih untuk pembayaran
  };


  const fetchHistory = async (id_hutang, jenis_perubahan) => {
    try {
      console.log("Fetching history for hutang ID:", id_hutang, "with filter:", jenis_perubahan);
      
      const response = await API.get(`/history/${id_hutang}`, {
        params: { jenis_perubahan: jenis_perubahan || "" },
      });
  
      console.log("Response from API:", response.data);
      setLogHistory(response.data || []); // Harus tetap array kosong kalau tidak ada data
    } catch (error) {
      console.error("Error fetching history:", error.response?.data || error);
  
      if (error.response?.status === 404) {
        setLogHistory([]); // Jangan null, tetap kosongkan array
      }
    }
  };
  
  
  
  const handleDetailClick = (hutang) => {
    setSelectedDetailHutang(hutang); // Simpan data hutang yang dipilih
    fetchHistory(hutang.id_hutang, selectedJenisPerubahan); // Ambil log history sesuai filter
  };
  

  useEffect(() => {
    if (selectedDetailHutang) {
      fetchHistory(selectedDetailHutang.id_hutang, selectedJenisPerubahan);
    }
  }, [selectedDetailHutang, selectedJenisPerubahan]); // ✅ Tambahkan selectedDetailHutang
  


  const getFilteredPenjahit = async (selectedId, page = 1) => {
    try {
        const response = await API.get(`/hutang`, {
            params: { penjahit: selectedId, page: page }
        });

        console.log("Filtered Data:", response.data); // Debugging

        setHutangs(Array.isArray(response.data.data) ? response.data.data : []);
        setLastPage(response.data.last_page);
    } catch (error) {
        console.error("Error fetching data:", error);

        // Tampilkan pesan error jika ada respons dari backend
        const errorMessage = error.response?.data?.message || "Terjadi kesalahan saat mengambil data hutang.";
        alert(errorMessage);
    }
};

  
  

  const getStatusColor = (status_pembayaran) => {
    switch (status_pembayaran) {
      case "belum lunas":
        return "#DCA5A0"; // Kategori A: hijau
      case "dibayar sebagian":
        return "#EAC98D";  // Kategori B: biru
      case "lunas":
        return "#A0DCDC"; // Kategori C: oranye
      default:
        return "black";  // Default: hitam jika kategori tidak dikenali
    }
    
  };

  return (
    <div>
      <div className="penjahit-container">
        <h1>Daftar Hutang</h1>
      </div>
      <div className="table-container">
      <div className="filter-header1">
      <button 
        onClick={() => setShowForm(true)}>
          Tambah
        </button>
        <label htmlFor="penjahitFilter" className="filter-label"></label>
        <select
          id="penjahitFilter"
          className="filter-select1"
          onChange={(e) => getFilteredPenjahit(e.target.value)}
        >
          <option value="">All</option>
          {penjahitList.map((penjahit) => (
            <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
              {penjahit.nama_penjahit}
            </option>
          ))}
        </select>

      </div>
        <table className="penjahit-table">
          <thead>
            <tr>
              <th>NAMA PENJAHIT</th>
              <th>JUMLAH HUTANG</th>
              <th>POTONGAN PER MINGGU</th>
              <th>POTONGAN PER PERSENT</th>
              <th>STATUS PEMBAYARAN</th>
           
              <th>AKSI</th>
            </tr>
          </thead>
          <tbody>
          {hutangs
              .map((hutang) => (
                <tr key={hutang.id_hutang}>
                  <td data-label="Penjahit : ">
                    {
                      penjahitList.find(penjahit => penjahit.id_penjahit === hutang.id_penjahit)?.nama_penjahit || 'Tidak Diketahui'
                    }
                  </td>
                  <td data-label="Jumlah Hutang: ">
                    Rp.{new Intl.NumberFormat("id-ID").format(hutang.jumlah_hutang)}
                    </td>
                    <td data-label="Potongan: ">
                      Rp.{new Intl.NumberFormat("id-ID").format(hutang.potongan_per_minggu)}
                    </td>
                    <td data-label="POTONGAN PER PERSENT : ">
                      {hutang.persentase_potongan || 0}% 
                    </td>  

                  <td data-label=" ">
                    <span
                      style={{
                        backgroundColor: getStatusColor(hutang.status_pembayaran),
                        color: "white",
                        padding: "3px 5px",
                        borderRadius: "5px",
                        textTransform: "capitalize", 
                    }}
                    >
                    {hutang.status_pembayaran}
                    </span>
                  </td>
                      
                
                  
                  <td data-label=" ">
                  <div className="action-card">
                  <button 
                    className="btn1-icon"
                    onClick={() => handleTambahClick(hutang)}
                    >
                        <FaPlus className="icon" />
                        </button>
                  
                  <button 
                    className="btn1-icon" 
                     onClick={() => handleDetailClick(hutang)}
                     >
                     <FaInfoCircle className="icon" />
                     </button>
                  </div>
                </td>

                </tr>
              ))}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="pagination-container">
          <button 
            className="pagination-button" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ◀ Prev
          </button>

          <span className="pagination-info">Halaman {currentPage} dari {lastPage}</span>

          <button 
            className="pagination-button" 
            disabled={currentPage === lastPage} 
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next ▶
          </button>
        </div>
      </div>


      {showForm && (
  <div className="modal-hutang">
    <div className="modal-content-hutang">
      <h2>Tambah Data Hutang</h2>
      <form onSubmit={handleFormSubmit} className="form-hutang">
        
        {/* Pilih Penjahit */}
        <div className="form-group-hutang">
          <label>Penjahit:</label>
          <select
            value={newHutang.id_penjahit}
            onChange={(e) =>
              setNewHutang({ ...newHutang, id_penjahit: e.target.value })
            }
            required
          >
            <option value="" disabled>
              Pilih Penjahit
            </option>
            {penjahitList.map((penjahit) => (
              <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                {penjahit.nama_penjahit}
              </option>
            ))}
          </select>
        </div>

        {/* Jumlah Hutang */}
        <div className="form-group-hutang">
          <label>Jumlah Hutang</label>
          <input
            type="number"
            value={newHutang.jumlah_hutang}
            onChange={(e) =>
              setNewHutang({ 
                ...newHutang, 
                jumlah_hutang: e.target.value !== "" ? Number(e.target.value) : ""
              })
            }
            placeholder="Masukkan jumlah hutang"
            required
          />
        </div>

        {/* Jenis Hutang */}
        <div className="form-group-hutang">
          <input type="hidden" value="overtime" name="jenis_hutang" />
        </div>

        {/* Potongan Per Minggu */}
        {!newHutang.is_potongan_persen && (
          <div className="form-group-hutang">
            <label>Potongan Per Minggu</label>
            <input
              type="number"
              value={newHutang.potongan_per_minggu}
              onChange={(e) =>
                setNewHutang({ 
                  ...newHutang, 
                  potongan_per_minggu: e.target.value !== "" ? Number(e.target.value) : ""
                })
              }
              placeholder="Masukkan jumlah potongan tetap"
              required
            />
          </div>
        )}

        {/* Potongan Berdasarkan Persen */}
        <div className="form-group-hutang checkbox-group-hutang">
          <input
            type="checkbox"
            checked={newHutang.is_potongan_persen}
            onChange={(e) =>
              setNewHutang({
                ...newHutang,
                is_potongan_persen: e.target.checked,
                persentase_potongan: e.target.checked ? newHutang.persentase_potongan : null
              })
            }
          />
          <label>Potongan berdasarkan persen</label>
        </div>

        {/* Persentase Potongan */}
        {newHutang.is_potongan_persen && (
          <div className="form-group-hutang">
            <label>Persentase Potongan (%)</label>
            <input
              type="number"
              value={newHutang.persentase_potongan || ""}
              onChange={(e) =>
                setNewHutang({
                  ...newHutang,
                  persentase_potongan: e.target.value !== "" ? Number(e.target.value) : null,
                })
              }
              placeholder="Masukkan persentase potongan"
              required
            />
          </div>
        )}

        {/* Bukti Transfer */}
        <div className="form-group-hutang">
          <label>Upload Bukti Transfer (Opsional)</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) =>
              setNewHutang({
                ...newHutang,
                bukti_transfer: e.target.files[0],
              })
            }
          />
        </div>

        <div className="form-actions-hutang">
          <button type="submit" className="btn-hutang btn-submit-hutang">
            Simpan
          </button>
          <button
            type="button"
            className="btn-hutang btn-cancel-hutang"
            onClick={() => setShowForm(false)}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  </div>
)}



    {selectedDetailHutang && (
          <div className="modal">
            <div className="modal-card">
              <div className="modal-header">
                <h3>Detail Hutang</h3>
              
              </div>
              <div className="modal-body">
                <h4>ID Hutang: {selectedDetailHutang.id_hutang}</h4>
                <p><strong>ID Penjahit :</strong><span>  {selectedDetailHutang.id_penjahit}</span></p>
                <p><strong>Jumlah Hutang :</strong> <span> Rp {selectedDetailHutang.jumlah_hutang}</span></p>
                <p><strong>Status Pembayaran :</strong> <span> {selectedDetailHutang.status_pembayaran}</span></p>
                <p><strong>Tanggal Hutang:</strong><span>  {selectedDetailHutang.tanggal_hutang}</span></p>
                <p><strong>Sisa Hutang:</strong><span>  {selectedDetailHutang.sisa_hutang}</span></p>
                
                <br></br><h4>Log History:</h4>
              
                <select
                  id="filter"
                  value={selectedJenisPerubahan}
                  onChange={(e) => setSelectedJenisPerubahan(e.target.value)}
                >
                  <option value="">Semua</option>
                  <option value="penambahan">Penambahan</option>
                  <option value="pengurangan">Pengurangan</option>
                </select>

                {logHistory.length > 0 ? (
                  <div className="scrollable-table">
                  <table className="log-table">
                  <thead>
                    <tr>
                      <th>Tanggal Perubahan</th>
                      <th>Jenis Perubahan</th>
                      <th>Nominal</th>
                      <th>Bukti Transfer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logHistory.length > 0 ? (
                      logHistory.map((history, index) => (
                        <tr key={index}>
                          <td>{history.tanggal_perubahan}</td>
                          <td>{history.jenis_perubahan}</td>
                          <td>Rp {history.perubahan_hutang || 0}</td>
                          <td>
                      {history.bukti_transfer ? (
                        <a 
                          href={`${process.env.REACT_APP_FILE_URL}/storage/${history.bukti_transfer}`} 
                          rel="noopener noreferrer"
                        >
                          Lihat Bukti
                        </a>
                      ) : (
                        "Tidak ada"
                      )}
                    </td>

                                          </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" style={{ textAlign: "center" }}>Tidak ada log pembayaran.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
                
                ) : (
                  <p className="no-logs">Tidak ada log pembayaran.</p>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn-close" onClick={() => setSelectedDetailHutang(null)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal Form Pembayaran */}
      {selectedHutang && (
        <div className="modal">
          <div className="modal-content">
            <h2>Penambahan Hutang (ID: {selectedHutang.id_hutang})</h2>
            <form onSubmit={handlePaymentSubmit} className="modern-form">
            <div className="form-group">
              <label>Jumlah Tambah Hutang</label>
              <input
                type="number"
                value={newHutang.jumlah_hutang || ""}
                onChange={(e) =>
                  setNewHutang({ ...newHutang, jumlah_hutang: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Bukti Transfer</label>
              <input
                type="file"
                onChange={(e) =>
                  setNewHutang({ ...newHutang, bukti_transfer: e.target.files[0] })
                }
                accept="image/*, .pdf"
              />
            </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-submit">
                  Simpan Pembayaran
                </button>
                <button
                  type="button"
                  className="btn btn-submit"
                  onClick={() => setSelectedHutang(null)}
                >
                  Batal jika 
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
  

export default Hutang;
