import React, { useEffect, useState } from "react"
import "../../Jahit/Penjahit.css";
import "../../Jahit/SpkCmt.css";
import API from "../../../api"; 
import { FaPlus, FaSearch } from 'react-icons/fa';

const TukangCutting = () => {
  const [tukangCutting, setTukangCutting] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const [newTukangCutting, setNewTukangCutting] = useState({
    nama_tukang_cutting: "",
    kontak: "",
    bank:"",
    no_rekening: "",
    alamat: "",
  });

   useEffect(() => {
    const fetchTukangCutting = async () => {
      try {
        setLoading(true);
        const response = await API.get("/tukang_cutting"); 
        setTukangCutting(response.data);
      } catch (error) {
        setError("Gagal mengambil data penjahit.");
      } finally {
        setLoading(false);
      }
    };

    fetchTukangCutting();
  }, []);

  
const handleFormSubmit = async (e) => {
  e.preventDefault(); // Mencegah refresh halaman

  // Buat FormData untuk mengirim data dengan file
  const formData = new FormData();
  formData.append("nama_tukang_cutting", newTukangCutting.nama_tukang_cutting); 
  formData.append("kontak", newTukangCutting.kontak || "");
  formData.append("bank", newTukangCutting.bank || "");
  formData.append("no_rekening", newTukangCutting.no_rekening || "");
  formData.append("alamat", newTukangCutting.alamat || "");

  
 
  try {
      const response = await API.post("/tukang_cutting", formData, {
          headers: {
              "Content-Type": "multipart/form-data",
          },
      });

      console.log("Response API:", response);
      console.log("Response Data:", response.data); // Debugging

      alert("Tukang Cutting berhasil ditambahkan!");

      // Tambahkan produk baru ke state
      setTukangCutting((prevTukangCutting) => [...prevTukangCutting, response.data.data]); 

      setShowForm(false); // Tutup modal

      // Reset form input
      setNewTukangCutting({
         nama_tukang_cutting: "", 
         kontak: "",
         bank: "",
         no_rekening: "",
         alamat: "", 
        
      });

  } catch (error) {
      console.error("Error:", error.response?.data?.message || error.message);

      alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan tukang cutting.");
  }
};


const filteredTukangCutting = tukangCutting.filter((item) =>
    item.nama_tukang_cutting.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleInputChange = (e) => {
  const { name, value } = e.target;
  setNewTukangCutting((prev) => ({
    ...prev,
    [name]: value,
  }));
};


  
  return (
   <div className="spkcmt-container">
     <div className="spkcmt-header">
      <h1>✂️ Data Tukang Cutting</h1>
    </div>

    <div className="spkcmt-filters">
        <button 
          className="spkcmt-btn-primary"
          onClick={() => setShowForm(true)}
        >
          <FaPlus /> Tambah Tukang Cutting
        </button>
        <div className="spkcmt-search">
          <FaSearch className="spkcmt-search-icon" />
          <input
            type="text"
            placeholder="Cari nama tukang cutting..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
    </div>
      
    <div className="spkcmt-table-container">
        <table className="spkcmt-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama Tukang Cutting</th>
              <th>Kontak</th>
              <th>Bank</th>
              <th>No Rekening</th>
              <th>Alamat</th>
            </tr>
          </thead>
          <tbody>
            {filteredTukangCutting.map((tc) => (
              <tr key={tc.id}>
                <td>{tc.id}</td>
                <td><strong>{tc.nama_tukang_cutting}</strong></td>
                <td>{tc.kontak}</td>
                <td>{tc.bank}</td>
                <td>{tc.no_rekening}</td>
                <td>{tc.alamat}</td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>


    {/* Modal Form */}
        {showForm && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Tambah Tukang Cutting</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
                <label>Nama Tukang:</label>
                <input
                  type="text"
                  name="nama_tukang_cutting"
                  value={newTukangCutting.nama_tukang_cutting}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama tukang cutting"
                  required
                />
              </div>
              <div className="form-group">
                <label>Kontak:</label>
                <input
                  type="number"
                  name="kontak"
                  value={newTukangCutting.kontak}
                  onChange={handleInputChange}
                  placeholder="Masukkan no hp"
                  required
                />
              </div>

              <div className="form-group">
                <label>Bank:</label>
                <input
                  type="text"
                  name="bank"
                  value={newTukangCutting.bank}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama bank"
                  required
                />
              </div>

              <div className="form-group">
                <label>Nomor Rekening:</label>
                <input
                  type="number"
                  name="no_rekening"
                  value={newTukangCutting.no_rekening}
                  onChange={handleInputChange}
                  placeholder="Masukkan No rekening"
                  required
                />
              </div>

              <div className="form-group">
                <label>Alamat:</label>
                <textarea
                  name="alamat"
                  value={newTukangCutting.alamat}
                  onChange={handleInputChange}
                  placeholder="Masukkan Alamat"
                  required
                  rows="3"
                />
              </div>

            <div className="form-actions">
                <button type="submit" className="spkcmt-btn-primary" style={{ width: '100%' }}>
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default TukangCutting