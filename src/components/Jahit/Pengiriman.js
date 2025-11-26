import React, { useEffect, useState } from "react";
import "./Pengiriman.css";
import API from "../../api"; 
import { FaPlus, FaTrash,FaMoneyBillWave, FaSave, FaTimes, FaRegEye, FaEdit, FaClock,FaInfoCircle,FaClipboard , FaList,  } from 'react-icons/fa';

const Pengiriman = () => {
    const [pengirimans, setPengirimans] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedPengiriman, setSelectedPengiriman] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [selectedPenjahit, setSelectedPenjahit] = useState("");
    const [sortBy, setSortBy] = useState("created_at"); 
    const [sortOrder, setSortOrder] = useState("desc");
    const [penjahitList, setPenjahitList] = useState([]); 
    const [produkList, setProdukList] = useState([]);
    const [selectedNamaProduk, setSelectedNamaProduk] = useState("");
    const [selectedStatusVerifikasi, setSelectedStatusVerifikasi] = useState("");
    const [warnaData, setWarnaData] = useState([]);
    const [showPetugasAtasPopup, setShowPetugasAtasPopup] = useState(false);
    
    const [newPengiriman, setNewPengiriman] = useState({
        tanggal_pengiriman: "",
        total_barang_dikirim: "",
        sisa_barang: "",
        total_bayar: "",
        warna: [] // Inisialisasi warna dengan array kosong
    });

    const userRole = localStorage.getItem("role");
    console.log("User Role dari localStorage:", userRole);

    useEffect(() => {
    const fetchPengirimans = async () => {
        try {
            setLoading(true);

            console.log("Selected Penjahit:", selectedPenjahit); // Debugging
            console.log("sortBy:", sortBy);
            console.log("sortOrder:", sortOrder);

            const response = await API.get(`/pengiriman`, {
                params: { 
                  page: currentPage,
                  id_penjahit:selectedPenjahit,
                  sortBy: sortBy,   
                  sortOrder: sortOrder,
                  nama_produk:selectedNamaProduk,
                  status_verifikasi: selectedStatusVerifikasi
                }, 
                  
              });
            
              console.log("Data Pengiriman:", response.data); // Debugging
  
              setPengirimans(response.data.data);
              setLastPage(response.data.last_page);
            } catch (error) {
              setError(error.response?.data?.message || "Failed to fetch data");
              console.error("Error fetching SPK:", error);
            } finally {
              setLoading(false);
            }
          };
        
          fetchPengirimans();
 }, [currentPage, selectedPenjahit, sortBy, sortOrder,selectedNamaProduk ,selectedStatusVerifikasi]); 
     
 
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
  
  

useEffect(() => {
    const fetchProdukList = async () => {
        try {
            const response = await API.get("/produk");
            console.log("Produk List:", response.data); // Debugging
            setProdukList(response.data.data); 
        } catch (error) {
            console.error("Error fetching produk list:", error);
        }
    };
    fetchProdukList();
}, []);


useEffect(() => {
    if (selectedPengiriman) {
        fetchWarnaBySpk(selectedPengiriman.id_spk);
    }
}, [selectedPengiriman]);

const fetchWarnaBySpk = async (id_spk) => {
    try {
        const response = await API.get(`/spk-cmt/${id_spk}/warna`);
        
        console.log("API Response:", response.data); // Debugging

        // Pastikan data berbentuk array sebelum diproses
        if (!Array.isArray(response.data.warna)) {
            console.error("Expected an array but got:", response.data.warna);
            return;
        }

        setWarnaData(response.data.warna.map(warna => ({
            warna: warna.nama_warna,
            jumlah_dikirim: 0
        })));
    } catch (error) {
        console.error("Error fetching warna:", error);
    }
};


     // Filter data berdasarkan pencarian
     const filteredPengirimans = Array.isArray(pengirimans) 
     ? pengirimans
         .filter((pengiriman) =>
             pengiriman.id_spk.toString().includes(searchTerm.toLowerCase())
         )
         .sort((a, b) => 
             sortOrder === "asc" 
                 ? new Date(a.created_at) - new Date(b.created_at)  // Terlama dulu
                 : new Date(b.created_at) - new Date(a.created_at)  // Terbaru dulu
         )
     : [];
 
    
     const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append("id_spk", newPengiriman.id_spk);
        formData.append("tanggal_pengiriman", newPengiriman.tanggal_pengiriman);
        formData.append("total_barang_dikirim", newPengiriman.total_barang_dikirim);
        
        if (newPengiriman.foto_nota) {
            formData.append("foto_nota", newPengiriman.foto_nota);
        }
    
        try {
            const response = await API.post("/pengiriman/petugas-bawah", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setPengirimans([...pengirimans, response.data.data]); // Tambah ke list
            setShowForm(false); // Tutup modal
    
            // Reset form
            setNewPengiriman({
                id_spk: "",
                tanggal_pengiriman: "",
                total_barang_dikirim: "",
                foto_nota: null,
            });
    
        } catch (error) {
            console.error("Error adding data:", error);
            alert(error.response?.data?.error || "Terjadi kesalahan saat menambahkan pengiriman.");
        }
    };
    
    const handleQtyChange = (index, value) => {
        const newWarnaData = [...warnaData];
        newWarnaData[index].jumlah_dikirim = value;
        setWarnaData(newWarnaData);
    };
    

    const handleInputChange = (e) => {
        setNewPengiriman({
            ...newPengiriman,
            [e.target.name]: e.target.value,
        });
    };
    

    const formatTanggal = (tanggal) => {
        const date = new Date(tanggal);
        return new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(date);
      };

      const handleDetailClick = (pengiriman) => {
        setSelectedPengiriman(pengiriman); // Simpan detail SPK yang dipilih
        setShowPopup(true);  // Tampilkan pop-up
        setShowPetugasAtasPopup(false);
      };
      const closePopup = () => {
        setShowPopup(false); // Sembunyikan pop-up
        setSelectedPengiriman(null); 
      
      };

      const handlePetugasAtas = (pengiriman) => {
        setSelectedPengiriman(pengiriman); // Set pengiriman yang dipilijh
        setShowPetugasAtasPopup(true);  // Buka modal petugas atas
        setShowPopup(false); 
      };

      const handlePetugasAtasSubmit = async (e) => {
        e.preventDefault();
    
        try {
            const response = await API.put(`/pengiriman/petugas-atas/${selectedPengiriman.id_pengiriman}`, {
                _method: "PUT",
                warna: warnaData,
            });
    
            alert("Data berhasil diperbarui!");
    
            setPengirimans(pengirimans.map(item =>
                item.id_pengiriman === selectedPengiriman.id_pengiriman ? { ...item, ...response.data.data } : item
            ));
    
            setSelectedPengiriman(null); // Tutup modal setelah submit
        } catch (error) {
            console.error("Error updating data:", error);
            alert("Gagal memperbarui data pengiriman.");
        }
    };
    
    
    
    
    return (
        <div>
            <div className="penjahit-container">
        <h1>Daftar Pengiriman</h1>
      </div>
            <div className="table-container">
            <div className="filter-header1">
            {userRole && userRole === "staff_bawah" && (
    <button onClick={() => setShowForm(true)}>
        Tambah
    </button>
)}

                <div className="search-bar1">
                <input
                    type="text"
                    placeholder="Cari id spk..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                <label htmlFor="statusFilter" className="filter-label"></label>
                <select 
                    value={selectedPenjahit} 
                    onChange={(e) => setSelectedPenjahit(e.target.value)}
                    className="filter-select1"
                    >
                    <option value="">All CMT</option>
                    {penjahitList.map((penjahit) => (
                        <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                            {penjahit.nama_penjahit}
                        </option>
                ))}
                 </select>
                 <label htmlFor="statusFilter" className="filter-label"></label>
                
                 <label htmlFor="produkFilter" className="filter-label"></label>
                <select
                    value={selectedNamaProduk}
                    onChange={(e) => setSelectedNamaProduk(e.target.value)}
                    className="filter-select1"
                >
                    <option value="">Semua Produk</option>
                    {produkList.map((produk) => (
                        <option key={produk.nama_produk} value={produk.nama_produk}>
                            {produk.nama_produk}
                        </option>
                    ))}
                </select>
                
                <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value)}
                className="filter-select1"
                >
                    <option value="asc">Terlama</option>
                    <option value="desc">Terbaru</option>
                </select>
                
                <select 
                value={selectedStatusVerifikasi} 
                onChange={(e) => setSelectedStatusVerifikasi(e.target.value)}
                className="filter-select1"
                >
                    <option value="pending">Pending</option>
                    <option value="invalid">Invalid</option>
                    <option value="valid">Valid</option>
                </select>
            </div>
            
            <div className="table-wrapper">
                <table className="penjahit-table">
                    <thead>
                        <tr>
                           
                            <th>ID SPK</th>
                            <th>NAMA CMT</th>
                            <th>NAMA PRODUK</th>
                            <th>Tanggal Pengiriman</th>
                            <th>Total Barang Dikirim</th>
                            <th>Sisa Barang</th>
                            <th>Status Verfikasi</th>
                            <th>AKSI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPengirimans.map((pengiriman) => (
                            <tr key={pengiriman.id_pengiriman}>
                                
                                <td data-label="ID SPK : ">{pengiriman.id_spk}</td>
                                <td data-label="Penjahit : ">
                                {pengiriman.nama_penjahit} {pengiriman.id_penjahit}
                            </td>

                                <td data-label="Penjahit : ">{pengiriman.nama_produk}</td>
                                <td data-label="Tanggal Kirim : ">{formatTanggal(pengiriman.tanggal_pengiriman)}</td>
                                
                             
                                <td data-label="Total Kirim : ">
                                {userRole === "staff_bawah" || pengiriman.status_verifikasi === "valid"
                                    ? pengiriman.total_barang_dikirim
                                    : "-"}
                            </td>

                            <td data-label="Sisa Barang" style={{ color: pengiriman.sisa_barang > 0 ? "red" : "black" }}>
                                {userRole === "staff_bawah" || pengiriman.status_verifikasi === "valid"
                                    ? pengiriman.sisa_barang
                                    : "-"}
                            </td>


                            <td data-label="Status Verifikasi:">
                            <span style={{ color: pengiriman.status_verifikasi === 'valid' ? 'green' : 'red' }}>
                                {pengiriman.status_verifikasi}
                            </span>
                            </td>


                                <td data-label=" ">
                                    <div className="action-card">
                                        <button className="btn1-icon" onClick={() => handleDetailClick(pengiriman)}>
                                            <FaInfoCircle className="icon" />
                                        </button>
                                        {userRole !== "staff_bawah" && (
                                                <button className="btn1-icon" onClick={() => handlePetugasAtas(pengiriman)}>
                                                    <FaMoneyBillWave className="icon" />
                                                </button>
                                            )}
                             </div>
                                </td> 
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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

 {/* Pop-Up Card */}
 {showPopup && selectedPengiriman && (
  <div className="popup-overlay">
      <div className="popup-card">
      <div className="popup-header">
        <h2>Detail Pengiriman</h2>
        <button className="btn-close" onClick={closePopup}>
          &times;
        </button>
      </div>
            <div className="popup-content">
            {selectedPengiriman ? (
                <div className="popup-details">
                    <table>
                        <thead>
                            <tr>
                                
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span>ID SPK:</span></td>
                                <td>{selectedPengiriman.id_spk}</td>
                            </tr>
                            <tr>
                                <td><span>Tanggal Pengiriman:</span></td>
                                <td>{selectedPengiriman.tanggal_pengiriman}</td>
                            </tr>
                            <tr>
                                <td><span>Total Barang:</span></td>
                                <td>{selectedPengiriman.total_barang_dikirim}</td>
                            </tr>
                            <tr>
                                <td><span>Sisa Barang:</span></td>
                                <td>{selectedPengiriman.sisa_barang}</td>
                            </tr>
                            <tr>
                                <td><span>Total Bayar:</span></td>
                                <td>{selectedPengiriman.total_bayar}</td>
                            </tr>
                            <tr>
                                <td><span>Detail warna dikirim:</span></td>
                                <td>{selectedPengiriman.warna.map((warnaDetail) => (
                                        <div key={warnaDetail.id_pengiriman_warna}>
                                            {warnaDetail.warna}: {warnaDetail.jumlah_dikirim} pcs
                                        </div>
                                    ))}</td>
                            </tr>
                            <tr>
                                <td><span>Detail sisa warna:</span></td>
                                <td>{selectedPengiriman.warna.map((warnaDetail) => (
                                        <div key={warnaDetail.id_pengiriman_warna}>
                                            {warnaDetail.warna}: {warnaDetail.sisa_barang_per_warna} pcs
                                        </div>
                                    ))}</td>
                            </tr>
                            <tr>
                                <td><span>Total Claim:</span></td>
                                <td>{selectedPengiriman.claim}</td>
                            </tr>
                            <tr>
                                <td><span>Total Refund Claim:</span></td>
                                <td>{selectedPengiriman.refund_claim}</td>
                            </tr>
                        </tbody>
                    </table>

                    
                </div>
            ) : (
                <p>Loading...</p> // Menampilkan loading atau pesan saat data belum ada
            )}
        </div>
        </div>
</div>
)}




         {/* Modal Form */}
{showForm && (
    <div className="modal">
        <div className="modal-content">
            <h2>Tambah Data Pengiriman</h2>
            <form onSubmit={handleFormSubmit} className="modern-form">
                {/* Input ID SPK */}
                <div className="form-group">
                    <label>ID SPK</label>
                    <input
                        type="number"
                        name="id_spk"
                        value={newPengiriman.id_spk || ""}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                
                {/* Input Tanggal Pengiriman */}
                <div className="form-group">
                    <label>Tanggal Kirim</label>
                    <input
                        type="date"
                        name="tanggal_pengiriman"
                        value={newPengiriman.tanggal_pengiriman}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                {/* Input Total Barang */}
                <div className="form-group">
                    <label>Total Barang</label>
                    <input
                        type="number"
                        name="total_barang_dikirim"
                        value={newPengiriman.total_barang_dikirim}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                {/* Upload Nota (Upload File) */}
                <div className="form-group">
                    <label>Upload Nota</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            setNewPengiriman({ ...newPengiriman, foto_nota: e.target.files[0] })
                        }
                    />
                </div>

                {/* Aksi */}
                <div className="form-actions">
                    <button type="submit" className="btn btn-submit">Simpan</button>
                    <button type="button" className="btn btn-cancel" onClick={() => setShowForm(false)}>Batal</button>
                </div>
            </form>
        </div>
    </div>
)}



      {/* Modal Form Petugas Atas */}
{ showPetugasAtasPopup && selectedPengiriman && (
    <div className="modal">
        <div className="modal-content">
            <h2>Pengiriman (ID: {selectedPengiriman.id_pengiriman})</h2>
            <form onSubmit={handlePetugasAtasSubmit} className="modern-form">
                {warnaData.map((item, index) => (
                    <div className="form-group" key={index}>
                        <label>Warna: {item.warna}</label>
                        <input
                            type="number"
                            value={item.jumlah_dikirim}
                            onChange={(e) => handleQtyChange(index, parseInt(e.target.value))}
                            min="0"
                        />
                    </div>
                ))}
                <div className="form-actions">
                    <button type="submit" className="btn btn-submit">
                        Simpan 
                    </button>
                    <button
                        type="button"
                        className="btn btn-submit"
                        onClick={() => setSelectedPengiriman(null)}
                    >
                        Batal
                    </button>
                </div>
            </form>
        </div>
    </div>
)}


        </div>
    );
};

export default Pengiriman;
