import React, { useEffect, useState } from "react"
import "../Jahit/Penjahit.css";
import API from "../../api"; 
import { FaPlus, FaInfoCircle,  } from 'react-icons/fa';

const PendapatanJasa = () => {
  const [pendapatans, setPendapatans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCutting, setSelectedCutting] = useState(null);
  const [kurangiHutang, setKurangiHutang] = useState(false);
  const [kurangiCashbon, setKurangiCashbon] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [buktiTransfer, setBuktiTransfer] = useState(null);
  
  const [simulasi, setSimulasi] = useState({
      total_pendapatan: 0,
      potongan_hutang: 0,
      potongan_cashbon: 0,
      total_transfer: 0,
    });
    ;
  
   const fetchSimulasi = async (tukang_jasa_id, kurangiHutang, kurangiCashbon) => {
  
    console.log('Memanggil fetchSimulasi', { tukang_jasa_id, kurangiHutang, kurangiCashbon });  try {
      const response = await API.post('/pendapatan/simulasi/jasa', {
        tukang_jasa_id,
        kurangi_hutang: kurangiHutang,
        kurangi_cashbon: kurangiCashbon,
      
      });
  
      if (response.data) {
        setSimulasi({
          total_pendapatan: response.data.total_pendapatan || 0,
          potongan_hutang: response.data.potongan_hutang || 0,
          potongan_cashbon: response.data.potongan_cashbon || 0,
          total_transfer: response.data.total_transfer || 0,
        });
      } else {
        console.warn('Data simulasi kosong:', response.data);
        setSimulasi({
          total_pendapatan: 0,
          potongan_hutang: 0,
          potongan_cashbon: 0,
        
          total_transfer: 0,
        });
      }
    } catch (err) {
      console.error('Gagal fetch simulasi pendapatan', err);
    }
  };

    useEffect(() => {
      if (selectedCutting) {
        fetchSimulasi(selectedCutting.tukang_jasa_id, kurangiHutang, kurangiCashbon);
      }
    }, [selectedCutting, kurangiHutang, kurangiCashbon]);
     
  useEffect(() => {
    const fetchPendapatans = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/pendapatan/mingguan/jasa`, {
        });
        setPendapatans(response.data); // Set data pendapatan
      } catch (error) {
        setError(error.response?.message || "Gagal mengambil data pendapatan.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchPendapatans();
  }, []); 
    
const handleOpenForm = (cutting) => {
  setSelectedCutting(cutting);
  setShowForm(true);
 
};

const handleTambahPendapatan = async (e) => {
  e.preventDefault();

  try {
    const formData = new FormData();
    formData.append('tukang_jasa_id', selectedCutting.tukang_jasa_id);
    formData.append('kurangi_hutang', kurangiHutang ? '1' : '0');
    formData.append('kurangi_cashbon', kurangiCashbon ? '1' : '0');

    if (buktiTransfer) {
      formData.append('bukti_transfer', buktiTransfer);
    }

  

    const response = await API.post('/pendapatan/jasa', formData, {
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
              
              <th>Nama Tukang Cutting</th>
              <th>Total Pendapatan</th>
            
               <th>Potongan Hutang</th>
                <th>Potongan Cashboan</th>
                  <th>Total Transfer </th>
              <th>Status Pembayaran Minggu Ini</th>       
          
          
           
            </tr>
          </thead>
          <tbody>
            {pendapatans
              .filter((pendapatan) =>
                pendapatan.tukang_jasa_id?.toString().toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((pendapatan) => (
                <tr key={pendapatan.tukang_jasa_id}>
                
                <td data-label="Id : ">{pendapatan.nama_tukang_jasa}</td>
                 
                  <td data-label="Total Pendapatan : ">
                  Rp.{new Intl.NumberFormat("id-ID").format(pendapatan.total_pendapatan)}
                    </td>
                 
                   <td data-label="Total Transfer: ">
                  Rp.{new Intl.NumberFormat("id-ID").format(pendapatan.potongan_hutang)}
                 </td>
                    <td data-label="Total Transfer: ">
                  Rp.{new Intl.NumberFormat("id-ID").format(pendapatan.potongan_cashbon)}
                 </td>
                  <td data-label="Total Transfer: ">
                  Rp.{new Intl.NumberFormat("id-ID").format(pendapatan.total_transfer)}
                 </td>

                <td  data-label=" ">
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
                  
                </tr>
              ))}
          </tbody>
        </table>
        </div>

 {showForm && (
  <div className="modal-hutang">
    <div className="modal-content-hutang">
      <h2>Tambah Data Pendapatan</h2>
      <form onSubmit={handleTambahPendapatan} className="form-hutang">
        <div className="form-group-hutang">
          <label>ID Penjahit:</label>
          <input
            type="text"
            value={selectedCutting?.tukang_jasa_id || ''}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Nama Penjahit:</label>
          <input
            type="text"
            value={selectedCutting?.nama_tukang_jasa || ''}
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
  )
}

export default PendapatanJasa