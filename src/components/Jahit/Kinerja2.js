import React, { useEffect, useState } from "react";
import { FaInfoCircle,  FaTasks, FaChartLine } from 'react-icons/fa';
import "./Penjahit.css";
import { useLocation, useNavigate  } from "react-router-dom";
import API from "../../api"; 


const KemampuanCmt = () => {
    const [kemampuanCmt, setKemampuanCmt] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPenjahit, setSelectedPenjahit] = useState(null);
    const [kemampuanDetails, setKemampuanDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalData, setModalData] = useState([]); // Untuk menyimpan data modal
    const [modalType, setModalType] = useState(""); 
    const [showModal, setShowModal] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const location = useLocation();
    const navigate = useNavigate();
    
    const searchParams = new URLSearchParams(location.search);
    const filterKategori = searchParams.get("filter");  
    const filterKinerja = searchParams.get("kinerja");

    const [selectedKategori, setSelectedKategori] = useState(filterKategori || ""); 
    const [selectedKinerja, setSelectedKinerja] = useState(filterKinerja || "");  

    const fetchKemampuanCmt = async () => {
        try {
            setLoading(true);
    
            const response = await API.get(`/kemampuan-cmt`, {
                params: { 
                    kategori_sisa_produk: selectedKategori,
                    kategori: selectedKinerja,
                    start_date: startDate,
                    end_date: endDate
                },
            });
    
            setKemampuanCmt(response.data || {});
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchKemampuanCmt();
    }, [selectedKategori, selectedKinerja]);
    
    

    const filteredData = Object.keys(kemampuanCmt).filter((nama) =>
        nama.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDetailClick = (nama, data) => {
        setSelectedPenjahit(nama);
        setModalData(data.kemampuan_per_minggu);
        setModalType("kemampuan"); // Tandai modal ini untuk kemampuan per minggu
        setShowModal(true);
    };
    
    const handleDetailSpk = (nama, data) => {
        setSelectedPenjahit(nama);
        setModalData(data.spks);
        setModalType("spks"); // Tandai modal ini untuk daftar SPK
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedPenjahit(null);
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

      const handleFilterChange = (e) => {
        const value = e.target.value;
        setSelectedKategori(value);
    
        if (value) {
            navigate(`?filter=${value}`); // Update URL dengan filter yang dipilih
        } else {
            navigate(location.pathname); // Hapus filter di URL
        }
    };  
    const handleKinerjaChange = (e) => {
        const value = e.target.value;
        setSelectedKinerja(value);
    
        if (value) {
            navigate(`?filter=${selectedKategori}&kinerja=${value}`); // Update URL dengan kedua filter
        } else {
            navigate(`?filter=${selectedKategori}`); // Hapus filter kinerja jika kosong
        }
    };
    

    return (
        <div>
           <div className="penjahit-container">
             <h1>Kemampuan CMT</h1>
            </div>
            <div className="table-container">
            <div className="filter-container">
  <div className="filter-group">
    <select value={selectedKategori} onChange={handleFilterChange} className="filter-select">
      <option value="">Kategori (All)</option>
      <option value="Overload">Overload</option>
      <option value="Underload">Underload</option>
      <option value="Normal">Normal</option>
    </select>

    <select value={selectedKinerja} onChange={handleKinerjaChange} className="filter-select">
      <option value="">Kinerja (All)</option>
      <option value="A">Kategori A</option>
      <option value="B">Kategori B</option>
      <option value="C">Kategori C</option>
      <option value="D">Kategori D</option>
    </select>
  </div>

  <div className="date-group">
    <div className="date-field">
      <label>Start Date</label>
      <input 
        type="date" 
        value={startDate} 
        onChange={(e) => setStartDate(e.target.value)} 
        className="date-input"
      />
    </div>

    <div className="date-field">
      <label>End Date</label>
      <input 
        type="date" 
        value={endDate} 
        onChange={(e) => setEndDate(e.target.value)} 
        className="date-input"
      />
    </div>

    <button 
      onClick={() => fetchKemampuanCmt()} 
      className="btn-apply-filter"
    >
      Apply Filter
    </button>
  </div>
</div>

                <table className="penjahit-table">
                    <thead>
                        <tr>
                            <th>Nama CMT</th>
                            <th>Rata-rata /Minggu</th>
                            <th>Produk Belum dikirim</th>
                            <th>Total SPK</th>
                            <th>kategori sisa produk</th>
                            <th>Kategori</th>
                            <th>Aksi</th>
                          
                          
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((namaPenjahit) => {
                            const data = kemampuanCmt[namaPenjahit];
                            return (
                                <tr key={namaPenjahit}>
                                    <td>{namaPenjahit}</td>     
                                    <td>{data.rata_rata_perminggu}</td>
                                    <td>{data.total_sisa_produk}</td>
                                    <td>{data.total_spk}</td>
                                    <td className={
                                        data.kategori_sisa_produk === "Overload" ? "text-red" :
                                        data.kategori_sisa_produk === "Underload" ? "text-yellow" :
                                        "text-green"
                                    }>
                                        {data.kategori_sisa_produk}
                                    </td>
                                    <td>{data.kategori}</td>
                            
                                  
                                    <td>
                                    <div className="action-card">
                                        <button 
                                            className="btn1-icon" 
                                            onClick={() => handleDetailClick(namaPenjahit, data)}>
                                            <FaChartLine className="icon" />
                                        </button>
                                     
                                        <button 
                                            className="btn1-icon" 
                                            onClick={() => handleDetailSpk(namaPenjahit, data)}>
                                            <FaTasks className="icon" />
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
            <h3>Detail {modalType === "kemampuan" ? "Kemampuan Per Minggu" : "SPKs"} - {selectedPenjahit}</h3>
            
            {modalType === "kemampuan" ? (
                <table>
                    <thead>
                        <tr>
                            <th>Minggu</th>
                            <th>ID SPK</th>
                            <th>Total Barang Dikirim</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modalData.map((item, index) => 
                            item.data.map((subItem, subIndex) => (
                                <tr key={`${index}-${subIndex}`}>
                                    <td>{item.minggu}</td>
                                    <td>{subItem.id_spk}</td>
                                    <td>{subItem.total_barang_dikirim}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>ID SPK</th>
                            <th>Total Barang Dikirim</th>
                            <th>Waktu Pengerjaan (hari)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modalData.map((spk, index) => (
                            <tr key={index}>
                                <td>{spk.id_spk}</td>
                                <td>{spk.total_barang_dikirim}</td>
                                <td>{spk.waktu_pengerjaan_terakhir}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <button onClick={() => setShowModal(false)}>Tutup</button>
        </div>
    </div>
)}

        </div>
       
       
    );
};

export default KemampuanCmt;