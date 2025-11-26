import React, { useEffect, useState } from "react"
import "../../Jahit/Penjahit.css";
import API from "../../../api"; 
import {FaInfoCircle, FaPlus, FaEdit, } from 'react-icons/fa';

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
   <div>
     <div className="penjahit-container">
      <h1>Data Tukang Cutting</h1>
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
              <th>ID</th>
              <th>Nama Penjahit</th>
              <th>Kontak</th>
              <th>bank</th>
              <th>No Rekening</th>
              <th>Alamat</th>
         
            
            
            </tr>
          </thead>
          <tbody>
            {filteredTukangCutting.map((tc) => (
              <tr key={tc.id}>
                <td data-label="Id Penjahit : ">{tc.id}</td>
                <td data-label="Nama Penjahit : ">{tc.nama_tukang_cutting}</td>
                <td data-label="Kontak : ">{tc.kontak}</td>
                <td data-label="Bank : ">{tc.bank}</td>
                <td data-label="No rekening : ">{tc.no_rekening}</td>
                <td data-label="alamat : ">{tc.alamat}</td>
              
              </tr>
            ))}
          </tbody>
        </table>
        </div>


    {/* Modal Form */}
        {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Tambah Tukang Cutting  </h2>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
                <label>Nama tukang:</label>
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
                <input
                  type="text"
                  name="alamat"
                  value={newTukangCutting.alamat}
                  onChange={handleInputChange}
                  placeholder="Masukkan Alamat"
                  required
                />
              </div>

            <div className="form-actions">
                <button type="submit" className="btn btn-submit">
                  Simpan
                </button>
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={() => setShowForm(false)}
                >
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
export default TukangCutting