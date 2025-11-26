import React, { useEffect, useState } from "react";
import { FaPlus,FaInfoCircle,} from 'react-icons/fa';
import "./Penjahit.css";
import API from "../../api"; 


const Cashbon = () => {
  const [cashbons, setCashbons] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [penjahitList, setPenjahitList] = useState([]);
  const [selectedCashbon, setSelectedCashbon] = useState(null); 
  const [error, setError] = useState("");
  const [selectedJenisPerubahan, setSelectedJenisPerubahan] = useState(""); 
  const [logHistory, setLogHistory] = useState([]); // Untuk menyimpan log pembayaran
  const [selectedDetailCashbon, setSelectedDetailCashbon] = useState(null); 
  const [newCashbon, setNewCashbon] = useState({
    id_penjahit: "",
    jumlah_cashboan: "",
    status_pembayaran: "",
    tanggal_jatuh_tempo: "",
    tanggal_cashboan: "",
     bukti_transfer: null,

  });


  const [logPembayaran, setLogPembayaran] = useState({
      jumlah_dibayar: "",
      tanggal_bayar: "",
      catatan: "",
    });
  
    

  
  useEffect(() => {
      const fetchCasbons = async () => {
        try {
          setLoading(true);

          const token = localStorage.getItem("token"); 
          if (!token) {
              setError("Token tidak ditemukan. Silakan login kembali.");
              setLoading(false);
              return;
          }

          const response = await API.get(`/cashboan?page=${currentPage}`,{
            headers: { Authorization: `Bearer ${token}` },
          });
    

          console.log("Data Cashbon:", response.data); // Debugging
  
          setCashbons(response.data.data || []); // Set data pendapatan
          setLastPage(response.data.last_page); // Set total halaman
        } catch (error) {
          setError(error.response?.data?.message || "Gagal mengambil data pendapatan.");
        } finally {
          setLoading(false);
        }
      };
    
      fetchCasbons();
    }, [currentPage]); // Perbaikan: sekarang data diperbarui saat currentPage berubah
    
  
  
  
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

  
    const fetchHistory = async (id_cashboan, jenis_perubahan = "") => {
      try {
        console.log("Fetching history for cashbon ID:", id_cashboan, "with filter:", jenis_perubahan);
        
        const response = await API.get(`cashboan/history/${id_cashboan}`, {
          params: jenis_perubahan ? { jenis_perubahan } : {}, // Hanya kirim params jika ada filter
        });
    
        console.log("Response from API:", response.data);
        setLogHistory(response.data || []); // Pastikan tetap array kosong kalau tidak ada data
      } catch (error) {
        console.error("Error fetching history:", error.response?.data || error);
    
        setLogHistory([]); // Tetap set array kosong jika error
      }
    };
    
  
  // Handle submit form
 const handleFormSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("id_penjahit", newCashbon.id_penjahit);
  formData.append("jumlah_cashboan", newCashbon.jumlah_cashboan);

  if (newCashbon.bukti_transfer) {
    formData.append("bukti_transfer", newCashbon.bukti_transfer);
  }

  try {
    const response = await API.post("/cashboan/tambah", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    alert(response.data.message);

    // Update list cashboan
    setCashbons([...cashbons, response.data.data]);
    setShowForm(false); // Tutup form modal

    // Reset form input
    setNewCashbon({
      id_penjahit: "",
      jumlah_cashboan: "",
      potongan_per_minggu: "",
      bukti_transfer: null,
    });
  } catch (error) {
    console.error("Error:", error.response?.data?.message || error.message);
    alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan cashboan.");
  }
};

      
const handlePaymentSubmit = async (e) => {
  e.preventDefault(); // Mencegah refresh halaman

  // Membuat FormData untuk mengirimkan data dan file
  const formData = new FormData();
  formData.append('perubahan_cashboan', newCashbon.jumlah_cashboan);

  // Jika ada bukti transfer, tambahkan ke FormData
  if (newCashbon.bukti_transfer) {
    formData.append('bukti_transfer', newCashbon.bukti_transfer);
  }

  try {
    const response = await API.post(`/cashboan/tambah/${selectedCashbon.id_cashboan}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data", // Wajib untuk FormData dengan file
      },
    });

    alert(response.data.message); // Tampilkan pesan sukses

    // Perbarui daftar cashbon
    const updatedCashbons = cashbons.map(cashbon =>
      cashbon.id_cashboan === selectedCashbon.id_cashboan
        ? {
            ...cashbon,
            jumlah_cashboan: cashbon.jumlah_cashboan + parseFloat(newCashbon.jumlah_cashboan),
          }
        : cashbon
    );

    setCashbons(updatedCashbons);
    setShowForm(false); // Tutup form modal

    // Reset form input
    setNewCashbon({
      id_penjahit: "",
      jumlah_cashboan: "",
      potongan_per_minggu: "",
      bukti_transfer: null,
    });

  } catch (error) {
    console.error("Error:", error.response?.data?.message || error.message);
    alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan data cashboan.");
  }
};


      
const handleDetailClick = (cashbon) => {
        setSelectedDetailCashbon(cashbon); // Simpan data hutang yang dipilih
        fetchHistory(cashbon.id_cashboan, selectedJenisPerubahan); // Ambil log history sesuai filter
      };
      
  
 useEffect(() => {
      if (selectedDetailCashbon) {
        fetchHistory(selectedDetailCashbon.id_cashboan, selectedJenisPerubahan);
      }
    }, [selectedDetailCashbon, selectedJenisPerubahan]); // ✅ Tambahkan selectedDetailHutang
    
  
const getFilteredPenjahit = async (selectedId, page = 1) => {
    try {
        const response = await API.get(`/cashboan`, {
            params: { penjahit: selectedId, page: page }
        });

        console.log("Filtered Data:", response.data); // Debugging

        setCashbons(Array.isArray(response.data.data) ? response.data.data : []);
        setLastPage(response.data.last_page);
    } catch (error) {
        console.error("Error fetching data:", error);

        // Tampilkan pesan error jika ada respons dari backend
        const errorMessage = error.response?.data?.message || "Terjadi kesalahan saat mengambil data hutang.";
        alert(errorMessage);
    }
};
  
 const formatTanggal = (tanggal) => {
    const date = new Date(tanggal);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
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

     // Handle klik bayar
     const handleTambahClick = (cashbon) => {
      setSelectedCashbon(cashbon); // Set hutang yang dipilih untuk pembayaran
    };
  

  
  return (
    <div>
      <div className="penjahit-container">
        <h1>Daftar Cashbon</h1>   
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
      <div className="table-container">
      <table className="penjahit-table">
        <thead>
          <tr>
            <th>ID </th>
            <th>Nama Penjahit</th>
            <th>JUMLAH CASHBON</th>
            <th>STATUS PEMBAYRAN</th>
            <th>AKSI</th>
          </tr>
        </thead>
        <tbody>
        {cashbons
              .filter((cashbon) =>
                cashbon.status_pembayaran.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((cashbon) => (
            <tr key={cashbon.id_cashboan}>
              <td data-label="Id Cashbon : ">{cashbon.id_cashboan}</td>
              <td data-label="Penjahit : ">
                    {
                      penjahitList.find(penjahit => penjahit.id_penjahit === cashbon.id_penjahit)?.nama_penjahit || 'Tidak Diketahui'
                    }
                  </td>
             
           
              <td data-label="Jumlah Hutang: ">
                    Rp.{new Intl.NumberFormat("id-ID").format(cashbon.jumlah_cashboan)}
                    </td>
              <td   data-label=" ">
                    <span
                      style={{
                        backgroundColor: getStatusColor(cashbon.status_pembayaran),
                        color: "white",
                        padding: "3px 5px",
                        borderRadius: "5px",
                        textTransform: "capitalize", 
                      
                    }}
                    >
                    {cashbon.status_pembayaran}
                    </span>
                  </td>
             
             
              <td  data-label=" ">
              <div className="action-card">
                  <button 
                    className="btn1-icon"
                    onClick={() =>handleTambahClick(cashbon)}
                    >
                         <FaPlus className="icon" />
                   </button>
                    <button 
                      className="btn1-icon"
                      onClick={() => handleDetailClick(cashbon)}
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
      
     
      {selectedDetailCashbon && (
  <div className="modal">
    <div className="modal-card">
      <div className="modal-header">
        <h3>Detail Cashbon</h3>
      </div>
      <div className="modal-body">
        <h4>ID Hutang: {selectedDetailCashbon.id_cashboan}</h4>
        <p><strong>ID Penjahit :</strong><span>  {selectedDetailCashbon.id_penjahit}</span></p>
        <p><strong>Jumlah Hutang :</strong> <span> Rp {selectedDetailCashbon.jumlah_hutang}</span></p>
        <p><strong>Status Pembayaran :</strong> <span> {selectedDetailCashbon.status_pembayaran}</span></p>
        <p><strong>Sisa Hutang:</strong><span>  {selectedDetailCashbon.sisa_cashboan}</span></p>
        
        <br></br><h4>Log History:</h4>

    
        {logHistory.length > 0 ? (
          <table className="log-table">
            <thead>
              <tr>
                <th>Tanggal Perubahan</th>
                <th>Jenis Perubahan</th>
                <th>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {logHistory.length > 0 ? (
                logHistory.map((history, index) => (
                  <tr key={index}>
                    <td>{history.tanggal_perubahan}</td>
                    <td>{history.jenis_perubahan}</td>
                    <td>Rp {history.perubahan_cashboan || 0}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center" }}>Tidak ada log pembayaran.</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <p className="no-logs">Tidak ada log pembayaran.</p>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn-close" onClick={() => setSelectedDetailCashbon(null)}>
          Tutup
        </button>
      </div>
    </div>
  </div>
)}


        {/* Modal Form */}
        {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Tambah Data Casbon</h2>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
              <label>ID Penjahit:</label>
                <select
                  value={newCashbon.id_penjahit}
                  onChange={(e) =>
                    setNewCashbon({ ...newCashbon, id_penjahit: e.target.value })
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

              <div className="form-group">
                <label>Jumlah Cashbon</label>
                <input
                  type="number"
                  value={newCashbon.jumlah_cashboan}
                  onChange={(e) =>
                    setNewCashbon({ ...newCashbon, jumlah_cashboan: e.target.value })
                  }
                  placeholder="Masukkan jumlah cashbon"
                  required
                />
              </div>

               <div className="form-group-hutang">
                <label>Upload Bukti Transfer (Opsional)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) =>
                    setNewCashbon({
                      ...newCashbon,
                      bukti_transfer: e.target.files[0],
                    })
                  }
                />
              </div>

           
             
              <div className="form-actions">
                <button type="submit" className="btn btn-submit">
                  Simpan
                </button>
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={() => setShowForm(false)}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
     {/* Modal Form Pembayaran */}
     {selectedCashbon && (
        <div className="modal">
          <div className="modal-content">
            <h2>Penambahan Cashboan (ID: {selectedCashbon.id_cashboan})</h2>
            <form onSubmit={handlePaymentSubmit} className="modern-form">
            <div className="form-group">
              <label>Jumlah Tambah Casbon</label>
              <input
                type="number"
                value={newCashbon.jumlah_cashboan || ""}
                onChange={(e) =>
                  setNewCashbon({ ...newCashbon, jumlah_cashboan: e.target.value })
                }
                required
              />
            </div>
             
             <div className="form-group">
              <label>Bukti Transfer</label>
              <input
                type="file"
                onChange={(e) =>
                  setNewCashbon({ ...newCashbon, bukti_transfer: e.target.files[0] })
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
                  onClick={() => setSelectedCashbon(null)}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Cashbon