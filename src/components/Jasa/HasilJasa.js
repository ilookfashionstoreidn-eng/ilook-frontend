import React, { useEffect, useState } from "react"
import "../Jahit/Penjahit.css";
import API from "../../api"; 


const HasilJasa = () => {
 const [spkCuttingList, setSpkCuttingList] = useState([]);
 const [hasilJasa, setHasilJasa] = useState([]);
 const [loading, setLoading]= useState(true);
 const [error, setError]= useState(true);
 const [searchTerm, setSearchTerm] = useState("");
 const [showForm, setShowForm]= useState(false);
 const [listHasilJasa, setListHasilJasa] = useState([]);
 const [spkJasaList, setSpkJasaList] = useState([]);
 const [newHasilJasa, setNewHasilJasa] = useState({
      spk_jasa_id: "",
      tanggal: "",
      jumlah_hasil: "",
      jumlah_rusak: 0,
 });

  useEffect(() => {
    const fetchHasilJasa = async () => {
        try {
            setLoading(true);
            const response = await API.get('/HasilJasa');
            setHasilJasa(response.data);
        }catch (error){
          
            setError("Gagal mengambil data");
        }finally{
            setLoading(false);
        }
    }
    fetchHasilJasa();
}, []);

const filteredHasilJasa = hasilJasa.filter((item) =>
   item.id.toString().includes(searchTerm.toLowerCase()) 
);

const handleFormSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await API.post("/HasilJasa", {
      spk_jasa_id: newHasilJasa.spk_jasa_id,     
      tanggal: newHasilJasa.tanggal,            
      jumlah_hasil: newHasilJasa.jumlah_hasil,   
      jumlah_rusak: newHasilJasa.jumlah_rusak,
    });

    console.log("Response:", response.data);
    alert("Hasil Jasa berhasil ditambahkan!");

    // Tambahkan ke list (jika perlu ditampilkan langsung)
    setListHasilJasa((prev) => [...prev, response.data.data]);

    // Reset form
    setNewHasilJasa({
      spk_jasa_id: "",
      tanggal: "",
      jumlah_hasil: "",
      jumlah_rusak: 0,
    });

    setShowForm(false);
  } catch (error) {
    console.error("Full error:", error);
    console.error("Error response:", error.response?.data);
    alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan Hasil Jasa.");
  }
};

const handleInputChange = (e) => {
  const { name, value } = e.target;
  setNewHasilJasa((prev) => ({ ...prev, [name]: value }));
};

useEffect(() => {
  const fetchSpkJasa = async () => {
    try {
      const res = await API.get('/SpkJasa'); // ganti sesuai endpoint kamu
      setSpkJasaList(res.data);
    } catch (err) {
      console.error('Gagal fetch SPK Jasa:', err);
    }
  };
  fetchSpkJasa();
}, []);

  return (
    <div>
       <div className="penjahit-container">
         <h1>Data Hasil Jasa</h1>
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
               placeholder="Cari nama aksesoris..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>

      
         </div>
         
           <div className="table-container">
           <table className="penjahit-table">
             <thead>
               <tr>
                 <th>Id Hasil Jasa</th>
                 <th>Spk Jasa ID</th>
                 <th>Tukang Jasa</th>
                 <th>Nama Produk</th>
                 <th>Jumlah </th>
                <th>Jumlah Rusak</th>
                 <th>Total Bayar </th>
                 <th>Tanggal Input</th>
               
               </tr>
             </thead>
             <tbody>
               {filteredHasilJasa.map((hasil) => (
                 <tr key={hasil.id}                                                                             >
                   <td data-label="Id : ">{hasil.id}</td>
                  <td data-label="spk cuttinh id : ">{hasil.spk_jasa.id}</td>
                   <td data-label="tukang : ">{hasil.spk_jasa.tukang_jasa?.nama}</td>
                   <td data-label="nama produk : ">{hasil.spk_jasa.produk?.nama_produk}</td>
                    <td data-label="spk cutting id : ">{hasil.jumlah_hasil}</td>
                     <td data-label="spk cutting id : ">{hasil.jumlah_rusak}</td>
                   <td data-label="harga jasa : ">Rp. {hasil.total_pendapatan}</td>
                     <td data-label="htanggal : ">
                      {new Date(hasil.tanggal).toLocaleDateString("id-ID")}
                    </td>

                 </tr>
               ))}
              </tbody>
            </table>
           </div>
    </div>

{showForm && (
      <div className="modal">
        <div className="modal-content">
          <h2>Tambah SPK Cutting</h2>
          <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
                <label>SPK Jasa:</label>
                <select
                  name="spk_jasa_id"
                  value={newHasilJasa.spk_jasa_id}
                  onChange={handleInputChange}
                  required
                >
                <option value="">Pilih SPK Jasa</option>
{spkJasaList
  .filter(spk => spk.status_pengambilan === 'sudah_diambil')
  .map(spk => (
    <option key={spk.id} value={spk.id}>
      {`SPK Jasa #${spk.id} | Distribusi #${spk.spk_cutting_distribusi_id} | ${spk.produk?.nama_produk ?? '-'}`}
    </option>
))}


                </select>
              </div>

            <div className="form-group">
              <label>Tanggal:</label>
              <input
                type="date"
                name="tanggal"
                value={newHasilJasa.tanggal}
                onChange={handleInputChange}
                required
              />
            </div>



           
            <div className="form-group">
              <label>Jumlah Hasil:</label>
              <input
                type="number"
                name="jumlah_hasil"
                value={newHasilJasa.jumlah_hasil}
                onChange={handleInputChange}
                required
              />
            </div>

          <div className="form-group">
            <label>Jumlah Rusak:</label>
            <input
              type="number"
              name="jumlah_rusak"
              value={newHasilJasa.jumlah_rusak}
              onChange={handleInputChange}
              min="0"
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
  )
}

export default HasilJasa