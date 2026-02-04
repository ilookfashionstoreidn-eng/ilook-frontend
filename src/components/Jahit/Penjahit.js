import React, { useEffect, useState } from "react";
import "./Penjahit.css";
import API from "../../api"; 
import {FaInfoCircle, FaPlus, FaEdit, } from 'react-icons/fa';

const Penjahit = () => {
  const [penjahits, setPenjahits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const [selectedPenjahit, setSelectedPenjahit] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [newPenjahit, setNewPenjahit] = useState({
    nama_penjahit: "",
    kontak: "",
    alamat: "",
    kategori_penjahit: "",
    jumlah_tim: "",
    no_rekening: "",
    bank: "",
    mesin: [], 
    ktp: null,
  }); 
  const [successMessage, setSuccessMessage] = useState("");
  // Fetch data penjahit

  useEffect(() => {
    const fetchPenjahits = async () => {
      try {
        setLoading(true);
        const response = await API.get("/penjahit"); 
        setPenjahits(response.data);
      } catch (error) {
        setError("Gagal mengambil data penjahit.");
      } finally {
        setLoading(false);
      }
    };

    fetchPenjahits();
  }, []);



  // Filter data berdasarkan pencarian
  const filteredPenjahits = penjahits.filter((penjahit) =>
    penjahit.nama_penjahit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle submit form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
  
    try {
      // Buat FormData untuk menangani file KTP
      const formData = new FormData();
      formData.append("nama_penjahit", newPenjahit.nama_penjahit);
      formData.append("kontak", newPenjahit.kontak);
      formData.append("alamat", newPenjahit.alamat);
      formData.append("kategori_penjahit", newPenjahit.kategori_penjahit);
      formData.append("jumlah_tim", newPenjahit.jumlah_tim);
      formData.append("no_rekening", newPenjahit.no_rekening);
      formData.append("bank", newPenjahit.bank);
      
      // Mesin dikirim dalam bentuk JSON string
      formData.append("mesin", JSON.stringify(newPenjahit.mesin));
  
      // Tambahkan KTP jika ada
      if (newPenjahit.ktp) {
        formData.append("ktp", newPenjahit.ktp);
      }
  
      // Kirim ke API
      const response = await API.post("/penjahit", formData, {
        headers: {
          "Content-Type": "multipart/form-data", // Penting untuk upload file
        },
      });
  
      // Update state setelah berhasil
      setPenjahits([...penjahits, response.data]);
      setShowForm(false);
      setNewPenjahit({
        nama_penjahit: "",
        kontak: "",
        alamat: "",
        kategori_penjahit: "",
        jumlah_tim: "",
        no_rekening: "",
        bank: "",
        mesin: [],
        ktp: null,
      });
  
      // Tampilkan pesan sukses
      setSuccessMessage("Penjahit berhasil ditambahkan!");
    } catch (error) {
      console.error("Error:", error);
      setError("Gagal menambahkan penjahit.");
    }
  };


  
  const handleFormUpdate = async (e) => {
    e.preventDefault();
  
    if (!newPenjahit.id) {
      alert("Gagal update: ID Penjahit tidak ditemukan!");
      return;
    }
  
    console.log("Mengupdate Penjahit dengan ID:", newPenjahit.id);
  
    const formData = new FormData();
  
    // Tambahkan semua data kecuali 'mesin' dan 'ktp'
    Object.keys(newPenjahit).forEach((key) => {
      if (key !== "mesin" && key !== "ktp") {
        formData.append(key, newPenjahit[key]);
      }
    });
  
    // Menambahkan data mesin sebagai JSON string
    formData.append("mesin", JSON.stringify(newPenjahit.mesin));
  
    // Jika ada file KTP yang baru diunggah, tambahkan ke FormData
    if (newPenjahit.ktp instanceof File) {
      formData.append("ktp", newPenjahit.ktp);
    }
  
    // Tambahkan _method untuk Laravel (karena FormData tidak mendukung PUT secara langsung)
    formData.append("_method", "PUT");
  
    try {
      const token = localStorage.getItem("token");
  
      const response = await fetch(`http://localhost:8000/api/penjahit/${newPenjahit.id}`, {
        method: "POST",
        body: formData,
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
  
      const result = await response.json();
  
      if (!response.ok) throw new Error(result.error || "Gagal update penjahit");
  
      console.log("✅ Penjahit berhasil diperbarui:", result);
  
      alert("Penjahit berhasil diperbarui!");
  
      // Update state penjahit di frontend
      setPenjahits((prev) =>
        prev.map((penjahit) =>
          penjahit.id === newPenjahit.id ? { ...penjahit, ...result.data } : penjahit
        )
      );
  
      setShowForm(false);
    } catch (error) {
      console.error("❌ Terjadi kesalahan:", error);
      alert("Error: " + error.message);
    }
  };
  
  

  const handleDetailClick = (penjahit) => {
    setSelectedPenjahit(penjahit); // Simpan detail SPK yang dipilih
    setShowPopup(true);  // Tampilkan pop-up
  };
  const closePopup = () => {
    setShowPopup(false); // Sembunyikan pop-up
    setSelectedPenjahit(null); // Reset data SPK
  };
  const handleEditClick = (penjahit) => {
    console.log("Editing:", penjahit); // Debugging
    setNewPenjahit({
      ...penjahit,
      id: penjahit.id_penjahit, // Pastikan id tersimpan sebagai 'id'
    });
    setSelectedPenjahit(penjahit);
    setShowForm(true);
  };
  
  
  
  return (
    <div>
     <div className="spkcmt-container">
      <div className="spkcmt-header">
        <h1>📋 Data CMT</h1>
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
              <th>Alamat</th>
              <th> KATEGORI</th>
             
          
              <th>Aksi</th>
            
            </tr>
          </thead>
          <tbody>
            {filteredPenjahits.map((penjahit) => (
              <tr key={penjahit.id_penjahit}>
                <td data-label="Id Penjahit : ">{penjahit.id_penjahit}</td>
                <td data-label="Nama Penjahit : ">{penjahit.nama_penjahit}</td>
                <td data-label="Kontak : ">{penjahit.kontak}</td>
                <td data-label="Alamat : ">{penjahit.alamat}</td>
                <td data-label="Kategori : ">{penjahit.kategori_penjahit}</td>
               
              
              <td>
              <div className="action-card">
                  <button 
                    className="btn1-icon" 
                    onClick={() => handleDetailClick(penjahit)}
                  >
                    <FaInfoCircle className="icon" />
                  </button>
                  <button 
                    className="btn1-icon" 
                     onClick={() => handleEditClick(penjahit)}
                     > 
                     <FaEdit className="icon" />
                   </button>
       {
          
        }
                  </div>

                  </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>


{/* Pop-Up Card */}
{showPopup && selectedPenjahit && (
  <div className="popup1-overlay">
    <div className="popup1-card">
      <div className="popup1-header">
        <h2>Detail Penjahit</h2>
        <button className="btn-close" onClick={closePopup}>
          &times;
        </button>
      </div>

      <div className="popup1-content">
        {/* Gambar Produk */}
        <div className="popup1-image-container">
          {selectedPenjahit.ktp ? (
            <img
              src={`http://localhost:8000/storage/${selectedPenjahit.ktp}`}
              alt="Gambar Produk"
              className="popup1-image"
            />
          ) : (
            <div className="popup1-no-image">No Image</div>
          )}
        </div>

        {/* Detail Produk */}
        <div className="popup1-details">
          <div className="detail-group">
          <p><strong>Jumlah Tim :</strong> <span> {selectedPenjahit.jumlah_tim}</span></p>
          <p><strong>Nama Bank :</strong><span> {selectedPenjahit.bank}</span></p>
          <p><strong>No. Rekening :</strong> <span> {selectedPenjahit.no_rekening}</span></p>
          <p><strong>Jumlah Tim :</strong> <span> {selectedPenjahit.jumlah_tim}</span></p>
          <p><strong>Mesin :</strong> <span>
            {selectedPenjahit.mesin &&
              (Array.isArray(selectedPenjahit.mesin)
                ? selectedPenjahit.mesin
                : JSON.parse(selectedPenjahit.mesin)
              )
              .map((item) => `${item.nama} (${item.jumlah})`)
              .join(", ")}
          </span></p>

        
          </div>
          


         
        </div>
      </div>
    </div>
  </div>
)}




        {/* Modal Form */}
        {showForm && (
          <div className="modal">
            <div className="modal-content">
              <h2>Tambah Data Penjahit</h2 >
              <form
                className="modern-form"
                onSubmit={(e) => {
                  console.log("Form submit triggered!"); 
                  newPenjahit.id ? handleFormUpdate(e) : handleFormSubmit(e);
                }}
              >

              
              <div className="form-group">
                <label>Nama Penjahit</label>
                <input
                  type="text"
                  value={newPenjahit.nama_penjahit}
                  onChange={(e) =>
                    setNewPenjahit({ ...newPenjahit, nama_penjahit: e.target.value })
                  }
                    placeholder="Masukkan nama penjahit"
                  required
                />
                </div>

                <div className="form-group">
                <label>Kontak</label>
                <input
                  type="text"
                  value={newPenjahit.kontak}
                  onChange={(e) =>
                    setNewPenjahit({ ...newPenjahit, kontak: e.target.value })
                  }
                  placeholder="Masukkan nomor telepon"
                  required
                />
                </div>

                <div className="form-group">
                <label>Alamat</label>
                <textarea
                  value={newPenjahit.alamat}
                  onChange={(e) =>
                    setNewPenjahit({ ...newPenjahit, alamat: e.target.value })
                  }
                  placeholder="Tambahkan alamat..."
                  required
                ></textarea>
                </div>

 {/* Kategori Penjahit */}
 <div className="form-group">
          <label>Kategori Penjahit</label>
          <input
            type="text"
            value={newPenjahit.kategori_penjahit}
            onChange={(e) =>
              setNewPenjahit({ ...newPenjahit, kategori_penjahit: e.target.value })
            }
            placeholder="Masukkan kategori penjahit"
            required
          />
        </div>

        {/* Jumlah Tim */}
        <div className="form-group">
          <label>Jumlah Tim</label>
          <input
            type="number"
            value={newPenjahit.jumlah_tim}
            onChange={(e) =>
              setNewPenjahit({ ...newPenjahit, jumlah_tim: e.target.value })
            }
            placeholder="Masukkan jumlah tim"
            required
          />
        </div>

        {/* No. Rekening */}
        <div className="form-group">
          <label>No. Rekening</label>
          <input
            type="text"
            value={newPenjahit.no_rekening}
            onChange={(e) =>
              setNewPenjahit({ ...newPenjahit, no_rekening: e.target.value })
            }
            placeholder="Masukkan nomor rekening"
            required
          />
        </div>

        {/* Bank */}
        <div className="form-group">
          <label>Bank</label>
          <input
            type="text"
            value={newPenjahit.bank}
            onChange={(e) =>
              setNewPenjahit({ ...newPenjahit, bank: e.target.value })
            }
            placeholder="Masukkan nama bank"
            required
          />
        </div>

        {/* Mesin (Array) */}
        <div className="form-group">
          <label>Mesin</label>
          {newPenjahit.mesin.map((item, index) => (
            <div key={index} className="mesin-item">
              <input
                type="text"
                value={item.nama}
                onChange={(e) => {
                  const updatedMesin = [...newPenjahit.mesin];
                  updatedMesin[index].nama = e.target.value;
                  setNewPenjahit({ ...newPenjahit, mesin: updatedMesin });
                }}
                placeholder="Nama Mesin"
                required
              />
              <input
                type="number"
                value={item.jumlah}
                onChange={(e) => {
                  const updatedMesin = [...newPenjahit.mesin];
                  updatedMesin[index].jumlah = e.target.value;
                  setNewPenjahit({ ...newPenjahit, mesin: updatedMesin });
                }}
                placeholder="Jumlah Mesin"
                required
              />
              <button
                type="button"
                onClick={() => {
                  const updatedMesin = newPenjahit.mesin.filter((_, i) => i !== index);
                  setNewPenjahit({ ...newPenjahit, mesin: updatedMesin });
                }}
              >
                Hapus
              </button>
            </div>
          ))}
          <button
          
             className="btn1"
            onClick={() =>
              setNewPenjahit({
                ...newPenjahit,
                mesin: [...newPenjahit.mesin, { nama: "", jumlah: "" }],
              })
              
            }
          >
             <FaPlus /> Tambah Mesin
          </button>
        </div>

        {/* KTP (Upload File) */}
        <div className="form-group">
          <label>Upload KTP</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setNewPenjahit({ ...newPenjahit, ktp: e.target.files[0] })
            }
          />
        </div>

        <div className="form-actions">
        <button type="submit" className="btn btn-submit">
        {newPenjahit.id_penjahit ? "Update" : "Simpan"}
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
</div>|
</div>
  );
};

export default Penjahit;
