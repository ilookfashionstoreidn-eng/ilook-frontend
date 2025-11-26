import React, { useEffect, useState } from "react";
import "./Penjahit.css";
import API from "../../api"; 

const PesananPetugasD = () => {
    const [petugasD, setPetugasD] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedPesanan, setSelectedPesanan] = useState(null);
    const [showForm, setShowForm]= useState(false);
    const [verifikasiList, setVerifikasiList] = useState([]);

    const [newData, setNewData] = useState({
      petugas_c_id: "",
      barcode: [], // array berisi string barcode
    });

    
    useEffect(() => {
        const fetchPetugasD = async () => {
            try {
                setLoading(true);
                const response = await API.get('/detail-pesanan-aksesoris');
                setPetugasD(response.data);
            }catch (error){
                setError("Gagal mengambil data");
            }finally{
                setLoading(false);
            }
        }
        fetchPetugasD();
    }, []);

    const handleOpenModal = (item) => {
        setSelectedPesanan(item);
        setShowModal(true);
      };
      
      const handleCloseModal = () => {
        setShowModal(false);
        setSelectedPesanan(null);
      };


      

           
return (
    <div>
    <div className="penjahit-container">
      <h1>Data Aksesoris</h1>
    </div>

    <div className="table-container">
    <div className="filter-header1">
          

       
        <div className="search-bar1">
          <input
            type="text"
            placeholder="Cari nama aksesoris..."
           
          />
        </div>
      </div>
      
        <div className="table-container">
        <table className="penjahit-table">
          <thead>
            <tr>
              <th>id Pesanan petugas c</th>
              <th>Petugas D </th>
              <th>Penjahit</th>
              <th>Petugas C</th>
              <th>Waktu</th>
             
            
        
          

            </tr>
          </thead>
          <tbody>
            {petugasD.map((petugasD) => (
              <tr key={petugasD.id}>
                <td data-label="ID: ">{petugasD.petugas_c_id}</td>
                <td data-label="User :">{petugasD.petugas_d_verif_user?.name || 'Tidak Diketahui'}</td>
                <td data-label="Penjahit :">{petugasD.penjahit?.nama_penjahit || 'Tidak Diketahui'}</td>
          
                <td data-label="User :">{petugasD.petugas_c_user?.name || 'Tidak Diketahui'}</td>
                <td data-label="Waktu:">
                  {new Date(petugasD.created_at).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  {new Date(petugasD.created_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
               
              </tr>
            ))}
          </tbody>
        </table>
        </div>
 </div>


   
   
 {/* Modal */}
 {showModal && selectedPesanan && (
       <div className="modal-pengiriman">
    <div className="modal-content-pengiriman">
         
            <h3>Detail Pesanan - ID #{selectedPesanan.id}</h3>
            <table>
              <thead>
                <tr>
                  <th>Aksesoris ID</th>
                  <th>Jumlah Dipesan</th>
                </tr>
              </thead>
              <tbody>
                {selectedPesanan.detail_pesanan.map((dp, i) => (
                  <tr key={i}>
                    <td>{dp.aksesoris.nama_aksesoris}</td>
                    <td>{dp.jumlah_dipesan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleCloseModal}>Tutup</button>
          </div>
     </div>
      )}

    </div>
  );
}

export default PesananPetugasD