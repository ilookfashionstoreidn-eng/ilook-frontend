import React, { useEffect, useState } from "react";
import "../../Jahit/Penjahit.css";
import API from "../../../api"; 
import { FaPlus,FaInfoCircle,} from 'react-icons/fa';

const CashboanCutting = () => {
  const [cashbons, setCashbons] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [cuttingList, setCuttingList] = useState([]); 
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCashbon, setSelectedCashbon] = useState(null); 
  const [selectedJenisPerubahan, setSelectedJenisPerubahan] = useState(""); 
  const [logHistory, setLogHistory] = useState([]); // Untuk menyimpan log pembayaran
  const [selectedDetailCashbon, setSelectedDetailCashbon] = useState(null);
  const [newCashbon, setNewCashbon] = useState({
    tukang_cutting_id: "",
    jumlah_cashboan: "",
    tanggal_cashboan: "",
     bukti_transfer: null,

  });

   
  useEffect(() => {
    const fetchCashbons= async () => {
      try {
        setLoading(true);
        const response = await API.get(`/cashboan_cutting`, {
        });
  
        setCashbons(response.data.data);
       
      } catch (error) {
        setError(error.response?.data?.message || "Failed to fetch data");
        console.error("Error fetching Cashboans:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCashbons();
  }, []); 

  useEffect(() => {
  const fetchCutting = async () => {
    try {
      setLoading(true);
      const response = await API.get("/tukang_cutting"); 
      setCuttingList(response.data);
    } catch (error) {
      setError("Gagal mengambil data tukang cutting .");
    } finally {
      setLoading(false);
    }
  };

  fetchCutting();
}, []);

const handleFormSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("tukang_cutting_id", newCashbon.tukang_cutting_id);
  formData.append("jumlah_cashboan", newCashbon.jumlah_cashboan);

  if (newCashbon.bukti_transfer) {
    formData.append("bukti_transfer", newCashbon.bukti_transfer);
  }

  try {
    const response = await API.post("/cashboan/tambah_cutting", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    alert(response.data.message);

    // Update list cashboan
    setCashbons([...cashbons, response.data.data]);
    setShowForm(false); 

    // Reset form input
    setNewCashbon({
      tukang_cutting_id: "",
      jumlah_cashboan: "",
      bukti_transfer: null,
    });
  } catch (error) {
    console.error("Error:", error.response?.data?.message || error.message);
    alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan cashboan.");
  }
};


  const handleTambahClick = (cashbon) => {
      setSelectedCashbon(cashbon); // Set hutang yang dipilih untuk pembayaran
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
    const response = await API.post(`/cashboan_cutting/tambah/${selectedCashbon.id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data", // Wajib untuk FormData dengan file
      },
    });

    alert(response.data.message); // Tampilkan pesan sukses

    // Perbarui daftar cashbon
    const updatedCashbons = cashbons.map(cashbon =>
      cashbon.id === selectedCashbon.id
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

 const fetchHistory = async (id, jenis_perubahan = "") => {
      try {
        console.log("Fetching history for cashbon ID:", id, "with filter:", jenis_perubahan);
        
        const response = await API.get(`history_cashboan_cutting/${id}`, {
          params: jenis_perubahan ? { jenis_perubahan } : {}, // Hanya kirim params jika ada filter
        });
    
        console.log("Response from API:", response.data);
        setLogHistory(response.data || []); // Pastikan tetap array kosong kalau tidak ada data
      } catch (error) {
        console.error("Error fetching history:", error.response?.data || error);
    
        setLogHistory([]); // Tetap set array kosong jika error
      }
    };
    

const handleDetailClick = (cashbon) => {
        setSelectedDetailCashbon(cashbon); // Simpan data hutang yang dipilih
        fetchHistory(cashbon.id, selectedJenisPerubahan); // Ambil log history sesuai filter
      };
      
 useEffect(() => {
      if (selectedDetailCashbon) {
        fetchHistory(selectedDetailCashbon.id, selectedJenisPerubahan);
      }
    }, [selectedDetailCashbon, selectedJenisPerubahan]); 
    

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
         <div className="search-bar1">
             <input
               type="text"
               placeholder="Cari nama aksesoris..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        

      </div>
      <div className="table-container">
        <table className="penjahit-table">
          <thead>
            <tr>
              <th>NAMA tukang cutting</th>
              <th>JUMLAH HUTANG</th>
              <th>STATUS PEMBAYARAN</th>
              <th>Aksi</th>
           
            </tr>
          </thead>
          <tbody>
          {cashbons
              .map((c) => (
                <tr key={c.id}>
                  <td data-label="tukang cutting : ">{c.tukang_cutting?.nama_tukang_cutting}</td>
                  <td data-label="Jumlah Hutang: ">
                    Rp.{new Intl.NumberFormat("id-ID").format(c.jumlah_cashboan)}
                  </td>
                  <td data-label="id spk cutting : ">{c.status_pembayaran}</td>
                  <td  data-label=" ">
              
              <div className="action-card">
                  <button 
                    className="btn1-icon"
                    onClick={() =>handleTambahClick(c)}
                    >
                         <FaPlus className="icon" />
                   </button>
                    <button 
                      className="btn1-icon"
                      onClick={() => handleDetailClick(c)}
                     >
                      <FaInfoCircle className="icon" />
                      </button>
              </div>
              </td>
           
                </tr>
              ))}
             </tbody>
           </table>
        </div>

         {/* Modal Form */}
        {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Tambah Data Casbon</h2>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
              <label>ID Penjahit:</label>
                <select
                  value={newCashbon.tukang_cutting_id}
                  onChange={(e) =>
                    setNewCashbon({ ...newCashbon,tukang_cutting_id: e.target.value })
                  }
                  required
                >
                  <option value="" disabled>
                    Pilih Tukang Cutting
                  </option>
                  {cuttingList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama_tukang_cutting}
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

      {selectedCashbon && (
        <div className="modal">
          <div className="modal-content">
            <h2>Penambahan Cashboan (ID: {selectedCashbon.id})</h2>
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

      {selectedDetailCashbon && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Detail Cashbon</h3>
            </div>
            <div className="modal-body">
              <h4>ID Hutang: {selectedDetailCashbon.id}</h4>
              <p><strong>ID Penjahit :</strong><span>  {selectedDetailCashbon.tukang_cutting_id}</span></p>
              <p><strong>Jumlah Hutang :</strong> <span> Rp {selectedDetailCashbon.jumlah_cashboan}</span></p>
              <p><strong>Status Pembayaran :</strong> <span> {selectedDetailCashbon.status_pembayaran}</span></p>
          
              
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



    </div>
</div>
  )
}

export default CashboanCutting