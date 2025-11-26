import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaSave, FaTimes, FaRegEye, FaClock,FaInfoCircle,FaClipboard , FaList,FaMoneyBillWave  } from 'react-icons/fa';
import "./Penjahit.css";
import { useParams } from "react-router-dom"


const Kinerja = () => {
    const [kinerjaCmt, setKinerjaCmt] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedKinerja, setSelectedKinerja] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [kinerjaDetails, setKinerjaDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); 
    const { kategori } = useParams(); // Ambil parameter dari URL

    useEffect(() => {
      const fetchkinerjaCmt = async () => {
          try {
              setLoading(true);
  
              const token = localStorage.getItem("token"); 
              if (!token) {
                  setError("Token tidak ditemukan. Silakan login kembali.");
                  setLoading(false);
                  return;
              }
  
              const response = await fetch("http://localhost:8000/api/kinerja-cmt",
                {
                  method: "GET",
                  headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}` 
                  }
              });
  
              if (!response.ok) {
                  throw new Error("Failed to fetch data");
              }
              const data = await response.json();
              setKinerjaCmt(data);
          } catch (error) {
              setError(error.message);
          } finally {
              setLoading(false);
          }
      };
  
      fetchkinerjaCmt();
  }, []);
  
    useEffect(() => {
        fetch("http://localhost:8000/api/kinerja-cmt")
          .then((response) => response.json())
          .then((data) => {
            console.log("Data fetched:", data); // Debugging
            setKinerjaCmt(data); // Simpan respons API langsung
          })
          .catch((error) => console.error("Error fetching data:", error));
      }, []);
    
      // Filter nama penjahit berdasarkan searchTerm
      const filteredData = Object.keys(kinerjaCmt).filter((nama) =>
        nama.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const handleDetailClick = (nama, data) => {
        setSelectedKinerja(nama); // Simpan detail SPK yang dipilih
        setKinerjaDetails(data.spks);
        setShowModal(true); // Tampilkan modal
      };
    
      const closeModal = () => {
        setShowModal(false); // Sembunyikan modal
        setSelectedKinerja(null); // Reset data SPK
      };
      const getKategoriColor = (kategori) => {
        switch (kategori) {
          case "A":
            return "#A0DCDC"; // Kategori A: hijau
          case "B":
            return "#EAC98D";  // Kategori B: biru
          case "C":
            return "#E4B255"; // Kategori C: oranye
          case "D":
            return "#ED9292";    // Kategori D: merah
          default:
            return "black";  // Default: hitam jika kategori tidak dikenali
        }
        
      };
      
  return (
    <div>
        <div className="penjahit-container">
          <h1>Kinerja Cmt</h1>
        </div>
        <div className="table-container">
          <div className="filter-header">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Cari nama penjahit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
        </div>
        <table className="penjahit-table">
          <thead>
            <tr>
              <th>Nama CMT</th>
              <th>Nilai Kinerja</th>
              <th>Total SPK</th>
             
              <th>Kategori KINERJA</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((namaPenjahit) => {
              const data = kinerjaCmt[namaPenjahit];
              return (
                <tr key={namaPenjahit}>
                  <td data-label="Nama Penjahit : ">{namaPenjahit}</td>
                  <td data-label="Nilai Kinerja">{data.rata_rata}%</td>
                  <td data-label="Total Spk : ">{data.total_spk}</td>
                  <td data-label="Kategori Kinerja : ">
                  <span
                    style={{
                        backgroundColor: getKategoriColor(data.kategori),
                        color: "white",
                        padding: "3px 6px",
                        borderRadius: "5px",
                        fontWeight: "bold",
                       
                    }}
                    >
                    {data.kategori}
                    </span>
                    </td>
                  

                  <td data-label="  ">
                <div className="action-card">
                <button 
                  key={namaPenjahit} 
                  className="btn1-icon" 
                  onClick={() => handleDetailClick(namaPenjahit , kinerjaCmt[namaPenjahit])} // Kirim nama & data dengan benar
                >
                  <FaInfoCircle className="icon" />
                  </button>
                  </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      {showModal && (
      <div className="modal-pengiriman">
        <div className="modal-content-pengiriman">
          <h3>Detail SPK: {selectedKinerja}</h3>
          <table>
            <thead>
              <tr>
                <th>ID Spk</th>
                <th>Total barang dikirim</th>
                <th>Waktu pengerjaan</th>
                <th>Kinerja</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {kinerjaDetails.map((detail) => (
                <tr key={detail.id_spk}>
                  <td>{detail.id_spk}</td>
                  <td>{detail.total_barang_dikirim}</td>
                  <td>{detail.waktu_pengerjaan_terakhir}</td>
                  <td>{detail.kinerja}</td>
                  <td>{detail.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={closeModal}>Tutup</button>
        </div>
      </div>
    )}


      
   
    </div>
  );
};

export default Kinerja;