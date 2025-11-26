import React, { useEffect, useState } from "react"
import "./SpkCuting.css";
import API from "../../../api"; 

const MarkeranProduk = () => {
    const [markeran, setMarkeran] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false); 
    const [searchTerm, setSearchTerm] = useState("");
    const [produkList, setProdukList] = useState([]); 

   const [selectedProdukId, setSelectedProdukId] = useState(""); // dipilih sekali di atas
  const [markeranProdukList, setMarkeranProdukList] = useState([
    { nama_komponen: "", total_panjang: "", jumlah_hasil: "" }
  ]);




useEffect(() => {
    const fetchMarkeran = async () => {
        try {
            setLoading(true);
            const response = await API.get('/markeran_produk');
            setMarkeran(response.data);
        }catch (error){
            setError("Gagal mengambil data");
        }finally{
            setLoading(false);
        }
    }
    fetchMarkeran();
}, []);

useEffect(() => {
    const fetchProduk = async () => {
      try {
        const response = await API.get('/produk'); // pastikan endpoint ini benar
        setProdukList(response.data.data);
      } catch (error) {
        console.error("Gagal mengambil data produk:", error);
      }
    };
    fetchProduk();
  }, []);

const handleFormSubmit = async (e) => {
  e.preventDefault();

  try {
    const payload = {
      produk_id: selectedProdukId,   // ini produk yang dipilih sekali saja
      komponen: markeranProdukList,  // array berisi komponen
    };

    const response = await API.post("/markeran_produk", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Response:", response);
    alert("Semua markeran berhasil disimpan!");

    // Reset setelah submit
    setSelectedProdukId("");
    setMarkeranProdukList([{ nama_komponen: "", total_panjang: "", jumlah_hasil: "" }]);

    setShowForm(false);

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan markeran.");
  }
};


const handleAddRow = () => {
  setMarkeranProdukList([...markeranProdukList, {
    produk_id: "",
    nama_komponen: "",
    total_panjang: "",
    jumlah_hasil: "",
  }]);
};

const handleRemoveRow = (index) => {
  const updatedList = markeranProdukList.filter((_, i) => i !== index);
  setMarkeranProdukList(updatedList);
};

const handleInputChange = (index, field, value) => {
  const updatedList = [...markeranProdukList];
  updatedList[index][field] = value;
  setMarkeranProdukList(updatedList);
};

  return (
 <div>
     <div className="penjahit-container">
      <h1>Data Markeran Produk</h1>
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
            placeholder="Cari ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          </div>
          
      </div>
      
        <div className="table-container">
       <table className="table-markeran">
        <thead>
            <tr>
            <th>ID Produk</th>
            <th>Nama Produk</th>
            <th>Nama Komponen</th>
            <th>BERAT/PANJANG</th>
            <th>HASIL JADI</th>
            <th>HASIL JADI/PCS</th>
            </tr>
        </thead>
        <tbody>
        {markeran.map((produk) =>
            produk.komponen.map((komponen, index) => (
            <tr key={komponen.id} className={`produk-${produk.produk_id}`}>
                {index === 0 && (
                <>
                    <td rowSpan={produk.komponen.length}>{produk.produk_id}</td>
                    <td rowSpan={produk.komponen.length}>{produk.nama_produk}</td>
                </>
                )}
                {index !== 0 && null}
                <td>{komponen.nama_komponen}</td>
                <td>{komponen.total_panjang}</td>
                <td>{komponen.jumlah_hasil}</td>
                <td>{komponen.berat_per_pcs}</td>
            </tr>
            ))
        )}
        </tbody>
    </table>
</div>

 {showForm && (
  <div className="modal">
    <div className="modal-content">
      <h2>Tambah Markeran Produk</h2>
      <form onSubmit={handleFormSubmit} className="modern-form">

        {/* Produk dipilih sekali di atas */}
        <div className="form-group">
          <label>Produk:</label>
          <select
            value={selectedProdukId}
            onChange={(e) => setSelectedProdukId(e.target.value)}
            required
          >
            <option value="">-- Pilih Produk --</option>
            {produkList.map((produk) => (
              <option key={produk.id} value={produk.id}>
                {produk.id} - {produk.nama_produk}
              </option>
            ))}
          </select>
        </div>

        {/* Input komponen */}
        {markeranProdukList.map((item, index) => (
          <div className="markeran-group" key={index}>
            <h4>Komponen #{index + 1}</h4>

            <div className="form-group">
              <label>Nama Komponen:</label>
              <input
                type="text"
                value={item.nama_komponen}
                onChange={(e) =>
                  handleInputChange(index, "nama_komponen", e.target.value)
                }
                placeholder="Misal: Lengan, Badan"
                required
              />
            </div>

            <div className="form-group">
              <label>Berat/Panjang (m):</label>
              <input
                type="number"
                step="0.01"
                value={item.total_panjang}
                onChange={(e) =>
                  handleInputChange(index, "total_panjang", e.target.value)
                }
                placeholder="Contoh: 2.5"
                required
              />
            </div>

            <div className="form-group">
              <label>Hasil Jadi:</label>
              <input
                type="number"
                value={item.jumlah_hasil}
                onChange={(e) =>
                  handleInputChange(index, "jumlah_hasil", e.target.value)
                }
                placeholder="Contoh: 10"
                required
              />
            </div>

            <button
              type="button"
              className="btn btn-danger"
              onClick={() => handleRemoveRow(index)}
            >
              Hapus
            </button>
            <hr />
          </div>
        ))}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddRow}
        >
          + Tambah Komponen
        </button>

        <div className="form-actions">
          <button type="submit" className="btn btn-submit">
            Simpan Markeran
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

export default MarkeranProduk