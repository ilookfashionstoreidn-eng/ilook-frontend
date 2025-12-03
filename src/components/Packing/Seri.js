import React, { useEffect, useState } from "react";
import "../Jahit/Penjahit.css";
import API from "../../api";

const Seri = () => {
  const [seri, setSeri] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newSeri, setNewSeri] = useState({
    nomor_seri: ""
  });

  useEffect(() => {
    const fetchSeri = async () => {
      try {
        setLoading(true);
        const response = await API.get("/seri"); 
        setSeri(response.data);
      } catch (error) {
        setError("Gagal mengambil data seri");
      } finally {
        setLoading(false);
      }
    };
    fetchSeri();
  }, []);

const downloadQR = async (id, nomorSeri) => {
  try {
    const response = await API.get(`/seri/${id}/download`, {
      responseType: "blob", 
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `qr-${nomorSeri}.svg`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading file:", error);
  }
};

const handleFormSubmit = async (e) => {
  e.preventDefault();

  console.log("Data yang dikirim:", newSeri.nomor_seri);

  const formData = new FormData();
  formData.append("nomor_seri", newSeri.nomor_seri);

  try {
    const response = await API.post("/seri", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    alert("Seri berhasil ditambahkan!");
    setSeri((prev) => [...prev, response.data]);
    setShowForm(false);
    setNewSeri({ nomor_seri: "" });

  } catch (error) {
    console.error("Error:", error.response?.data?.message || error.message);
    alert(error.response?.data?.message || "Terjadi kesalahan saat menambahkan seri.");
  }
};


  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSeri((prev) => ({
        ...prev,
        [name]: value, 
    }));
};



  return (
    <div>
      <div className="penjahit-container">
        <h1>Data Seri</h1>
      </div>

      <div className="table-container">
        <div className="filter-header1">
          <button onClick={() => setShowForm(true)}>Tambah</button>

          <div className="search-bar1">
            <input
              type="text"
              placeholder="Cari nomor seri..."
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
                <th>Nomor Seri</th>
                <th>QR Code</th>
                <th>Download</th>
              </tr>
            </thead>

            <tbody>
              {seri
                .filter((item) =>
                  item.nomor_seri
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
                )
                .map((item) => (
                  <tr key={item.id}>
                    <td data-label="Id:">{item.id}</td>
                    <td data-label="Nomor Seri:">{item.nomor_seri}</td>

                    <td data-label="QR:">
                      <img
                        src={`data:image/svg+xml;base64,${item.qr_svg_base64}`}
                        alt="QR"
                        width="80"
                      />
                    </td>

                  <td>
                <button
                  onClick={() => downloadQR(item.id, item.nomor_seri)}
                  style={{
                    padding: "6px 12px",
                    background: "black",
                    color: "white",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Download QR
                </button>
              </td>

                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Tambah Aksesoris </h2>
            <form onSubmit={handleFormSubmit} className="modern-form">
              <div className="form-group">
                <label>Nomor Seri:</label>
                <input
                  type="text"
                  name="nomor_seri"
                  value={newSeri.nomor_seri}
                  onChange={handleInputChange}
                  placeholder="Masukkan nomor_seri"
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

export default Seri;
