import React, { useEffect, useState } from "react"
import "../Jahit/Penjahit.css";
import API from "../../api"; 
import {FaInfoCircle, FaPlus, FaEdit, } from 'react-icons/fa';

const TukangJasa = () => {
  const [tukangJasa, setTukangJasa] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const [newTukangJasa, setNewTukangJasa] = useState({
    nama: "",
    kontak: "",
    bank: "",
    no_rekening: "",
    alamat: "",
    jenis_jasa: "",
  });

  useEffect(() => {
    const fetchTukangJasa = async () => {
      try {
        setLoading(true);
        const response = await API.get("/tukang-jasa"); 
        setTukangJasa(response.data);
      } catch (error) {
        setError("Gagal mengambil data penjahit.");
      } finally {
        setLoading(false);
      }
    };

    fetchTukangJasa();
  }, []);

  const filteredTukangJasa= tukangJasa.filter((item) =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const handleFormSubmit = async (e) => {
  e.preventDefault(); // Hindari reload halaman

  const formData = new FormData();
  formData.append("nama", newTukangJasa.nama);
  formData.append("kontak", newTukangJasa.kontak || "");
  formData.append("bank", newTukangJasa.bank || "");
  formData.append("no_rekening", newTukangJasa.no_rekening || "");
  formData.append("alamat", newTukangJasa.alamat || "");
  formData.append("jenis_jasa", newTukangJasa.jenis_jasa || "");

 

  try {
    const response = await API.post("/tukang-jasa", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("Response API:", response.data);

    alert("Tukang Jasa berhasil ditambahkan!");

    // Tambah ke state
    setTukangJasa((prev) => [...prev, response.data.data]);

    // Reset form & tutup modal
    setNewTukangJasa({
      nama: "",
      kontak: "",
      bank: "",
      no_rekening: "",
      alamat: "",
      jenis_jasa: "",
  
    });

    setShowForm(false);
  } catch (error) {
    console.error("Error:", error.response?.data?.message || error.message);
    alert(error.response?.data?.message || "Gagal menambahkan tukang jasa.");
  }
};

 const handleInputChange = (e) => {
  const { name, value } = e.target;
  setNewTukangJasa((prev) => ({
    ...prev,
    [name]: value,
  }));
};

 return (
   <div>
     <div className="penjahit-container">
      <h1>Data Tukang Jasa</h1>
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
            {filteredTukangJasa.map((tc) => (
              <tr key={tc.id}>
                <td data-label="Id Penjahit : ">{tc.id}</td>
                <td data-label="Nama Penjahit : ">{tc.nama}</td>
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
      <h2>Tambah Tukang Jasa</h2>
      <form onSubmit={handleFormSubmit} className="modern-form" encType="multipart/form-data">
        <div className="form-group">
          <label>Nama tukang jasa:</label>
          <input
            type="text"
            name="nama"
            value={newTukangJasa.nama}
            onChange={handleInputChange}
            placeholder="Masukkan nama tukang jasa"
            required
          />
        </div>

        <div className="form-group">
          <label>Kontak:</label>
          <input
            type="text"
            name="kontak"
            value={newTukangJasa.kontak}
            onChange={handleInputChange}
            placeholder="Masukkan no HP"
          />
        </div>

        <div className="form-group">
          <label>Bank:</label>
          <input
            type="text"
            name="bank"
            value={newTukangJasa.bank}
            onChange={handleInputChange}
            placeholder="Masukkan nama bank"
          />
        </div>

        <div className="form-group">
          <label>Nomor Rekening:</label>
          <input
            type="text"
            name="no_rekening"
            value={newTukangJasa.no_rekening}
            onChange={handleInputChange}
            placeholder="Masukkan No rekening"
          />
        </div>

        <div className="form-group">
          <label>Alamat:</label>
          <input
            type="text"
            name="alamat"
            value={newTukangJasa.alamat}
            onChange={handleInputChange}
            placeholder="Masukkan Alamat"
          />
        </div>

        <div className="form-group">
          <label>Jenis Jasa:</label>
          <input
            type="text"
            name="jenis_jasa"
            value={newTukangJasa.jenis_jasa}
            onChange={handleInputChange}
            placeholder="Contoh: sablon, obras, jahit"
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

export default TukangJasa