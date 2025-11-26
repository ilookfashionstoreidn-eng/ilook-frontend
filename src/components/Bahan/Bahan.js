import React, { useEffect, useState } from "react"
import "../Jahit/Penjahit.css";
import API from "../../api"; 
import {FaInfoCircle,FaFileExcel, FaCalendarAlt } from 'react-icons/fa';


const Bahan = () => {
  const [bahans, setBahans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() =>{
    const fetchBahans = async() => {
        try {
            setLoading(true);
            const response = await API.get("/pembelian-bahan");
            setBahans(response.data);
        } catch (error) {
            setError("Gagal mengambil data penjahit.");
        } finally {
            setLoading(false);
        }
    };

    fetchBahans();
  }, []);


  return (
   <div>
     <div className="penjahit-container">
      <h1>Data Bahan</h1>
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
            placeholder="Cari nama penjahit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          </div>
          
      </div>
      
        <div className="table-container">
        <table className="penjahit-table">
          <thead>
            <tr>
              
              <th>keterangan</th>
              <th>gudang</th>
              <th>pabrik</th>
              <th>tanggal kirim</th>
              <th>gramasi</th>
         
            
            
            </tr>
          </thead>
          <tbody>
            {bahans.map((tc) => (
              <tr key={tc.id}>
                <td data-label="Nama Penjahit : ">{tc.keterangan}</td>
                <td data-label="Kontak : ">{tc.gudang_id}</td>
                <td data-label="Bank : ">{tc.pabrik_id}</td>
                <td data-label="No rekening : ">{tc.tanggal_kirim}</td>
                <td data-label="alamat : ">{tc.gramasi}</td>
              
              </tr>
            ))}
          </tbody>
        </table>
        </div>



   
        </div>
</div>
  );
};

export default Bahan