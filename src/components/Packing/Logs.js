import React, { useEffect, useState } from "react"
import "../Jahit/Penjahit.css";
import API from "../../api"; 
import {FaInfoCircle,FaFileExcel,FaQrcode, FaCalendarAlt } from 'react-icons/fa';
import dayjs from "dayjs";

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [selectedLogs, setSelectedLogs] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [tracking, setTracking] = useState("");
  const [kasirList, setKasirList] = useState([]);
  const [performedBy, setPerformedBy] = useState("");
  const [kasirSummary, setKasirSummary] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
  });

  
const fetchLogs = async (
  start = startDate,
  end = endDate,
  stat = status,
  page = 1
) => {
  try {
    setLoading(true);
    const response = await API.get("/orders/logs", {
      params: {
        page: page,
        start_date: start,
        end_date: end,
         performed_by: performedBy,
        ...(stat && { status: stat }),
        ...(tracking && { tracking_number: tracking }),
      },
    });

    setLogs(response.data.data); 
    setPagination({
      current_page: response.data.current_page,
      last_page: response.data.last_page,
    });

  } catch (error) {
    setError("Gagal mengambil data logs.");
  } finally {
    setLoading(false);
  }
};

 
  const fetchSummary = async (
    start = today,
    end = today,
    stat = status,
    performed = performedBy,
    track = tracking
  ) => {
    try {
      setLoadingSummary(true);
      const response = await API.post("/orders/summary", {
        start_date: start,
        end_date: end,
       ...(stat && { status: stat }),
       ...(performed && { performed_by: performed }),
       ...(track && { tracking_number: track }),


      });
      if (response.data.data.length > 0) {
        setSummary(response.data.data[0]);
      } else {
        setSummary({ total_order: 0, total_items: 0, total_amount: 0 });
      }
      setKasirSummary(response.data.kasir_summary || []);
    } catch (error) {
      console.error(error);
      setError("Gagal mengambil summary.");
    } finally {
      setLoadingSummary(false);
    }
  };

 useEffect(() => {
  setStartDate(today);
  setEndDate(today);
  fetchLogs(today, today); 
  fetchSummary(today, today);
}, []);


  const handleFilter = () => {
    if (!startDate || !endDate) {
      alert("Silakan pilih tanggal awal dan akhir!");
      return;
    }

  fetchSummary(startDate, endDate, status, performedBy, tracking);
  fetchLogs(startDate, endDate, status, 1);

};

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await API.get("/orders/logs/export", {
        responseType: "blob",
        params: {
          start_date: startDate,
          end_date: endDate,
           status: status || null,
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `logs_order_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error("Gagal export:", error);
      alert("Gagal mengunduh file Excel.");
    } finally {
      setExporting(false);
    }
  };

  const handleOpenModal = (item) => {
  setSelectedLogs(item);
  setShowModal(true);
};
const handleCloseModal = () => {
  setShowModal(false);
  setSelectedLogs(null);
};


useEffect(() => {
  API.get('/users/kasir')
    .then(res => setKasirList(res.data))
    .catch(err => console.log(err));
}, []);

const inputDate = "2025-11-26T10:36:08.000000Z";
const date = new Date(inputDate);

const formatted =
  date.getDate().toString().padStart(2, "0") + "-" +
  (date.getMonth() + 1).toString().padStart(2, "0") + "-" +
  date.getFullYear();

console.log(formatted); // 26-11-2025

 return (
   <div>
     <div className="seri-page">
      <div className="seri-header">
        <div className="seri-header-icon">
          <FaQrcode />
        </div>
        <h1>Logs Packing</h1>
    </div>

     <div className="table-container">
 
         <div className="logs-container">
      

      <div className="filter-container">
        <div className="filter-group">
          
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <label>
            -
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
         <input
              type="text"
              placeholder="Cari Tracking Number..."
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              className="input-tracking"
          />

          
          {/* ✅ Dropdown status */}
          <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="READY_TO_SHIP">READY_TO_SHIP</option>
            <option value="PAID">PAID</option>
            <option value="SHIPPING">SHIPPING</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>


          <select 
            value={performedBy}
            onChange={(e) => setPerformedBy(e.target.value)}
          >
            <option value=""> Semua Kasir </option>
            {kasirList.map(u => (
              <option key={u.name} value={u.name}>{u.name}</option>
            ))}
          </select>

      
          <button
                onClick={handleExport}
                className="btn-export"
                disabled={exporting}
              >
              <FaFileExcel style={{ marginRight: 6 }} />
              {exporting ? "Mengunduh..." : "Export Excel"}
          </button>

      


          <button onClick={handleFilter} className="btn-summary">
            Tampilkan
          </button>
        </div>
        
      </div>

  
      <div className="summary-cards">
        <div className="card-summary card-blue">
          <h3>Total Pesanan</h3>
          <p>{loadingSummary ? "..." : summary?.total_order || 0}</p>
        </div>

        <div className="card-summary card-green">
          <h3>Total Produk</h3>
          <p>{loadingSummary ? "..." : summary?.total_items || 0}</p>
        </div>

        <div className="card-summary card-orange">
          <h3>Total Pendapatan Kotor</h3>
          <p>
            {loadingSummary
              ? "..."
              : `Rp ${parseFloat(summary?.total_amount || 0).toLocaleString(
                  "id-ID"
                )}`}
          </p>
        </div>

       <div className="card-summary card-white">
          {kasirSummary.length === 0 ? (
            <div className="kasir-empty">
              Tidak ada data kasir
            </div>
          ) : (
            <table className="kasir-table">
              <thead>
                <tr>
                  <th>Kasir</th>
                  <th>Pesanan</th>
                </tr>
              </thead>
              <tbody>
                {kasirSummary.map((item) => (
                  <tr key={item.performed_by}>
                    <td>{item.performed_by}</td>
                    <td>{item.total_orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>


      </div>
      </div>


      <div className="summary-cards">
       
      </div>


      </div>
        <div className="table-container">
        <table className="penjahit-table">
          <thead>
            <tr>
              <th>Tracking Number</th>
              <th>Kasir</th>
              <th>Total Item</th>
              <th>Total Harga</th>
              <th>Tanggal</th>
              <th>Nomor Seri</th>
              <th>Status</th>
              <th>Aksi</th>
            
            
            
            </tr>
          </thead>
          <tbody>
            {logs.map((tc) => (
              <tr key={tc.id}>
                <td data-label="tracking number : ">{tc.order?.tracking_number}</td>
                <td data-label="Kasir : ">{tc.performed_by}</td>
                <td data-label="Total : ">{tc.order?.total_items}</td>
                <td data-label="Total : ">Rp. {tc.order?.total_amount}</td>
               <td data-label="tanggal : ">
                  {dayjs(tc.created_at).format("DD-MM-YYYY")}
                </td>

                <td data-label="Nomor Seri : ">
                {tc.order?.items
                  ?.flatMap((it) => it.serials?.map((s) => s.serial_number))
                  .join(", ")}

                                </td>
                <td data-label="Status : ">{tc.order?.status}</td>
                 <td data-label="No Seri:">
                  <button className="link-button blue" onClick={() => handleOpenModal(tc)}>
                    Detail Nomor Seri
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">

        <button
          disabled={pagination.current_page === 1}
          onClick={() =>
            fetchLogs(startDate, endDate, status, pagination.current_page - 1)
          }
        >
          Prev
        </button>

        <span>
          Page {pagination.current_page} / {pagination.last_page}
        </span>

        <button
          disabled={pagination.current_page === pagination.last_page}
          onClick={() =>
            fetchLogs(startDate, endDate, status, pagination.current_page + 1)
          }
        >
          Next
        </button>
      </div>
    </div>


 {showModal && selectedLogs && (
       <div className="modal-pengiriman">
    <div className="modal-content-pengiriman">
         
            <h3>Detail Nomor Seri - ID Logs #{selectedLogs.id}</h3>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                 <th>Nomor Seri</th>
                </tr>
              </thead>
              <tbody>
             {selectedLogs.order?.items?.map((item) =>
              item.serials?.map((serial) => (
                <tr key={serial.serial_number}>
                  <td>{item.sku}</td>
                  <td>{serial.serial_number}</td>
                </tr>
              ))
            )}


              </tbody>
            </table>
            <button onClick={handleCloseModal}>Tutup</button>
          </div>
     </div>
  )}

</div>
</div>
  );
};

export default Logs
