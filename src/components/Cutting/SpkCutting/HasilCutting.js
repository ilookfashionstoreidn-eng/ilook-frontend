import React, { useEffect, useState } from "react";
import "./SpkCuting.css";
import API from "../../../api"; 
import { FaInfoCircle,  } from 'react-icons/fa';

const HasilCutting = () => {
  const [hasilCutting, setHasilCutting] = useState({
    spk_cutting_id: "",
    foto_komponen: null,
    jumlah_komponen: "",
    hasil_markeran: [],
    hasil_bahan: [],
    spk_cutting_bagian_id: "", 
  });

  const [spkCuttingList, setSpkCuttingList] = useState([]);
  const [bahanList, setBahanList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [hasilCuttingList, setHasilCuttingList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [komponenList, setKomponenList] = useState([]);
  const [selectedDetailHasil, setSelectedDetailHasil] = useState(null);
  const [selectedDetailBagian, setSelectedDetailBagian] = useState(null);
  const [bagianList, setBagianList] = useState([]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await API.get("/hasil_cutting");
        setHasilCuttingList(response.data);
      } catch (err) {
        setError("Gagal mengambil data hasil cutting.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
  const fetchDetailSpk = async () => {
    if (!hasilCutting.spk_cutting_id) return;
    try {
      const response = await API.get(`/spk_cutting/${hasilCutting.spk_cutting_id}`);
      
      const bagian = response.data.data.bagian || [];
      console.log("✅ Bagian dari SPK Cutting:", bagian); // debug: bagian
      
      // Debug: cek apakah setiap bagian punya ID dan nama
      bagian.forEach((b, i) => {
        console.log(`➡️ Bagian[${i}] - ID: ${b.id}, Nama: ${b.nama_bagian}`);
        if (!b.bahan || b.bahan.length === 0) {
          console.warn(`⚠️ Bagian "${b.nama_bagian}" tidak memiliki bahan.`);
        }
      });

      setBagianList(bagian); // simpan bagian

      // Ambil semua bahan dari bagian
      const semuaBahan = bagian.flatMap((b) =>
        b.bahan.map((item) => ({
          id: item.id,
          nama_bahan: item.nama_bahan,
        }))
      );
      console.log("🧵 Semua Bahan:", semuaBahan); // debug: bahan

      setBahanList(semuaBahan);

      // Ambil komponen dari produk
      const komponen = response.data.data.produk?.markeran_produk || [];
      const semuaKomponen = komponen.map((k) => ({
        id: k.id,
        nama_komponen: k.nama_komponen,
      }));
      console.log("🧩 Komponen Produk:", semuaKomponen); // debug: komponen

      setKomponenList(semuaKomponen);

    } catch (error) {
      console.error("❌ Gagal mengambil detail SPK Cutting:", error);
    }
  };

  fetchDetailSpk();
}, [hasilCutting.spk_cutting_id]);





const filteredHasil = hasilCuttingList.filter((h) =>
  h.nama_produk?.toLowerCase().includes(searchTerm.toLowerCase())
);



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setHasilCutting((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    setHasilCutting((prev) => ({
      ...prev,
      foto_komponen: e.target.files[0],
    }));
  };

  const handleMarkeranChange = (index, field, value) => {
    const updated = [...hasilCutting.hasil_markeran];
    updated[index][field] = value;
    setHasilCutting((prev) => ({
      ...prev,
      hasil_markeran: updated,
    }));
  };

  const addMarkeran = () => {
    setHasilCutting((prev) => ({
      ...prev,
      hasil_markeran: [...prev.hasil_markeran, { nama_komponen: "", total_panjang: "", jumlah_hasil: "" }],
    }));
  };

  const removeMarkeran = (index) => {
    const updated = [...hasilCutting.hasil_markeran];
    updated.splice(index, 1);
    setHasilCutting((prev) => ({
      ...prev,
      hasil_markeran: updated,
    }));
  };

  const handleBahanChange = (index, field, value) => {
    const updated = [...hasilCutting.hasil_bahan];
    updated[index][field] = value;
    setHasilCutting((prev) => ({
      ...prev,
      hasil_bahan: updated,
    }));
  };

  const addBahan = () => {
    setHasilCutting((prev) => ({
      ...prev,
      hasil_bahan: [...prev.hasil_bahan, {spk_cutting_bagian_id: "", spk_cutting_bahan_id: "", berat: "", hasil: "" }],
    }));
  };

  const removeBahan = (index) => {
    const updated = [...hasilCutting.hasil_bahan];
    updated.splice(index, 1);
    setHasilCutting((prev) => ({
      ...prev,
      hasil_bahan: updated,
    }));
  };

 const handleFormSubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData();

  formData.append("spk_cutting_id", hasilCutting.spk_cutting_id);
  formData.append("spk_cutting_bagian_id", hasilCutting.spk_cutting_bagian_id);

  if (hasilCutting.foto_komponen) {
    formData.append("foto_komponen", hasilCutting.foto_komponen, hasilCutting.foto_komponen.name);
  }

  if (hasilCutting.jumlah_komponen) {
    formData.append("jumlah_komponen", hasilCutting.jumlah_komponen);
  } else {
    formData.append("jumlah_komponen", 0);
  }

  hasilCutting.hasil_markeran.forEach((item, index) => {
    formData.append(`hasil_markeran[${index}][nama_komponen]`, item.nama_komponen);
    formData.append(`hasil_markeran[${index}][total_panjang]`, item.total_panjang);
    formData.append(`hasil_markeran[${index}][jumlah_hasil]`, item.jumlah_hasil);
  });

  hasilCutting.hasil_bahan.forEach((item, index) => {
    formData.append(`hasil_bahan[${index}][spk_cutting_bahan_id]`, item.spk_cutting_bahan_id);
    formData.append(`hasil_bahan[${index}][spk_cutting_bagian_id]`, item.spk_cutting_bagian_id);
    formData.append(`hasil_bahan[${index}][berat]`, item.berat !== "" ? item.berat : null);
    formData.append(`hasil_bahan[${index}][hasil]`, item.hasil !== "" ? item.hasil : null);
  });

  // ✅ Tambahkan ini sebelum mengirim
  for (let [key, value] of formData.entries()) {
    console.log(`${key}:`, value);
  }

  try {
    const response = await API.post("/hasil_cutting", formData); // jangan set Content-Type
    alert("Hasil Cutting berhasil disimpan!");
    setShowForm(false);
    setHasilCutting({
      spk_cutting_id: "",
      foto_komponen: null,
      jumlah_komponen: "",
      hasil_markeran: [],
      hasil_bahan: [],
      spk_cutting_bagian_id: "", 
    });
  } catch (error) {
    console.error("Gagal simpan:", error.response?.data || error.message);

    if (error.response?.data?.errors) {
      console.table(error.response.data.errors);
    }

    alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan.");
  }
};



    const handleDetailClick = (hasil) => {
    setSelectedDetailHasil(hasil); // Simpan data hutang yang dipilih
  }
  const handleDetailClickBagian = (bagian) => {
    setSelectedDetailBagian(bagian); // Simpan data hutang yang dipilih
  }

  return (
   <div>
       <div className="penjahit-container">
         <h1>Data Hasil Cutting</h1>
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
                 <th>Id Hasil Cutting</th>
                 <th>id spk cutting</th>
                 <th>nama produk </th>
                 <th>jumlah komponen</th>
                 <th>Status Perbandingan</th>
                  <th>Jumlah </th>
                  <th>Tanggal input</th>
                 <th>Hasil Marker</th>
                 <th>Hasil Jenis Bagian</th>
                
                
              
   
               </tr>
             </thead>
             <tbody>
               {filteredHasil.map((h) => (
                 <tr key={h.id}>
                   <td data-label="Id : ">{h.id}</td>
                   <td data-label="id spk cutting : ">{h.spk_cutting_id}</td>
                   <td data-label="harga jasa : ">{h.nama_produk}</td>
                   <td data-label="harga jasa : ">{h.jumlah_komponen}</td>
                   <td data-label="Status Perbandingan">{h.status_perbandingan_agregat}</td>
                   <td data-label="Status Perbandingan">{h.total_hasil_pendapatan }</td>
                     <td data-label="htanggal : ">
                      {new Date(h.created_at).toLocaleDateString("id-ID")}
                    </td>

                   <td>
                        <div className="action-card">
                         <button 
                            className="btn1-icon" 
                            onClick={() => handleDetailClick(h)}
                        >
                        <FaInfoCircle className="icon" />
                     </button>
                      </div>
                   </td>
                    <td>
                        <div className="action-card">
                         <button 
                            className="btn1-icon" 
                            onClick={() => handleDetailClickBagian(h)}
                        >
                        <FaInfoCircle className="icon" />
                     </button>
                      </div>
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
      <h2>Tambah Hasil Cutting</h2>
      <form onSubmit={handleFormSubmit} className="modern-form" encType="multipart/form-data">
        
        {/* Pilih SPK Cutting */}
        <div className="form-group">
          <label>SPK Cutting:</label>
          <select
            name="spk_cutting_id"
            value={hasilCutting.spk_cutting_id}
            onChange={handleInputChange}
            required
          >
            <option value="">Pilih SPK Cutting</option>
            {spkCuttingList.map((spk) => (
              <option key={spk.id} value={spk.id}>
                {spk.id} - {spk.produk?.nama_produk} - {spk.id_spk_cutting}
              </option>
            ))}
          </select>
        </div>

      

        {/* Upload Foto Komponen */}
        <div className="form-group">
          <label>Foto Komponen:</label>
          <input
            type="file"
            name="foto_komponen"
            accept="image/*"
            onChange={(e) =>
              setHasilCutting({ ...hasilCutting, foto_komponen: e.target.files[0] })
            }
          />
        </div>

        {/* Jumlah Komponen */}
        <div className="form-group">
          <label>Jumlah Komponen:</label>
          <input
            type="number"
            name="jumlah_komponen"
            value={hasilCutting.jumlah_komponen}
            onChange={handleInputChange}
            required
          />
        </div>

        {/* Hasil Markeran */}
        <h3>Hasil Markeran</h3>
        {hasilCutting.hasil_markeran.map((markeran, index) => (
          <div key={index} className="form-subsection">
            <label>Komponen</label>
            <select
              value={markeran.nama_komponen}
              onChange={(e) => handleMarkeranChange(index, "nama_komponen", e.target.value)}
              required
            >
              <option value="">Pilih Komponen</option>
              {komponenList.map((komponen) => (
                <option key={komponen.id} value={komponen.nama_komponen}>
                  {komponen.nama_komponen}
                </option>
              ))}
            </select>

            <label>Total Panjang</label>
            <input
              type="number"
              placeholder="Total Panjang"
              value={markeran.total_panjang}
              onChange={(e) => handleMarkeranChange(index, "total_panjang", e.target.value)}
              required
            />

            <label>Jumlah Hasil</label>
            <input
              type="number"
              placeholder="Jumlah Hasil"
              value={markeran.jumlah_hasil}
              onChange={(e) => handleMarkeranChange(index, "jumlah_hasil", e.target.value)}
              required
            />

            <button type="button" onClick={() => removeMarkeran(index)}>
              Hapus Markeran
            </button>
          </div>
        ))}
        <button type="button" onClick={addMarkeran}>
          Tambah Markeran
        </button>

        {/* Hasil Bahan */}
        <h3>Hasil Bagian</h3>
        {hasilCutting.hasil_bahan.map((bahan, index) => (
          <div key={index} className="form-subsection">
            <label>Bagian</label>
            <select
              value={bahan.spk_cutting_bagian_id}
              onChange={(e) =>
                handleBahanChange(index, "spk_cutting_bagian_id", e.target.value)
              }
              required
            >
              <option value="">Pilih Bagian</option>
              {bagianList.map((bagian) => (
                <option key={bagian.id} value={bagian.id}>
                  {bagian.nama_bagian}
                </option>
              ))}
            </select>

            <label>Bahan</label>
            <select
              value={bahan.spk_cutting_bahan_id}
              onChange={(e) =>
                handleBahanChange(index, "spk_cutting_bahan_id", e.target.value)
              }
              required
            >
              <option value="">Pilih Bahan</option>
              {bahanList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama_bahan}
                </option>
              ))}
            </select>

            <label>Berat</label>
            <input
              type="number"
              placeholder="Berat"
              value={bahan.berat}
              onChange={(e) => handleBahanChange(index, "berat", e.target.value)}
            />

            <label>Hasil</label>
            <input
              type="number"
              placeholder="Hasil"
              value={bahan.hasil}
              onChange={(e) => handleBahanChange(index, "hasil", e.target.value)}
            />

            <button type="button" onClick={() => removeBahan(index)}>
              Hapus Bahan
            </button>
          </div>
        ))}
        <button type="button" onClick={addBahan}>
          Tambah Bagian
        </button>

  {/* Pilih Bagian Utama */}
        <div className="form-group">
          <label>Bagian Untuk Acuan Jumlah:</label>
          <select
            name="spk_cutting_bagian_id"
            value={hasilCutting.spk_cutting_bagian_id}
            onChange={handleInputChange}
            required
          >
            <option value="">Pilih Bagian</option>
            {bagianList.map((bagian) => (
              <option key={bagian.id} value={bagian.id}>
                {bagian.nama_bagian}
              </option>
            ))}
          </select>
        </div>
        {/* Tombol Aksi */}
        <div className="form-actions">
          <button type="submit" className="btn btn-submit">
            Simpan
          </button>
          <button type="button" className="btn btn-cancel" onClick={() => setShowForm(false)}>
            Batal
          </button>
        </div>
      </form>
    </div>
  </div>
)}


 {selectedDetailHasil && (
  <div className="modal-overlay" onClick={() => setSelectedDetailHasil(null)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Perbandingan Hasil Marker</h3>
        <button className="close-button" onClick={() => setSelectedDetailHasil(null)}>×</button>
      </div>

      <div className="modal-body">
        {selectedDetailHasil.markeran?.length > 0 ? (
          <table className="compare-table">
            <thead>
              <tr>
                <th>Komponen</th>
                <th>Panjang<br /><small>(Hasil / Standar)</small></th>
                <th>Jumlah<br /><small>(Hasil / Standar)</small></th>
                <th>Berat/pcs<br /><small>(Hasil / Standar)</small></th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedDetailHasil.markeran.map((item, index) => (
                <tr key={index}>
                  <td>{item.nama_komponen}</td>
                  <td>{item.hasil.total_panjang} / {item.standar?.total_panjang ?? '-'}</td>
                  <td>{item.hasil.jumlah_hasil} / {item.standar?.jumlah_hasil ?? '-'}</td>
                  <td>{item.hasil.berat_per_pcs} / {item.standar?.berat_per_pcs ?? '-'}</td>
                  <td className={`status ${item.status_perbandingan.replace(/\s/g, '-')}`}>
                    {item.status_perbandingan === 'lebih berat' && ' Lebih Berat'}
                    {item.status_perbandingan === 'lebih ringan' && ' Lebih Ringan'}
                    {item.status_perbandingan === 'sama' && ' Sama'}
                    {item.status_perbandingan === 'belum ada' && ' Belum Ada'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Tidak ada data markeran.</p>
        )}
      </div>
    </div>
  </div>
)}



{selectedDetailBagian && (
  <div className="modal-overlay" onClick={() => setSelectedDetailBagian(null)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Hasil Jenis Bagian</h3>
        <button className="close-button" onClick={() => setSelectedDetailBagian(null)}>×</button>
      </div>

      <div className="modal-body">
        {selectedDetailBagian.bahan_by_bagian?.length > 0 ? (
          <table className="compare-table">
            <thead>
              <tr>
                <th colSpan={selectedDetailBagian.bahan_by_bagian.length * 4} className="text-left">
                  JENIS BAGIAN
                </th>
              </tr>
              <tr>
                {selectedDetailBagian.bahan_by_bagian.map((bagian, index) => (
                  <th key={index} colSpan={4} className="text-center">
                    {bagian.nama_bagian}
                  </th>
                ))}
              </tr>
              <tr>
                {selectedDetailBagian.bahan_by_bagian.map((_, index) => (
                  <React.Fragment key={index}>
                    <th>Nama Bahan</th>
                    <th>Qty</th>
                    <th>Kg/Yard</th>
                    <th>Hasil</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead> /
            <tbody>
              {Array.from({
                length: Math.max(...selectedDetailBagian.bahan_by_bagian.map(b => b.bahan.length))
              }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {selectedDetailBagian.bahan_by_bagian.map((bagian, bagianIndex) => {
                    const bahan = bagian.bahan[rowIndex];
                    return (
                      <React.Fragment key={bagianIndex}>
                        <td>{bahan?.nama_bahan ?? '-'}</td>
                        <td>{bahan?.qty ?? '-'}</td>
                        <td>{bahan?.berat ?? '-'}</td>
                        <td>{bahan?.hasil ?? '-'}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Tidak ada data bahan.</p>
        )}
      </div>
    </div>
  </div>
)}



    </div>
  )
}

export default HasilCutting