import React, { useEffect, useState } from "react"
import "../Jahit/Penjahit.css";
import API from "../../api"; 


const SpkJasa = () => {
    const [spkJasa, setSpkJasa] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [produkList, setProdukList] = useState([]);
    const [spkCuttingList, setSpkCuttingList] = useState([]);
    const [tukangList, setTukangList] = useState([]);
    const [listHasilJasa, setListHasilJasa] = useState([]);
    const [selectedDetailSpk, setSelectedDetailSpk] = useState(null);
    const [newSpkJasa, setNewSpkJasa] = useState({
        tukang_jasa_id: "",      
        spk_cutting_id: "",      
        deadline: "",          
        status: "proses",        
        harga: "",              
        opsi_harga: "pcs",      
    });

    useEffect(() => {
    const fetchSpkJasa = async () => {
        try {
            setLoading(true);
            const response = await API.get('/SpkJasa');
            setSpkJasa(response.data);
        }catch (error){
            setError("Gagal mengambil data");
        }finally{
            setLoading(false);
        }
    }
    fetchSpkJasa();
}, []);

 useEffect(() => {
    const fetchSpkCutting = async () => {
      try {
        const response = await API.get("/spk_cutting");
        setSpkCuttingList(response.data);
      } catch (error) {
        console.error("Gagal mengambil SPK Cutting:", error);
      }
    };
    fetchSpkCutting();
  }, []);

useEffect(() => {
  const fetchTukang = async () => {
    try {
      setLoading(true);
      const response = await API.get("/tukang-jasa"); 
      setTukangList(response.data);
    } catch (error) {
      setError("Gagal mengambil data produk.");
    } finally {
      setLoading(false);
    }
  };

  fetchTukang();
}, []);


const filteredSpkJasa = spkJasa.filter((item) =>
   item.id.toString().includes(searchTerm.toLowerCase()) 
);

const handleFormSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await API.post("/SpkJasa", {
      tukang_jasa_id: newSpkJasa.tukang_jasa_id,
      spk_cutting_id: newSpkJasa.spk_cutting_id,
      deadline: newSpkJasa.deadline,
      harga: newSpkJasa.harga,
      opsi_harga: newSpkJasa.opsi_harga,
      status: newSpkJasa.status || 'proses', // optional default
    });

    console.log("Response:", response.data);
    alert("SPK Jasa berhasil ditambahkan!");

    // Tambahkan ke state list SPK Jasa jika perlu
    setSpkJasa((prev) => [...prev, response.data.data]);

    // Reset form
    setNewSpkJasa({
      tukang_jasa_id: "",
      spk_cutting_id: "",
      deadline: "",
      harga: "",
      opsi_harga: "pcs", // default
      status: "proses",
    });

    setShowForm(false);
 } catch (error) {
  console.error("Full error:", error); // Tambahkan ini
  console.error("Error response:", error.response?.data);
  alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan SPK Jasa.");
}
};

const handleInputChange = (e) => {
  const { name, value } = e.target;
  setNewSpkJasa((prev) => ({ ...prev, [name]: value }));
};
  return (
     <div>
       <div className="penjahit-container">
         <h1>Data SPK Jasa</h1>
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
                 <th>Id Spk</th>
                 <th>Tukang Jasa</th>
                 <th>Spk Cutting ID</th>
                 <th>Nama Produk</th>
                 <th>harga per pcs </th>
                 <th>Jumlah</th>
                
                 <th>Sisa hari</th>
                 <th>Tanggal Dibuat</th>
               
               </tr>
             </thead>
             <tbody>
               {filteredSpkJasa.map((spk) => (
                 <tr key={spk.id}>
                   <td data-label="Id : ">{spk.id}</td>
                   <td data-label="tukang cutting : ">{spk.tukang_jasa?.nama}</td>
                   <td data-label="spk cuttinh id : ">{spk.spk_cutting?.id_spk_cutting}</td>
                   <td data-label="nama produk : ">{spk.produk?.nama_produk}</td>
                   <td data-label="harga jasa : ">Rp. {spk.harga_per_pcs}</td>
                  <td data-label="harga jasa : "> {spk.total_hasil_pendapatan}</td>
                 
                  <td data-label="harga jasa : "> {spk.sisa_hari}</td>
                    <td data-label="htanggal : ">
                      {new Date(spk.created_at).toLocaleDateString("id-ID")}
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
            <label>SPK Cutting:</label>
            <select
              name="spk_cutting_id"
              value={newSpkJasa.spk_cutting_id}
              onChange={handleInputChange}
              required
            >
              <option value="">-- Pilih SPK --</option>
              {spkCuttingList.map((spk) => (
                <option key={spk.id} value={spk.id}>
                  {spk.id} - {spk.produk?.nama_produk} - {spk.id_spk_cutting}
                </option>
              ))}
            </select>
          </div>
               <div className="form-group">
              <label>Tukang Jasa:</label>
              <select
                name="tukang_jasa_id"
                value={newSpkJasa.tukang_jasa_id}
                onChange={handleInputChange}
                required
              >
                <option value="">Pilih Tukang</option>
                {tukangList.map((tukang) => (
                  <option key={tukang.id} value={tukang.id}>
                    {tukang.nama}
                  </option>
                ))}
              </select>
            </div>



            <div className="form-group">
              <label>Tanggal Batas Kirim:</label>
              <input
                type="date"
                name="deadline"
                value={newSpkJasa.deadline}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Harga Jasa:</label>
              <input
                type="number"
                name="harga"
                value={newSpkJasa.harga}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Satuan Harga:</label>
              <select
                name="opsi_harga"
                value={newSpkJasa.opsi_harga}
                onChange={handleInputChange}
                required
              >
                <option value="pcs">Pcs</option>
                <option value="lusin">Lusin</option>
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
  )
}



export default SpkJasa