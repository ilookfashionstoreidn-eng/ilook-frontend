import React, { useEffect, useState } from "react";
import "./Penjahit.css";
import API from "../../api"; 

const PembelianBAksesoris = () => {
    const [pembelianB, setPembelianB] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [aksesorisList, setAksesorisList] = useState([]);

useEffect(() => {
    const fetchPembelianB = async () => {
        try{
            setLoading(true);
            const response = await API.get("pembelian-aksesoris-b");
            setPembelianB(response.data);
        }catch (error){
            setError(false);
        }
    };
    fetchPembelianB();
}, []);

const handleDownloadBarcode = async (id) => {
  try {
    const response = await API.get(`/barcode-download/${id}`, {
      responseType: 'blob', // Mendapatkan response berupa binary (PDF)
    });
    
    // Membuat file dari response dan men-trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `barcode_aksesoris_${id}.pdf`;
    link.click();
  } catch (error) {
    console.error("Terjadi kesalahan saat mengunduh barcode:", error);
  }
};

return (
    <div>
       <div className="penjahit-container">
         <h1>Pembelian Aksesoris Petugas B</h1>
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
      
                  <th>Id Pembelian A</th>
                  <th>User</th>
                  <th>Nama Aksesoris</th>
                  <th>Jumlah Verifikasi</th>
                  <th>Status Verifikasi</th>
                  <th>Waktu Verifikasi</th>
                  <th>Actions</th>
               
    
                </tr>
              </thead>
              <tbody>
                {pembelianB.map((pembelianB) => (
                  <tr key={pembelianB.id}>
                  
                    <td data-label="Nama Aksesoris : ">{pembelianB.pembelian_a_id}</td>
                    <td data-label="User : ">{pembelianB.user?.name || 'Tidak Diketahui'}</td>
                   
                    <td data-label="Nama Aksesoris : ">
                    {pembelianB.pembelian_a?.aksesoris?.nama_aksesoris || '-'}
                    </td>

                    <td data-label="Jumlah Pembelian : ">{pembelianB.jumlah_terverifikasi}</td>
                    <td data-label="Harga Satuan : " style={{ color: pembelianB.status_verifikasi === 'valid' ? 'green' : 'red' }}>
                      {pembelianB.status_verifikasi}
                    </td>
                    <td data-label="Tanggal Pembelian : ">
                    {new Date(pembelianB.created_at).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    {new Date(pembelianB.created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  <td>
                {!pembelianB.barcode_downloaded && (
                  <button
                    onClick={() => handleDownloadBarcode(pembelianB.id)}
                    className="download-button"
                    style={{ color: 'green', textDecoration: 'underline' }} // Garis bawah dan warna hijau
                  >
                    Download Barcode
                  </button>
                )}
                {pembelianB.barcode_downloaded === 1 && (
                  <span style={{ color: '#4F4F4F' }}>Barcode Sudah Didownload</span>
                )}
              </td>

                  </tr>
                ))}
              </tbody>
            </table>
            </div>
     </div>
    

 
        
 </div>   
   )
 }
export default PembelianBAksesoris