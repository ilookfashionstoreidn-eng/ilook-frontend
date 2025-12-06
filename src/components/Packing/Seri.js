import React, { useEffect, useState } from "react";
import "../Jahit/Penjahit.css";
import API from "../../api";

const Seri = () => {
  const [seri, setSeri] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState([]);
const [currentPage, setCurrentPage] = useState(1);
const [lastPage, setLastPage] = useState(1);
  const [newSeri, setNewSeri] = useState({
  nomor_seri: "",
  sku: ""
  });


  const fetchSeri = async (page = 1) => {
    try {
      setLoading(true);
      const response = await API.get(`/seri?page=${page}`); // UPDATED

      setSeri(response.data.data);        // updated: hanya ambil array
      setCurrentPage(response.data.current_page);
      setLastPage(response.data.last_page);

    } catch (error) {
      setError("Gagal mengambil data seri");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeri(1);
  }, []);

const downloadQR = async (id, nomorSeri) => {
  try {
    const response = await API.get(`/seri/${id}/download`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `qr-seri-${nomorSeri}.pdf`);
    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Error downloading file:", error);
    alert("Gagal mengunduh file.");
  }
};


const handleFormSubmit = async (e) => {
  e.preventDefault();

  console.log("Data yang dikirim:", newSeri.nomor_seri);

  const formData = new FormData();
    formData.append("nomor_seri", newSeri.nomor_seri);
    formData.append("sku", newSeri.sku);


  try {
    const response = await API.post("/seri", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    alert("Seri berhasil ditambahkan!");
    setSeri((prev) => [...prev, response.data]);
    setShowForm(false);
    setNewSeri({
      nomor_seri: "",
      sku: ""
    });


  } catch (error) {
    console.error("Error:", error.response?.data?.message || error.message);
    alert(error.response?.data?.message || "Terjadi kesalahan saat menambahkan seri.");
  }
};


  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSeri((prev) => ({
        ...prev,
        [name]: value.toUpperCase(), 
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
                <th>SKU</th>
                <th>Download</th>
              </tr>
            </thead>

            <tbody>
              {seri
                .filter((item) =>
                 (item.nomor_seri ?? "").toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((item) => (
                  <tr key={item.id}>
                    <td data-label="Id:">{item.id}</td>
                    <td data-label="Nomor Seri:">{item.nomor_seri}</td>
                  <td data-label="SKU:">{item.sku}</td>
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

            
            <div className="pagination">
  <button
    disabled={currentPage === 1}
    onClick={() => fetchSeri(currentPage - 1)}
  >
    Prev
  </button>

  <span>
    Halaman {currentPage} / {lastPage}
  </span>

  <button
    disabled={currentPage === lastPage}
    onClick={() => fetchSeri(currentPage + 1)}
  >
    Next
  </button>
</div>

        </div>

        {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h2>Tambah Seri dan SKU </h2>
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

              <div className="form-group">
                <label>SKU:</label>
                <input
                  type="text"
                  name="sku"
                  value={newSeri.sku}
                  onChange={handleInputChange}
                  placeholder="Masukkan SKU"
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
