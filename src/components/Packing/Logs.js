import React, { useEffect, useRef, useState } from "react";
import "./Logs.css";
import API from "../../api"; 
import { FaFileExcel, FaQrcode } from "react-icons/fa";
import { FiCheckCircle, FiLayers, FiSearch, FiUser } from "react-icons/fi";
import dayjs from "dayjs";

const formatRupiah = (value) => {
  const amount = Number(value || 0);

  return `Rp ${amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const formatWholeNumber = (value) => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return amount.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [singleDate, setSingleDate] = useState("");
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
  const tableScrollRef = useRef(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
  });

  const openDatePicker = (event) => {
    const input = event.currentTarget;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch (error) {
        // Ignore browsers that block repeated picker calls.
      }
    }
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
    setSingleDate("");
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
    setSingleDate("");
  };

  const handleSingleDateChange = (event) => {
    const selectedDate = event.target.value;

    setSingleDate(selectedDate);

    if (selectedDate) {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    }
  };

  
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

  const totalKasirAktif = kasirSummary.length;
  const scrollTable = (direction) => {
    if (!tableScrollRef.current) return;
    const amount = direction === "left" ? -320 : 320;
    tableScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const isRandomLog = (log) => log?.action === "scan_validasi_random";

  const getPackingRows = (log) => {
    if (isRandomLog(log)) {
      return (
        log.order?.packing_results?.flatMap((item) =>
          (item.serials || []).map((serial) => ({
            key: `${item.id}-${serial.id || serial.serial_number}`,
            sku: item.actual_sku,
            originalSku: item.original_sku,
            status: item.status,
            serial_number: serial.serial_number,
          }))
        ) || []
      );
    }

    return (
      log.order?.items?.flatMap((item) =>
        (item.serials || []).map((serial) => ({
          key: `${item.sku}-${serial.id || serial.serial_number}`,
          sku: item.sku,
          originalSku: null,
          status: "sesuai",
          serial_number: serial.serial_number,
        }))
      ) || []
    );
  };

  const getPackedTotalItems = (log) => {
    if (isRandomLog(log)) {
      const totalPackedQty = Number(log.order?.total_packed_qty || 0);
      if (Number.isFinite(totalPackedQty) && totalPackedQty > 0) {
        return totalPackedQty;
      }

      return (log.order?.packing_results || []).reduce(
        (sum, item) => sum + Number(item.scanned_qty || 0),
        0
      );
    }

    return Number(log.order?.total_qty || 0);
  };

  const getModeLabel = (log) => (isRandomLog(log) ? "Random" : "Normal");

  const getSerialPreview = (log) => getPackingRows(log).map((row) => row.serial_number).join(", ");

 return (
   <div className="pklog-page">
    <div className="pklog-shell">
      <section className="pklog-content">
        <header className="pklog-topbar">
          <div className="pklog-title-group">
            <div className="pklog-brand-icon"><FaQrcode /></div>
            <div>
              <h1>Logs Packing</h1>
              <p>Audit log proses packing, performa kasir, dan monitoring status order.</p>
            </div>
          </div>
        </header>

        <main className="pklog-main">
          <section className="pklog-card pklog-filter-card">
            <div className="pklog-filter-row">
              <div className="pklog-filter-date-stack">
                <span className="pklog-filter-label">Range Tanggal</span>
                <div className="pklog-filter-dates">
                  <input
                    type="date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    onClick={openDatePicker}
                    onFocus={openDatePicker}
                  />
                  <span className="pklog-dash">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    onClick={openDatePicker}
                    onFocus={openDatePicker}
                  />
                </div>
              </div>

              <div className="pklog-filter-date-stack pklog-filter-single-date">
                <span className="pklog-filter-label">1 Tanggal</span>
                <input
                  type="date"
                  value={singleDate}
                  onChange={handleSingleDateChange}
                  onClick={openDatePicker}
                  onFocus={openDatePicker}
                />
              </div>

              <div className="pklog-filter-search">
                <input
                  type="text"
                  placeholder="Cari Tracking Number..."
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  className="pklog-input-tracking"
                />
              </div>

              <div className="pklog-filter-selects">
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Semua Status</option>
                  <option value="READY_TO_SHIP">READY_TO_SHIP</option>
                  <option value="PAID">PAID</option>
                  <option value="SHIPPING">SHIPPING</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>

                <select value={performedBy} onChange={(e) => setPerformedBy(e.target.value)}>
                  <option value="">Semua Kasir</option>
                  {kasirList.map((u) => (
                    <option key={u.name} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="pklog-filter-actions">
                <button onClick={handleExport} className="pklog-btn pklog-btn-export" disabled={exporting}>
                  <FaFileExcel />
                  {exporting ? "Mengunduh..." : "Export Excel"}
                </button>

                <button onClick={handleFilter} className="pklog-btn pklog-btn-primary">
                  Tampilkan
                </button>
              </div>
            </div>
            {error && <div className="pklog-error">{error}</div>}
          </section>

          <section className="pklog-kpi-grid">
            <article className="pklog-kpi-card">
              <div className="pklog-kpi-head"><FiLayers /> Total Pesanan</div>
              <strong>
                {loadingSummary
                  ? "..."
                  : summary?.total_order_formatted ?? formatWholeNumber(summary?.total_order)}
              </strong>
              <small>order pada rentang tanggal</small>
            </article>
            <article className="pklog-kpi-card">
              <div className="pklog-kpi-head"><FiCheckCircle /> Total Produk</div>
              <strong>
                {loadingSummary
                  ? "..."
                  : summary?.total_items_formatted ?? formatWholeNumber(summary?.total_items)}
              </strong>
              <small>item berhasil dipacking</small>
            </article>
            <article className="pklog-kpi-card">
              <div className="pklog-kpi-head"><FiSearch /> Total Pendapatan</div>
              <strong>
                {loadingSummary
                  ? "..."
                  : formatRupiah(summary?.total_amount)}
              </strong>
              <small>akumulasi gross amount</small>
            </article>
            <article className="pklog-kpi-card">
              <div className="pklog-kpi-head"><FiUser /> Kasir Aktif</div>
              <strong>{formatWholeNumber(totalKasirAktif)}</strong>
              <small>kasir tercatat dalam periode</small>
            </article>
          </section>

          <section className="pklog-card pklog-kasir-card">
            <h3>Ringkasan Kasir</h3>
            {kasirSummary.length === 0 ? (
              <div className="pklog-empty">Tidak ada data kasir</div>
            ) : (
              <div className="pklog-kasir-wrap">
                <table className="pklog-kasir-table">
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
                        <td>{item.total_orders_formatted ?? formatWholeNumber(item.total_orders)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="pklog-card pklog-table-card">
            <div className="pklog-table-tools">
              <span>Geser tabel untuk melihat semua kolom</span>
              <div className="pklog-table-tools-btns">
                <button type="button" onClick={() => scrollTable("left")}>Geser Kiri</button>
                <button type="button" onClick={() => scrollTable("right")}>Geser Kanan</button>
              </div>
            </div>
            <div className="pklog-table-wrap" ref={tableScrollRef}>
              <div className="pklog-table-inner">
        <table className="pklog-table">
          <thead>
            <tr>
              <th>Tracking Number</th>
              <th>Mode</th>
              <th>Kasir</th>
              <th>Total Item</th>
              <th>Total Harga</th>
              <th>Tanggal / Jam</th>
              <th>Nomor Seri</th>
              <th>Status</th>
              <th>Aksi</th>
            
            
            
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="pklog-empty">Memuat data...</td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={9} className="pklog-empty">Tidak ada data log pada filter ini.</td>
              </tr>
            )}
            {logs.map((tc) => (
              <tr key={tc.id}>
                <td>{tc.order?.tracking_number}</td>
                <td>{getModeLabel(tc)}</td>
                <td>{tc.performed_by}</td>
                <td>{tc.total_items_formatted ?? formatWholeNumber(getPackedTotalItems(tc))}</td>
                <td>{formatRupiah(tc.order?.total_amount)}</td>
                <td>
                  <div className="pklog-date-time">
                    <span>{dayjs(tc.created_at).format("DD-MM-YYYY")}</span>
                    <small>{dayjs(tc.created_at).format("HH:mm:ss")}</small>
                  </div>
                </td>

                <td>{getSerialPreview(tc)}</td>
                <td>{tc.order?.status}</td>
                  <td>
                    <button className="pklog-btn-detail" onClick={() => handleOpenModal(tc)}>
                    Detail
                    </button>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
              </div>
            </div>
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
          </section>


 {showModal && selectedLogs && (
       <div className="pklog-modal-overlay">
    <div className="pklog-modal-content">
         
            <h3>Detail Nomor Seri - ID Logs #{selectedLogs.id}</h3>
            <div className="pklog-modal-table-wrap">
            <table className="pklog-modal-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Nomor Seri</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
             {getPackingRows(selectedLogs).map((item) => (
                <tr key={item.key}>
                  <td>
                    {item.sku}
                    {item.originalSku && item.originalSku !== item.sku ? ` (asli: ${item.originalSku})` : ""}
                  </td>
                  <td>{item.serial_number}</td>
                  <td>{item.status}</td>
                </tr>
              ))}


              </tbody>
            </table>
            </div>
            <button className="pklog-btn pklog-btn-primary" onClick={handleCloseModal}>Tutup</button>
          </div>
     </div>
  )}

        </main>
      </section>
    </div>
   </div>
  );
};

export default Logs;
