import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaSave, FaTimes, FaRegEye, FaClock,FaInfoCircle,FaClipboard , FaList,FaMoneyBillWave  } from 'react-icons/fa';
import "./Penjahit.css";
import axios from "axios";
import API from "../../api"; 

const Pendapatan = () => {
  const [pendapatans, setPendapatans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedPendapatan, setSelectedPendapatan] = useState(null);
  const [detailPengiriman, setDetailPengiriman] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [penjahitList, setPenjahitList] = useState([]);
  const [selectedPenjahit, setSelectedPenjahit] = useState(null);
  const [kurangiHutang, setKurangiHutang] = useState(false);
  const [kurangiCashbon, setKurangiCashbon] = useState(false);
  const [aksesorisDipilih, setAksesorisDipilih] = useState([]);
  const [detailAksesoris, setDetailAksesoris] = useState([]); // buat nampung semua aksesoris
 const [buktiTransfer, setBuktiTransfer] = useState(null);

  const [newPendapatan, setNewPendapatan] = useState({
    id_pendapatan:"",
    id_penjahit: "",
    periode_awal: "",
    periode_akhir: "",
    handtag: "",
    transportasi: "",
    total_pendapatan: 0,
    total_claim: 0,
    total_refund_claim: 0,
    total_cashbon: 0,
    total_hutang: 0,
    total_transfer: 0,
    bukti_transfer: null,

  });


  const [simulasi, setSimulasi] = useState({
    total_pendapatan: 0,
    potongan_hutang: 0,
    potongan_cashbon: 0,
    total_transfer: 0,
  });
  ;
  
  const fetchSimulasi = async (id_penjahit, kurangiHutang, kurangiCashbon, aksesorisIds = []) => {
    try {
      const response = await API.post('/simulasi-pendapatan', {
        id_penjahit,
        kurangi_hutang: kurangiHutang,
        kurangi_cashbon: kurangiCashbon,
        detail_aksesoris_ids: aksesorisIds, // kirim array id
      });
  
      if (response.data) {
        setSimulasi({
          total_pendapatan: response.data.total_pendapatan || 0,
          potongan_hutang: response.data.potongan_hutang || 0,
          potongan_cashbon: response.data.potongan_cashbon || 0,
          potongan_aksesoris: response.data.potongan_aksesoris || 0,
          total_transfer: response.data.total_transfer || 0,
        });
      } else {
        console.warn('Data simulasi kosong:', response.data);
        setSimulasi({
          total_pendapatan: 0,
          potongan_hutang: 0,
          potongan_cashbon: 0,
          potongan_aksesoris: 0,
          total_transfer: 0,
        });
      }
    } catch (err) {
      console.error('Gagal fetch simulasi pendapatan', err);
    }
  };
  
  
  // Di event handler (misal di onChange checkbox)
  useEffect(() => {
    if (selectedPenjahit) {
      fetchSimulasi(selectedPenjahit.id_penjahit, kurangiHutang, kurangiCashbon,  aksesorisDipilih);
    }
  }, [selectedPenjahit, aksesorisDipilih, kurangiHutang, kurangiCashbon]);
  
  const fetchDetailAksesoris = async (penjahitId) => {
    try {
      const response = await API.get(`/detail-pesanan-aksesoris?penjahit_id=${penjahitId}`);
      setDetailAksesoris(response.data);
    } catch (error) {
      console.error("Gagal mengambil aksesoris:", error);
    }
  };
  

  
  
  useEffect(() => {
    const fetchPendapatans = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Token tidak ditemukan. Silakan login kembali.");
          setLoading(false);
          return;
        }
  
        const response = await API.get(`/pendapatan/mingguan?page=${currentPage}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        console.log("Data Pendapatan:", response.data); // Debugging
  
        setPendapatans(response.data || []); // Set data pendapatan
        setLastPage(response.last_page); // Set total halaman
      } catch (error) {
        setError(error.response?.message || "Gagal mengambil data pendapatan.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchPendapatans();
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
  
  
  const handleTambahPendapatan = async (e) => {
  e.preventDefault();

  try {
    const formData = new FormData();
    formData.append('id_penjahit', selectedPenjahit.id_penjahit);
    formData.append('kurangi_hutang', kurangiHutang ? '1' : '0');
    formData.append('kurangi_cashbon', kurangiCashbon ? '1' : '0');

    if (buktiTransfer) {
      formData.append('bukti_transfer', buktiTransfer);
    }

    if (aksesorisDipilih.length > 0) {
      aksesorisDipilih.forEach((id, index) => {
        formData.append(`detail_aksesoris_ids[${index}]`, id);
      });
    }

    const response = await API.post('/bayar-pendapatan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      alert('Pendapatan berhasil ditambahkan!');
      setShowForm(false);
    } else {
      alert(`Gagal: ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error saat tambah pendapatan:', error);
    if (error.response?.data?.message) {
      alert(`Error: ${error.response.data.message}`);
    } else {
      alert('Terjadi kesalahan saat menambahkan pendapatan.');
    }
  }
};


 

  const handleDetailClick = async (pendapatan) => {
    setSelectedPendapatan(pendapatan);
    setLoading(true);
    setError("");
  
    try {
      // Panggil API untuk mendapatkan detail pengiriman
      const response = await API.get(`/pendapatan/${pendapatan.id_pendapatan}/pengiriman`);
      setDetailPengiriman(response.data.pengiriman || []); // Simpan detail pengiriman ke state
    } catch (error) {
      console.error("Error fetching detail pengiriman:", error);
      setError(error.response?.data?.message || "Gagal memuat detail pengiriman.");
    } finally {
      setLoading(false);
    }
  };
  
  

  
  const closeModal = () => {
    setSelectedPendapatan(null);
    setDetailPengiriman([]);
  };

  const getFilteredPenjahit = async (selectedId, page = 1) => {
    try {
        const response = await API.get(`/pendapatan`, {
            params: { penjahit: selectedId, page: page }
        });

        console.log("Filtered Data:", response.data); // Debugging

        setPendapatans(Array.isArray(response.data.data) ? response.data.data : []);
        setLastPage(response.data.last_page);
    } catch (error) {
        console.error("Error fetching data:", error);

        // Tampilkan pesan error jika ada respons dari backend
        const errorMessage = error.response?.data?.message || "Terjadi kesalahan saat mengambil data hutang.";
        alert(errorMessage);
    }
};
const handleDownload = async (idPendapatan) => {
  try {
    const response = await API.get(`/pendapatan/${idPendapatan}/download-nota`, {
      responseType: "blob", // Pastikan menerima file sebagai blob
    });

    // Buat URL blob dari response data
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", `nota_pendapatan_${idPendapatan}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    // Hapus URL blob setelah selesai
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error downloading file:", error);
    alert(error.response?.data?.message || "Gagal mengunduh nota.");
  }
};
  
const handleOpenForm = (penjahit) => {
  setSelectedPenjahit(penjahit);
  setShowForm(true);
  fetchDetailAksesoris(penjahit.id_penjahit);
};

  
  return (
    <div>
      <div className="penjahit-container">
        <h1>Daftar Pendapatan</h1>
       
      </div>

      <div className="table-container">
      <div className="filter-header1">
     

        </div>
      <div className="table-container">
      <table className="penjahit-table">
          <thead>
            <tr>
              
              <th>Nama Penjahit</th>
              <th>Total Pendapatan</th>
              <th>Total Transfer </th>
              <th>Status Pembayaran Minggu Ini</th>
              <th>Aksi</th>
           
            </tr>
          </thead>
          <tbody>
            {pendapatans
              .filter((pendapatan) =>
                pendapatan.id_penjahit?.toString().toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((pendapatan) => (
                <tr key={pendapatan.id_penjahit}>
                
                   <td data-label="Penjahit : ">
                    {
                      penjahitList.find(penjahit => penjahit.id_penjahit === pendapatan.id_penjahit)?.nama_penjahit || 'Tidak Diketahui'
                    }
                  </td>
                 
                  <td data-label="Total Pendapatan : ">
                  Rp.{new Intl.NumberFormat("id-ID").format(pendapatan.total_pendapatan)}
                    </td>
                  <td data-label="Total Transfer: ">
                  Rp.{new Intl.NumberFormat("id-ID").format(pendapatan.total_transfer)}
                 </td>
                  <td data-label=" ">
                    <div className="action-card">
                      {pendapatan.status_pembayaran === 'belum dibayar' ? (
                        <button onClick={() => handleOpenForm(pendapatan)} className="btn-bayar">
                         Belum Bayar
                        </button>
                      ) : (
                        <span className="btn-bayar2">Sudah dibayar</span>
                      )}
                    </div>
                  </td>

                  <td  data-label=" ">
                    <div className="action-card">
                    <button 
                      className="btn1-icon" 
                      onClick={() => handleDetailClick(pendapatan)}
                      >
                      <FaInfoCircle className="icon" />
                     </button>   
                     <button
                      onClick={() => handleDownload(pendapatan.id_pendapatan)}
                      className="btn1-icon3" 
                      >
                            <FaSave className="icon" />

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


      {/* Section untuk detail pengiriman */}
 {/* Modal Section */}
 {selectedPendapatan && (
       <div
       className={`modal-pendapatan ${selectedPendapatan ? "show" : ""}`}
       onClick={closeModal}
     >
       <div
         className="modal-pendapatan-content"
         onClick={(e) => e.stopPropagation()} // Mencegah modal menutup jika area konten di-klik
       >
         <button className="modal-pendapatan-close" onClick={closeModal}>
           &times;
         </button>
         <h2>Detail Pendapatan  {selectedPendapatan.id_pendapatan}</h2>
         
        <p><strong>Total Claim :</strong> <span>Rp {selectedPendapatan.total_claim}</span></p>
        <p><strong>Total Refund Claim :</strong> <span>Rp {selectedPendapatan.total_refund_claim}</span></p>
        <p><strong>Total Cashbon :</strong> <span>Rp {selectedPendapatan.total_cashbon}</span></p>
        <p><strong>Total Hutang :</strong> <span>Rp {selectedPendapatan.total_hutang}</span></p>
        <p><strong>Handtag :</strong> <span>Rp. {selectedPendapatan.handtag}</span></p>
        <p><strong>Transportasi :</strong> <span>Rp. {selectedPendapatan.transportasi}</span></p>
        <br></br>
        <h2
>Detail Pengiriman untuk Pendapatan ID: {selectedPendapatan.id_pendapatan}</h2>
         
         {loading && <p>Memuat detail...</p>}
         {error && <p className="error">{error}</p>}
         {!loading && !error && (
           <table className="penjahit-table">
             <thead>
               <tr>
                 <th>ID Pengiriman</th>
                 <th>Tanggal Pengiriman</th>
                 <th>Total Pengiriman</th>
                 <th>Gaji </th>
                 <th>Claim</th>
                 <th>Refund Claim</th>
               </tr>
             </thead>
             <tbody>
               {detailPengiriman.map((pengiriman) => (
                 <tr key={pengiriman.id_pengiriman}>
                   <td data-label="ID Kirim">{pengiriman.id_pengiriman}</td>
                   <td data-label="tanggal Kirim">{pengiriman.tanggal_pengiriman}</td>
                   <td data-label="Total Kirim">{pengiriman.total_barang_dikirim}</td>
                   <td data-label="Gaji">{pengiriman.total_bayar}</td>
                   <td data-label="Claim">{pengiriman.claim}</td>
                   <td data-label="Refund Claim">{pengiriman.refund_claim}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         )}
       </div>
     </div>

      )}


{showForm && (
  <div className="modal-hutang">
    <div className="modal-content-hutang">
      <h2>Tambah Data Pendapatan</h2>
      <form onSubmit={handleTambahPendapatan} className="form-hutang">
        <div className="form-group-hutang">
          <label>ID Penjahit:</label>
          <input
            type="text"
            value={selectedPenjahit?.id_penjahit || ''}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Nama Penjahit:</label>
          <input
            type="text"
            value={selectedPenjahit?.nama_penjahit || ''}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Total Pendapatan:</label>
          <input
            type="text"
            value={simulasi.total_pendapatan || 0}
            readOnly
          />
        </div>

      

        {/* Menampilkan hasil simulasi */}
        <div className="form-group">
          <label>Potongan Hutang:</label>
          <input
            type="text"
            value={simulasi.potongan_hutang || 0}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Potongan Cashbon:</label>
          <input
            type="text"
            value={simulasi.potongan_cashbon || 0}
            readOnly
          />
        </div>
        <div className="form-group-hutang checkbox-group-hutang">
          <label>
            <input
              type="checkbox"
              checked={kurangiHutang}
              onChange={(e) => setKurangiHutang(e.target.checked)}
            />
            Potong Hutang
          </label>
        </div>

        <div className="form-group-hutang checkbox-group-hutang">
          <label>
            <input
              type="checkbox"
              checked={kurangiCashbon}
              onChange={(e) => setKurangiCashbon(e.target.checked)}
            />
            Potong Cashbon
          </label>
        </div>

        {/* Checklist Aksesoris */}
        <div className="form-group-hutang checkbox-group-hutang">
          <label>Potong Aksesoris:</label>
          {detailAksesoris.length > 0 ? (
            detailAksesoris.map((item) => (
              <div key={item.id} className="checkbox-item">
                <label>
                  <input 
                    type="checkbox" 
                    value={item.id} 
                    checked={aksesorisDipilih.includes(item.id)}
                    onChange={(e) => {
                      const id = parseInt(e.target.value);
                      if (e.target.checked) {
                        setAksesorisDipilih([...aksesorisDipilih, id]);
                      } else {
                        setAksesorisDipilih(aksesorisDipilih.filter((itemId) => itemId !== id));
                      }
                    }}
                  />
                  {item.aksesoris.nama_aksesoris} - Rp{parseInt(item.total_harga).toLocaleString()}
                </label>
              </div>
            ))
          ) : (
            <p style={{ fontStyle: 'italic' }}>Tidak ada aksesoris untuk dipotong.</p>
          )}
        </div>

        <div className="form-group">
          <strong>Total Transfer:</strong>
          <input
            type="text"
            value={simulasi.total_transfer || 0}
            readOnly
          />
        </div>
        
        <div className="form-group">
          <label>Upload Bukti Transfer:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBuktiTransfer(e.target.files[0])}
          />
        </div>


        <div className="form-actions-hutang">
          <button type="submit"  className="btn-hutang btn-submit-hutang">Simpan</button>
          <button type="button"    className="btn-hutang btn-cancel-hutang" onClick={() => setShowForm(false)}>
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

export default Pendapatan;
