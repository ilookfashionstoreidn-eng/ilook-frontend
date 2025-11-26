import React, { useEffect, useState } from "react";
import "./Penjahit.css";
import API from "../../api"; 
import {FaInfoCircle, FaPlus, FaEdit, FaClock } from 'react-icons/fa';
import { QRCodeCanvas } from 'qrcode.react';
import { QRCodeSVG } from 'qrcode.react';


const PesananPetugasC = () => {
    const [petugasC, setPetugasC] = useState({
      data: [],
      current_page: 1,
      last_page: 1,
    });

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showForm, setShowForm] = useState(false);  
    const [showFormPetugasD, setShowFormPetugasD] = useState(false); 
    const [selectedPesanan, setSelectedPesanan] = useState(null);
    const [penjahitList, setPenjahitList] = useState([]);
    const [aksesorisList, setAksesorisList] = useState([]);
    const [verifikasiList, setVerifikasiList] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState("");


    const [newData, setNewData] = useState({
      penjahit_id: "",
      detail_pesanan: [], 
    });
  const [newDataPetugasD, setNewDataPetugasD] = useState({
      petugas_c_id: "",
      barcode: [], 
      bukti_nota: null,
    });

  

useEffect(() => {
    const fetchPetugasC = async () => {
        try {
            setLoading(true);
            const response = await API.get('/petugas-c');
            setPetugasC(response.data);
        }catch (error){
            setError("Gagal mengambil data");
        }finally{
            setLoading(false);
        }
    }
    fetchPetugasC();
}, []);

const handleOpenModal = (item) => {
  setSelectedPesanan(item);
  setShowModal(true);
};

const handleCloseModal = () => {
  setShowModal(false);
  setSelectedPesanan(null);
};


const handleFormSubmit = async (e) => {
  e.preventDefault();

  const userId = localStorage.getItem("userId");

  if (!userId) {
    alert("User tidak ditemukan. Silakan login ulang.");
    return;
  }

  // Buat payload untuk dikirim ke backend
  const payload = {
    user_id: userId,
    penjahit_id: newData.penjahit_id,
    detail_pesanan: newData.detail_pesanan, // array of { aksesoris_id, jumlah_dipesan }
  };
  
  console.log("Payload yang dikirim:", payload);
  try {
    const response = await API.post("/petugas-c", payload);

    console.log("Pesanan berhasil disimpan:", response.data);
    alert("Pesanan berhasil disimpan!");

 setPetugasC((prev) => ({
  ...prev,
  data: [...(prev.data || []), response.data]
}));

    setNewData({
      penjahit_id: "",
      detail_pesanan: [],
    });

 
    setShowForm(false);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    alert(error.response?.data?.error || "Gagal menyimpan pesanan.");
  }
};



useEffect(() => {
  // Fetch data penjahit
  const fetchPenjahitList = async () => {
    try {
      const response = await API.get("/penjahit"); // Sesuaikan dengan endpoint API penjahit
      setPenjahitList(response.data);
    } catch (error) {
      console.error("Error fetching penjahit list:", error);
    }
  };

  // Fetch data aksesoris
  const fetchAksesorisList = async () => {
    try {
      const response = await API.get("/aksesoris"); // Sesuaikan dengan endpoint API aksesoris
      setAksesorisList(response.data);
    } catch (error) {
      console.error("Error fetching aksesoris list:", error);
    }
  };

  fetchPenjahitList();
  fetchAksesorisList();
}, []); // Hanya jalankan sekali ketika komponen di-render



// Fungsi untuk menangani perubahan input
const handleInputChange = (e) => {
  const { name, value } = e.target;

  // Menangani perubahan input untuk form utama (penjahit_id, jumlah, harga_satuan, dll)
  if (name !== "detail_pesanan") {
    setNewData({
      ...newData,
      [name]: value,
    });
  }
};

// Fungsi untuk menangani perubahan dalam detail pesanan (aksesoris_id, jumlah_dipesan)
const handleDetailChange = (index, field, value) => {
  const updatedDetails = [...newData.detail_pesanan];
  updatedDetails[index][field] = value;
  setNewData({
    ...newData,
    detail_pesanan: updatedDetails,
  });
};
const handleRemoveDetail = (index) => {
  const updatedDetails = newData.detail_pesanan.filter((_, i) => i !== index);
  setNewData({ ...newData, detail_pesanan: updatedDetails });
};
const handleAddDetail = () => {
  setNewData({
    ...newData,
    detail_pesanan: [
      ...newData.detail_pesanan,
      { aksesoris_id: "", jumlah_dipesan: "" },
    ],
  });
};


const handlePetugasDFormSubmit = async (e) => {
  e.preventDefault();

  const userId = localStorage.getItem("userId");

  if (!userId) {
    alert("User tidak ditemukan. Silakan login ulang.");
    return;
  }

  if (newDataPetugasD.barcode.length !== selectedPesanan.jumlah_dipesan) {
    alert(`Jumlah barcode harus sama dengan ${selectedPesanan.jumlah_dipesan}`);
    return;
  }

  const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("petugas_c_id", selectedPesanan.id);

    newDataPetugasD.barcode.forEach((code, index) => {
      formData.append(`barcode[${index}]`, code);
    });

    if (newDataPetugasD.bukti_nota) {
      formData.append("bukti_nota", newDataPetugasD.bukti_nota);
    }

  try {
    const response = await API.post("/verifikasi-aksesoris", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("Verifikasi berhasil disimpan:", response.data);
    alert("Verifikasi berhasil disimpan!");

    setVerifikasiList((prev) => [...prev, response.data]);

    // reset
    setNewDataPetugasD({
      barcode: [],
      bukti_nota: null,
    });

    setShowFormPetugasD(false);

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    alert(error.response?.data?.error || "Gagal menyimpan verifikasi.");
  }
};


const handleOpenPetugasDForm = (petugasC) => {
  if (petugasC.status === 'pending') {
    setSelectedPesanan(petugasC);
    setShowFormPetugasD(false);  // Menyembunyikan form Petugas C
    setShowFormPetugasD(true);   // Menampilkan form Petugas D
  }
};
const handleBarcodeChange = (e) => {
  setBarcodeInput(e.target.value); // hanya update input sementara
};


const addBarcode = () => {
  const trimmedBarcode = barcodeInput.trim();
  if (trimmedBarcode && !newDataPetugasD.barcode.includes(trimmedBarcode)) {
    setNewDataPetugasD((prev) => ({
      ...prev,
      barcode: [...prev.barcode, trimmedBarcode],
    }));
    setBarcodeInput(""); // reset input setelah ditambahkan
  }
};



const handleBarcodeScan = async () => {
  const scanned = barcodeInput.trim();
  if (!scanned) return;

  try {
    // Cek barcode ke backend
    const res = await API.get(`/cek-barcode/${scanned}`);
    const aksesorisScan = res.data.aksesoris_id;

    // Ambil daftar aksesoris valid dari pesanan
    const aksesorisValid = selectedPesanan.detail_pesanan.map(
      (dp) => dp.aksesoris_id
    );

    // Jika barcode bukan aksesoris yang dipesan
    if (!aksesorisValid.includes(aksesorisScan)) {
      alert("❌ Barcode ini untuk aksesoris yang berbeda dari pesanan!");
      setBarcodeInput("");
      return;
    }

  } catch (error) {
    alert("❌ Barcode tidak ditemukan di stok aksesoris!");
    setBarcodeInput("");
    return;
  }

  // Barcode valid → masukkan
  if (newDataPetugasD.barcode.includes(scanned)) {
    alert("⚠ Barcode sudah pernah ditambahkan!");
  } else if (newDataPetugasD.barcode.length >= selectedPesanan.jumlah_dipesan) {
    alert("⚠ Jumlah barcode sudah penuh sesuai pesanan!");
  } else {
    setNewDataPetugasD(prev => ({
      ...prev,
      barcode: [...prev.barcode, scanned],
    }));
  }

  setBarcodeInput(""); // reset
};


const fetchPage = async (page) => {
  const response = await API.get(`petugas-c?page=${page}`);
  setPetugasC(response.data);
};



  return (
    <div>
    <div className="penjahit-container">
      <h1>Pembelian Aksesoris CMT</h1>
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
           
          />
        </div>
      </div>
      
        <div className="table-container">
        <table className="penjahit-table">
          <thead>
            <tr>
              
              <th>Nama Petugas </th>
              <th>penjahit</th>
              <th>Jumlah barang</th>
              <th>Total Harga</th>
             
               <th>Waktu</th>
             <th> Pesanan</th>
              <th>Status</th>
            

            </tr>
          </thead>
          <tbody>
            {petugasC.data?.map((petugasC) => (
              <tr key={petugasC.id}>
                
                <td data-label="User : ">{petugasC.user?.name || 'Tidak Diketahui'}</td>
                <td data-label="Penjahit  : ">{petugasC.penjahit?.nama_penjahit || 'Tidak Diketahui'}</td>
                <td data-label="Banyak : ">{petugasC.jumlah_dipesan}</td>
                <td data-label="Harga Satuan : ">
                     Rp {Number(petugasC.total_harga).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                </td>
               
                 <td data-label="Waktu:">
                  {new Date(petugasC.created_at).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  {new Date(petugasC.created_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>



                <td data-label="Pesanan:">
                  <button className="link-button blue" onClick={() => handleOpenModal(petugasC)}>
                    Detail Pesanan
                  </button>
                </td>

                 <td data-label="Status:">
                  {petugasC.status === "pending" ? (
                    <button
                      className="link-button green"
                      onClick={() => handleOpenPetugasDForm(petugasC)}
                    >
                      Verifikasi
                    </button>
                  ) : (
                    <span
                      className={`status-link ${petugasC.status} ${
                        petugasC.status === "pending" ? "underline" : ""
                      }`}
                    >
                      {petugasC.status}
                    </span>
                  )}
                </td>



              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
    <button 
      disabled={petugasC.current_page === 1}
      onClick={() => fetchPage(petugasC.current_page - 1)}
    >
      Prev
    </button>

    <span>Halaman {petugasC.current_page} / {petugasC.last_page}</span>

    <button 
      disabled={petugasC.current_page === petugasC.last_page}
      onClick={() => fetchPage(petugasC.current_page + 1)}
    >
      Next
    </button>
  </div>

        </div>
 </div>




   
 {/* Modal */}
 {showModal && selectedPesanan && (
       <div className="modal-pengiriman">
    <div className="modal-content-pengiriman">
         
            <h3>Detail Pesanan - ID #{selectedPesanan.id}</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Aksesoris ID</th>
                  <th>Jumlah Dipesan</th>
                </tr>
              </thead>
              <tbody>
                {selectedPesanan.detail_pesanan.map((dp, i) => (
                  <tr key={i}>
                    <td>{dp.aksesoris.id}</td>
                    <td>{dp.aksesoris.nama_aksesoris}</td>
                    <td>{dp.jumlah_dipesan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleCloseModal}>Tutup</button>
          </div>
     </div>
  )}




        {/* Modal Form */}
        {showForm && (
      <div className="modal">
        <div className="modal-content">
          <h2>Tambah Pesanan</h2>
          <form onSubmit={handleFormSubmit} className="modern-form">
            {/* PENJAHIT ID (Dropdown dari daftar penjahit) */}
            <div className="form-group">
          <label>Petugas:</label>
          <input
            type="text"
            value={localStorage.getItem("userId")} // Mengambil user_id dari localStorage
            disabled
          />
        </div>
            <div className="form-group">
              <label>Pilih Penjahit:</label>
              <select
                name="penjahit_id"
                value={newData.penjahit_id}
                onChange={handleInputChange}
                required
              >
                <option value="">-- Pilih Penjahit --</option>
                {penjahitList.map((penjahit) => (
                  <option key={penjahit.id_penjahit} value={penjahit.id_penjahit}>
                    {penjahit.nama_penjahit}
                  </option>
                ))}
              </select>

            </div>

            {/* DETAIL PESANAN */}
            <div className="form-group">
              <label>Detail Pesanan:</label>
              {newData.detail_pesanan.map((item, index) => (
                <div key={index} className="detail-item">
                  <div>
                    {/* Aksesoris ID */}
                    <label>Aksesoris:</label>
                    <select
                      name={`aksesoris_id-${index}`}
                      value={item.aksesoris_id}
                      onChange={(e) =>
                        handleDetailChange(index, "aksesoris_id", e.target.value)
                      }
                      required
                    >
                      <option value="">-- Pilih Aksesoris --</option>
                      {aksesorisList.map((aksesoris) => (
                        <option key={aksesoris.id} value={aksesoris.id}>
                          {aksesoris.nama_aksesoris}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    {/* Jumlah Dipesan */}
                    <label>Jumlah Dipesan:</label>
                    <input
                      type="number"
                      name={`jumlah_dipesan-${index}`}
                      value={item.jumlah_dipesan}
                      onChange={(e) =>
                        handleDetailChange(index, "jumlah_dipesan", e.target.value)
                      }
                      placeholder="Masukkan jumlah"
                      required
                    />
                  </div>

                  {/* Hapus detail pesanan */}
                  <button
                    type="button"
                    onClick={() => handleRemoveDetail(index)}
                    className="btn btn-remove"
                  >
                    Hapus
                  </button>
                </div>
              ))}
              {/* Tambah detail pesanan */}
              <button type="button" onClick={handleAddDetail} className="btn btn-add">
                Tambah Detail Pesanan
              </button>
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


{showFormPetugasD && selectedPesanan && (
  <div className="modal">
    <div className="modal-content verif-modal">
      <h2 className="verif-title">Verifikasi Pesanan Aksesoris</h2>

      <div className="verif-section">
        <label className="verif-label">Petugas</label>
        <input
          type="text"
          value={localStorage.getItem("userId")}
          disabled
          className="verif-input disabled"
        />
      </div>
      {/* Informasi pesanan */}
<div className="info-box">
  <p>
    <strong>Penjahit:</strong> {selectedPesanan.penjahit?.nama_penjahit}
  </p>

  <p>
    <strong>Total Item:</strong> {selectedPesanan.jumlah_dipesan}
  </p>

  <p><strong>Detail Aksesoris:</strong></p>
  <ul>
    {selectedPesanan.detail_pesanan.map((dp, index) => (
      <li key={index}>
        {dp.aksesoris.nama_aksesoris} — {dp.jumlah_dipesan} pcs
      </li>
    ))}
  </ul>
</div>


      <div className="verif-section">
        <label className="verif-label">Scan Barcode</label>

        <input
          type="text"
          className="verif-input"
          placeholder="Scan barcode di sini..."
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleBarcodeScan();
            }
          }}
          autoFocus
        />

        <small className="hint-text">
          Arahkan scanner ke input ini dan tekan Enter setelah scan.
        </small>
      </div>

      {/* PROGRESS */}
      <div className="progress-container">
        <div className="progress-info">
          {newDataPetugasD.barcode.length} dari {selectedPesanan.jumlah_dipesan} barcode
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width:
                (newDataPetugasD.barcode.length / selectedPesanan.jumlah_dipesan) *
                  100 +
                "%",
            }}
          ></div>
        </div>
      </div>
      

      <div className="verif-section">
        <label className="verif-label">Barcode Masuk</label>

        <div className="barcode-list">
          {newDataPetugasD.barcode.map((code, i) => (
            <span key={i} className="barcode-chip">
              {code}
            </span>
          ))}

          {newDataPetugasD.barcode.length === 0 && (
            <p className="empty-text">Belum ada barcode.</p>
          )}
        </div>
      </div>
      
  <div className="verif-section">
  <label className="verif-label">Upload Bukti Nota</label>

  <input
    type="file"
    accept="image/*,application/pdf"
    className="verif-input"
    onChange={(e) =>
      setNewDataPetugasD((prev) => ({
        ...prev,
        bukti_nota: e.target.files[0], 
      }))
    }
  />

  <small className="hint-text">Format: JPG, PNG, atau PDF</small>

  {newDataPetugasD.bukti_nota && (
    <p className="file-preview">
      File dipilih: {newDataPetugasD.bukti_nota.name}
    </p>
  )}
</div>


      {/* ACTION BUTTONS */}
      <div className="verif-actions">
        <button
          className={`btn-submit2 ${
            newDataPetugasD.barcode.length === selectedPesanan.jumlah_dipesan
              ? ""
              : "disabled"
          }`}
          disabled={
            newDataPetugasD.barcode.length !== selectedPesanan.jumlah_dipesan
          }
          onClick={handlePetugasDFormSubmit}
        >
          ✔ Verifikasi
        </button>

        <button className="btn-cancel2" onClick={() => setShowFormPetugasD(false)}>
          ✖ Batal
        </button>
      </div>
    </div>
  </div>
)}





    </div>
  );
}

export default PesananPetugasC