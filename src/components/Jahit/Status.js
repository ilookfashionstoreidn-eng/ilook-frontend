import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaSave, FaTimes, FaRegEye, FaClock,FaInfoCircle,FaClipboard , FaList,FaMoneyBillWave  } from 'react-icons/fa';
import "./Penjahit.css";
import API from "../../api"; 

const Status = () => {
  const [logStatus, setLogStatus] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    const fetchLogStatus = async () => {
      try {
        setLoading(true);
        setError(""); // Reset error sebelum memulai request
  
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Token tidak ditemukan. Silakan login kembali.");
          setLoading(false);
          return;
        }
  
        const response = await API.get(`/log-status?page=${currentPage}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        console.log("Data Log Status:", response.data); // Debugging
  
        setLogStatus(response.data.data); // Simpan data dari response
        setLastPage(response.data.last_page); // Set total halaman
      } catch (error) {
        setError(error.response?.data?.message || "Gagal mengambil data.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchLogStatus();
  }, [currentPage]);
  
  const formatTanggal = (tanggal) => {
    const date = new Date(tanggal);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };
  const formatTanggalLengkap = (tanggal) => {
    const date = new Date(tanggal);
    
    // Ambil bagian tanggal
    const day = date.getDate();
    const month = date.toLocaleString("id-ID", { month: "long" });
    const year = date.getFullYear();
  
    // Ambil bagian waktu
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
  
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };
  // Filter data berdasarkan pencarian
  const filteredLog = logStatus.filter(
    (log) =>
      log.id_spk &&
      log.id_spk.toString().includes(searchTerm)
  );
  

  return (
    <div>
        <div className="penjahit-container">
          <h1>Log Status</h1>
        </div>
        <div className="table-container">
          <div className="filter-header">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Cari id spk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
        </div>
      <table className="penjahit-table">
        <thead>
          <tr>
            <th>ID Log</th>
            <th>ID SPK</th>
            <th>Status Lama</th>
            <th>Status Baru</th>
            <th>waktu perubahan</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {filteredLog.map((log) => (
            <tr key={log.id_status}>
              <td data-label="Id Log : ">{log.id_status}</td>
              <td data-label="Id Spk : ">{log.id_spk}</td>
              <td data-label="Status Sebelumnya : ">{log.status_lama}</td>
              <td data-label="Status Setelahnya : ">{log.status_baru}</td>
              <td data-label="Waktu Perubahan : ">{formatTanggalLengkap(log.tanggal_aktivitas)}</td>
              <td data-label="Keterangan : ">{log.keterangan}</td>
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
    </div>

      )
    }


export default Status