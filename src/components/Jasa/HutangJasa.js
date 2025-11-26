import React, { useEffect, useState } from "react"
import "../Jahit/Penjahit.css";
import API from "../../api"; 
import { FaPlus, FaInfoCircle,  } from 'react-icons/fa';

const HutangJasa = () => {
  const [hutangs, setHutangs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [cuttingList, setCuttingList] = useState([]); 
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedHutang, setSelectedHutang] = useState(null); 
  const [selectedDetailHutang, setSelectedDetailHutang] = useState(null);
  const [selectedJenisPerubahan, setSelectedJenisPerubahan] = useState("");
  const [logHistory, setLogHistory] = useState([]);
  const [newHutang, setNewHutang] = useState({
    tukang_jasa_id: "",
    jumlah_hutang: "",
    potongan_per_minggu: "",
    is_potongan_persen: false,
    persentase_potongan: null,
    bukti_transfer: null,
  });

  useEffect(() => {
    const fetchHutangs= async () => {
      try {
        setLoading(true);
        const response = await API.get(`/hutang_jasa`, {
        });
  
        setHutangs(response.data.data);
       
      } catch (error) {
        setError(error.response?.data?.message || "Failed to fetch data");
        console.error("Error fetching Hutang:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchHutangs();
  }, []); 

  
  useEffect(() => {
  const fetchCutting = async () => {
    try {
      setLoading(true);
      const response = await API.get("/tukang-jasa"); 
      setCuttingList(response.data);
    } catch (error) {
      setError("Gagal mengambil data tukang cutting .");
    } finally {
      setLoading(false);
    }
  };

  fetchCutting();
}, []);


const fetchHistory = async (id, jenis_perubahan) => {
    try {
      console.log("Fetching history for hutang ID:", id, "with filter:", jenis_perubahan);
      
      const response = await API.get(`/history_jasa/${id}`, {
        params: { jenis_perubahan: jenis_perubahan || "" },
      });
  
      console.log("Response from API:", response.data);
      setLogHistory(response.data || []); 
    } catch (error) {
      console.error("Error fetching history:", error.response?.data || error);
  
      if (error.response?.status === 404) {
        setLogHistory([]); 
      }
    }
  };

const handleFormSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("tukang_jasa_id", newHutang.tukang_jasa_id);
  formData.append("jumlah_hutang", newHutang.jumlah_hutang);
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
    const response = await API.post("/hutang/tambah_jasa", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    alert(response.data.message);

    setHutangs([...hutangs, response.data.data]); // gunakan response.data.data
    setShowForm(false);

    setNewHutang({
      tukang_jasa_id: "",
      jumlah_hutang: "",
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
      const response = await API.post(`/hutang_jasa/tambah/${selectedHutang.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data", // Pastikan menggunakan multipart untuk upload file
        },
      });

      alert(response.data.message); 
      
      const updatedHutangs = hutangs.map(hutang =>
        hutang.id === selectedHutang.id
          ? { ...hutang, jumlah_hutang: hutang.jumlah_hutang + parseFloat(newHutang.jumlah_hutang) }
          : hutang
      );

      setHutangs(updatedHutangs);
      setShowForm(false); 

      
      setNewHutang({
        tukang_jasa_id: "",
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


  const handleTambahClick = (hutang) => {
    setSelectedHutang(hutang); // Set hutang yang dipilih untuk pembayaran
  };

   const handleDetailClick = (hutang) => {
    setSelectedDetailHutang(hutang); // Simpan data hutang yang dipilih
    fetchHistory(hutang.id, selectedJenisPerubahan); // Ambil log history sesuai filter
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
           <div className="search-bar1">
             <input
               type="text"
               placeholder="Cari nama aksesoris..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>

      
         </div>
        <table className="penjahit-table">
          <thead>
            <tr>
              <th>NAMA tukang cutting</th>
              <th>JUMLAH HUTANG</th>
              <th>POTONGAN PER MINGGU</th>
              <th>POTONGAN PER PERSENT</th>
              <th>STATUS PEMBAYARAN</th>
              <th>Aksi</th>
           
            </tr>
          </thead>
          <tbody>
          {hutangs
              .map((hutang) => (
                <tr key={hutang.id}>
                   
                  <td data-label="tukang cutting : ">{hutang.tukang_jasa?.nama}</td>
                  <td data-label="Jumlah Hutang: ">
                    Rp.{new Intl.NumberFormat("id-ID").format(hutang.jumlah_hutang)}
                  </td>
                  <td data-label="Potongan: ">
                      Rp.{new Intl.NumberFormat("id-ID").format(hutang.potongan_per_minggu)}
                  </td>
                  <td data-label="POTONGAN PER PERSENT : ">
                      {hutang.persentase_potongan || 0}%
                  </td>
                  <td data-label="id spk cutting : ">{hutang.status_pembayaran}</td>
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



 {showForm && (
        <div className="modal-hutang">
          <div className="modal-content-hutang">
            <h2>Tambah Data Hutang</h2>
            <form onSubmit={handleFormSubmit} className="form-hutang">
              
              {/* Pilih Penjahit */}
              <div className="form-group-hutang">
                <label>Penjahit:</label>
                <select
                  value={newHutang.tukang_jasa_id}
                  onChange={(e) =>
                    setNewHutang({ ...newHutang, tukang_jasa_id: e.target.value })
                  }
                  required
                >
                  <option value="" disabled>
                    Pilih Penjahit
                  </option>
                  {cuttingList.map((penjahit) => (
                    <option key={penjahit.id} value={penjahit.id}>
                      {penjahit.nama}
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


    {selectedHutang && (
        <div className="modal">
          <div className="modal-content">
            <h2>Penambahan Hutang (ID: {selectedHutang.id})</h2>
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
                <h4>ID Hutang: {selectedDetailHutang.id}</h4>
                <p><strong>ID Penjahit :</strong><span>  {selectedDetailHutang.tukang_jasa_id}</span></p>
                <p><strong>Jumlah Hutang :</strong> <span> Rp {selectedDetailHutang.jumlah_hutang}</span></p>
                <p><strong>Status Pembayaran :</strong> <span> {selectedDetailHutang.status_pembayaran}</span></p>
                <p><strong>Tanggal Hutang:</strong><span>  {selectedDetailHutang.tanggal_hutang}</span></p>
             
                
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

    </div>
</div>

  )
}

export default HutangJasa