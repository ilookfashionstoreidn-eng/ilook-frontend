import React, { useEffect, useState } from "react";
import "./Penjahit.css";
import API from "../../api"; 

const PembelianAksesoris = () => {
 const [loading, setLoading] = useState(true);
 const [error,setError] = useState(null);
 const [showForm, setShowForm] = useState(false);
 const [selectedPembelianAId, setSelectedPembelianAId] = useState(null);
const [showModal, setShowModal] = useState(false);
 const [searchTerm, setSearchTerm] = useState("");
 const [aksesorisList, setAksesorisList] = useState([]);
 const [jumlahTerverifikasi, setJumlahTerverifikasi] = useState("");
 const [newPembelian, setNewPembelian] = useState({
    aksesoris_id: "",
    jumlah: "",
    harga_satuan: "",
    tanggal_pembelian: "",
    bukti_pembelian: null,
  });
  const [pembelianA, setPembelianA] = useState({
  data: [],
  current_page: 1,
  last_page: 1,
});

  

const fetchPembelianA = async (page = 1) => {
  try {
    const response = await API.get(`pembelian-aksesoris-a?page=${page}`);
    setPembelianA(response.data);
  } catch (error) {
    setError(true);
  }
};

useEffect(() => {
  fetchPembelianA();
}, []);



const handleFormSubmit = async (e) => {
    e.preventDefault();
  
    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("User tidak ditemukan. Silakan login ulang.");
      return;
    }
    
  
    const formData = new FormData();
    formData.append("user_id", userId); 
    formData.append("aksesoris_id", newPembelian.aksesoris_id);
    formData.append("jumlah", newPembelian.jumlah);
    formData.append("harga_satuan", newPembelian.harga_satuan);
    formData.append("tanggal_pembelian", newPembelian.tanggal_pembelian);
  
    if (newPembelian.bukti_pembelian) {
      formData.append("bukti_pembelian", newPembelian.bukti_pembelian);
    }
  
    try {
      const response = await API.post("/pembelian-aksesoris-a", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      alert("Pembelian berhasil disimpan!");
     await fetchPembelianA();

      setShowForm(false);
      setNewPembelian({
        aksesoris_id: "",
        jumlah: "",
        harga_satuan: "",
        tanggal_pembelian: "",
        bukti_pembelian: null,
      });
  
    } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan pembelian.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPembelian((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleFileChange = (e) => {
    setNewPembelian((prev) => ({
      ...prev,
      bukti_pembelian: e.target.files[0],
    }));
  };

  

  useEffect(() => {
    const fetchAksesoris = async () => {
      try {
        const response = await API.get("/aksesoris");
        setAksesorisList(response.data);
      } catch (err) {
        console.error("Gagal mengambil data aksesoris:", err);
      }
    };
  
    fetchAksesoris();
  }, []);



  const handleVerifikasi = (pembelianA) => {
  setSelectedPembelianAId(pembelianA.id);
  setShowModal(true);
};

  
  const handleSubmitPembelianB = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem("userId");

    if (!userId) {
      alert("User tidak ditemukan. Silakan login ulang.");
      return;
    }
  
    const payload = {
      pembelian_a_id: selectedPembelianAId,
      user_id: userId,
      jumlah_terverifikasi: jumlahTerverifikasi,
    };
    console.log("Payload dikirim:", payload);

    try {
      await API.post("/pembelian-aksesoris-b", payload);
      alert("Verifikasi berhasil disimpan!");
      setShowModal(false);
      setJumlahTerverifikasi(""); // reset form
    } catch (error) {
      console.error("Gagal verifikasi:", error);
      alert("Gagal verifikasi, coba lagi.");
    }
  };

  const handleDownloadBarcode = async (id) => {
    try {
      const response = await API.get(`/barcode-download/${id}`, {
        responseType: "blob", // file binary
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `barcode_aksesoris_${id}.pdf`;
      link.click();
    } catch (error) {
      console.error("Terjadi kesalahan saat mengunduh barcode:", error);
      alert("Gagal mengunduh barcode. Silakan coba lagi.");
    }
  };

  const fetchPage = async (page) => {
  const response = await API.get(`pembelian-aksesoris-a?page=${page}`);
  setPembelianA(response.data);
};

  
return (
    <div>
       <div className="penjahit-container">
         <h1>Pembelian Aksesoris Petugas A</h1>
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
                  <th>Id </th>
                  <th>Aksesoris</th>
                  <th>Jumlah Pembelian</th>
                  <th>harga satuan</th>
                  <th>Total harga</th>
                  <th>tanggal pembelian</th>
                  <th>bukti pembelian</th>
                  <th>Status Verifikasi</th>
                  <th>Download barcode</th>
                
    
                </tr>
              </thead>
              <tbody>
                {(pembelianA?.data ?? []).map((pembelianA) => (
                  <tr key={pembelianA.id}>
                    <td data-label="Id  : ">{pembelianA.id}</td>
                    <td data-label="Id Aksesoris : ">
                      {pembelianA.aksesoris?.nama_aksesoris || "-"}
                    </td>

                    <td data-label="Jumlah Pembelian : ">{pembelianA.jumlah}</td>
                    <td data-label="Harga Satuan : ">
                    Rp {Number(pembelianA.harga_satuan).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                    </td>

                      <td data-label="Harga Satuan : ">
                    Rp {Number(pembelianA.total_harga).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                    </td>


                    <td data-label="Tanggal Pembelian : ">{pembelianA.tanggal_pembelian}</td>
                    <td data-label="Bukti Pembelian : ">
                      {pembelianA.bukti_pembelian ? (
                        <img
                            src={`${process.env.REACT_APP_API_URL.replace('/api', '')}/storage/${pembelianA.bukti_pembelian}`}
                            alt="Bukti Pembelian"
                            style={{ width: "80px", height: "47px", objectFit: "cover" }}
                        />

                      ) : (
                        "-"
                      )}
                    </td>
                   
                    <td data-label="Aksi : ">
                    {pembelianA.status_verifikasi === 'valid' ? (
                      <button   className="status-link selesai" disabled>
                        Sudah Diverifikasi
                      </button>
                    ) : (
                      <button   className="link-button green" onClick={() => handleVerifikasi(pembelianA)}>
                        Verifikasi
                      </button>
                    )}
                  </td>
                <td>
                  {pembelianA.pembelian_b_id ? (
                    pembelianA.barcode_downloaded === 1 ? (
                      <span style={{ color: '#4F4F4F' }}>Barcode Sudah Didownload</span>
                    ) : (
                      <button
                        onClick={() => handleDownloadBarcode(pembelianA.pembelian_b_id)}
                        className="download-button"
                        style={{ color: 'green', textDecoration: 'underline' }}
                      >
                        Download Barcode
                      </button>
                    )
                  ) : (
                    <span>Belum diverifikasi</span>
                  )}
                </td>



                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
                <button 
                    disabled={pembelianA.current_page === 1}
                    onClick={() => fetchPage(pembelianA.current_page - 1)}
                >
                    Prev
                </button>

                <span>Halaman {pembelianA.current_page} / {pembelianA.last_page}</span>

                <button 
                    disabled={pembelianA.current_page === pembelianA.last_page}
                    onClick={() => fetchPage(pembelianA.current_page + 1)}
                >
                    Next
                </button>
                </div>

            </div>
     </div>
     {showForm && (
  <div className="modal">
    <div className="modal-content">
      <h2>Tambah Pembelian Aksesoris</h2>
      <form onSubmit={handleFormSubmit} className="modern-form">
        {/* AKSESORIS ID (Dropdown dari list aksesoris) */}
        <div className="form-group">
          <label>Pilih Aksesoris:</label>
          <select
            name="aksesoris_id"
            value={newPembelian.aksesoris_id}
            onChange={handleInputChange}
            required
          >
            <option value="">-- Pilih Aksesoris --</option>
            {aksesorisList.map((aksesoris) => (
              <option key={aksesoris.id} value={aksesoris.id}>
                {aksesoris.nama_aksesoris}
              </option>
            ))}
          </select>
        </div>

        {/* JUMLAH */}
        <div className="form-group">
          <label>Jumlah:</label>
          <input
            type="number"
            name="jumlah"
            value={newPembelian.jumlah}
            onChange={handleInputChange}
            placeholder="Masukkan jumlah"
            required
          />
        </div>

        {/* HARGA SATUAN */}
        <div className="form-group">
          <label>Harga Satuan:</label>
          <input
            type="number"
            name="harga_satuan"
            value={newPembelian.harga_satuan}
            onChange={handleInputChange}
            placeholder="Contoh: 20000"
            required
          />
        </div>

        {/* TANGGAL PEMBELIAN */}
        <div className="form-group">
          <label>Tanggal Pembelian:</label>
          <input
            type="date"
            name="tanggal_pembelian"
            value={newPembelian.tanggal_pembelian}
            onChange={handleInputChange}
            required
          />
        </div>

        {/* BUKTI PEMBELIAN */}
        <div className="form-group">
          <label>Bukti Pembelian (Opsional):</label>
          <input
            type="file"
            name="bukti_pembelian"
            accept="image/*,application/pdf"
            onChange={(e) =>
              setNewPembelian({
                ...newPembelian,
                bukti_pembelian: e.target.files[0],
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



{showModal && (
   <div className="modal">
    <div className="modal-content">
    <form onSubmit={handleSubmitPembelianB} className="modern-form">
     
    <div className="form-group">
       <label>ID Pembelian A</label>
      <input type="text" value={selectedPembelianAId} readOnly />
   
      
      <label>Jumlah Terverifikasi</label>
      <input
        type="number"
        value={jumlahTerverifikasi}
        onChange={(e) => setJumlahTerverifikasi(e.target.value)}
        required
      />

      <div className="form-actions">
        <button type="submit" className="btn btn-submit">
          Verifikasi
        </button>
            <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                Batal
              </button>
        </div>
      </div>
    </form>
  </div>
  </div>
)}

 
        
 </div>   
   )
 }

export default PembelianAksesoris