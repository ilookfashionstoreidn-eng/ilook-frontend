import React, { useEffect, useState } from "react";
import "./Penjahit.css";

const Spk = () => {
  const [spk, setSpk] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [penjahits, setPenjahits] = useState([]); // State untuk data penjahit
  const [newSpk, setNewSpk] = useState({

    
    nama_produk: "",
    jumlah_produk: "",
    deadline: "",
    id_penjahit: "",
    keterangan: "",
    tgl_spk: "",
    status:"",
  }); // State untuk form data penjahit baru

  useEffect(() => {
    // Fetch data SPK
    fetch("http://localhost:8000/api/spkcmt")
      .then((response) => response.json())
      .then((data) => setSpk(data))
      .catch((error) => console.error("Error fetching SPK data:", error));
  
    // Fetch data Penjahit
    fetch("http://localhost:8000/api/penjahit")
      .then((response) => response.json())
      .then((data) => setPenjahits(data))
      .catch((error) => console.error("Error fetching penjahit data:", error));
  }, []);
  
 

   
  // Filter data berdasarkan pencarian
  const filteredSpk = spk.filter((spk) =>
    spk.nama_produk.toLowerCase().includes(searchTerm.toLowerCase())
  );


  // Handle submit form
  const handleFormSubmit = (e) => {
    e.preventDefault();
  
    console.log("Payload sebelum dikirim:", newSpk);
  
    fetch("http://localhost:8000/api/spkcmt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSpk),
    })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          console.error("Error response:", err);
          alert(err.message || "Terjadi kesalahan saat menyimpan data.");
          throw new Error("Error submitting data");
        });
      }
      return response.json();
    })
    .then((data) => {
      // proses data berhasil
    })
    .catch((error) => {
      console.error("Terjadi kesalahan:", error);
    });
    
  };
  

   return (
     <div className="penjahit-container">
       <h1>Daftar SPK</h1>

         {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Cari data SPK..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="add-button" onClick={() => setShowForm(true)}>
          Tambah 
        </button>
      </div>

       <table className="penjahit-table">
         <thead>
           <tr>
             <th>ID</th>
             <th>Nama Produk</th>
             <th>Jumlah Produk</th>
             <th>Deadline </th>
             <th> ID Penjahit</th>
             <th>Keterangan </th>
             <th>Tanggal SPK </th>
             <th>Status </th>
            
            
           </tr>
         </thead>
         <tbody>
           {filteredSpk.map((spk) => (
             <tr key={spk.id_spk}>
             <td>{spk.id_spk}</td>
             <td>{spk.nama_produk}</td>
             <td>{spk.jumlah_produk}</td>
             <td>{spk.deadline}</td>
             <td>{spk.id_penjahit}</td>
             <td>{spk.keterangan}</td>
             <td>{spk.tgl_spk}</td>
             <td>{spk.status}</td>
           </tr>
           ))}
         </tbody>
       </table>

          {/* Modal Form */}
      {showForm && (
       <div className="modal">
       <div className="modal-content">
         <h2>Tambah Data SPK</h2>
         <form onSubmit={handleFormSubmit} className="modern-form">
           <div className="form-group">
             <label>Nama Produk</label>
             <input
               type="text"
               value={newSpk.nama_produk}
               onChange={(e) =>
                 setNewSpk({ ...newSpk, nama_produk: e.target.value })
               }
               placeholder="Masukkan nama produk"
               required
             />
           </div>
     
           <div className="form-group">
             <label>Jumlah Produk</label>
             <input
               type="number"
               value={newSpk.jumlah_produk}
               onChange={(e) =>
                 setNewSpk({ ...newSpk, jumlah_produk: e.target.value })
               }
               placeholder="Masukkan jumlah produk"
               required
             />
           </div>
     
           <div className="form-group">
             <label>Deadline</label>
             <input
               type="date"
               value={newSpk.deadline}
               onChange={(e) =>
                 setNewSpk({ ...newSpk, deadline: e.target.value })
               }
               required
             />
           </div>
     
           <div className="form-group">
             <label>Penjahit</label>
             <select
               value={newSpk.id_penjahit}
               onChange={(e) =>
                 setNewSpk({ ...newSpk, id_penjahit: e.target.value })
               }
               required
             >
               <option value="">Pilih Penjahit</option>
               {penjahits.map((penjahit) => (
                 <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                   {penjahit.id_penjahit}
                 </option>
               ))}
             </select>
           </div>
     
           <div className="form-group">
             <label>Keterangan</label>
             <textarea
               value={newSpk.keterangan}
               onChange={(e) =>
                 setNewSpk({ ...newSpk, keterangan: e.target.value })
               }
               placeholder="Tambahkan keterangan..."
               required
             ></textarea>
           </div>


           <div className="form-group">
            <label>Tanggal SPK:</label>
            <input
              type="date"
              name="tgl_spk"
              value={newSpk.tgl_spk}
              onChange={(e) =>
                setNewSpk({ ...newSpk, tgl_spk: e.target.value })
              }
              required
            />
          </div>
           <div className="form-group">
              <label>Status</label>
              <select
                value={newSpk.status}
                onChange={(e) => setNewSpk({ ...newSpk, status: e.target.value })}
                required
              >
                <option value="">Pilih Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
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
  );
};

export default Spk