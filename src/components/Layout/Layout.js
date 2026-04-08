import React, { useState, useEffect, useCallback } from "react";
import "./Layout.css";
import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaTimes,
  FaHome,
  FaChevronDown,
  FaChevronUp,
  FaBox,
  FaCut,
  FaTools,
  FaShoppingBag,
  FaWarehouse,
  FaSignOutAlt,
  FaTshirt,
  FaShoppingCart,
  FaQrcode,
  FaFileAlt,
  FaHistory,
  FaMoneyBillWave,
  FaCreditCard,
  FaCalendarAlt,
  FaClipboardCheck,
  FaUser,
  FaRuler,
  FaCheckSquare,
  FaBoxOpen,
  FaBuilding,
  FaBarcode,
  FaLayerGroup,
  FaChartLine,
  FaUndo,
} from "react-icons/fa";
import API from "../../api";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCmtOpen, setIsCmtOpen] = useState(false);
  const [isCuttingOpen, setIsCuttingOpen] = useState(false);
  const [isJasaOpen, setIsJasaOpen] = useState(false);
  const [isHppOpen, setIsHppOpen] = useState(false);
  const [isPackingOpen, setIsPackingOpen] = useState(false);

  const [isGudangOpen, setIsGudangOpen] = useState(false);
  const [isGudangProdukOpen, setIsGudangProdukOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("home");
  const [role, setRole] = useState("");
  const [isAksesorisOpen, setIsAksesorisOpen] = useState(false);
  const [isQcOpen, setIsQcOpen] = useState(false);
  const [isSampleOpen, setIsSampleOpen] = useState(false);

  const navigate = useNavigate();
  const handleLogout = useCallback(async () => {
    try {
      await API.post("/logout");
    } catch (error) { }
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("foto");
    localStorage.removeItem("loginTimestamp"); // Hapus timestamp login
    navigate("/");
  }, [navigate]);

  useEffect(() => {
    const userRole = localStorage.getItem("role"); // Ambil role dari localStorage
    setRole(userRole);

    // Cek apakah session sudah expired (lebih dari 1 minggu)
    const checkSessionExpiry = () => {
      const loginTimestamp = localStorage.getItem("loginTimestamp");
      if (loginTimestamp) {
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 1 minggu dalam milliseconds
        const now = Date.now();
        const timeSinceLogin = now - parseInt(loginTimestamp);

        if (timeSinceLogin > oneWeekInMs) {
          // Session expired, logout user
          handleLogout();
        }
      }
    };

    // Cek saat component mount
    checkSessionExpiry();

    // Cek setiap 1 jam untuk memastikan session tidak expired
    const expiryCheckInterval = setInterval(checkSessionExpiry, 60 * 60 * 1000);

    return () => {
      clearInterval(expiryCheckInterval);
    };
  }, [handleLogout]);

  const toggleCmtMenu = () => {
    setIsCmtOpen(!isCmtOpen);
  };
  const toggleCuttingMenu = () => {
    setIsCuttingOpen(!isCuttingOpen);
  };
  const toggleJasaMenu = () => {
    setIsJasaOpen(!isJasaOpen);
  };

  const toggleHppMenu = () => {
    setIsHppOpen(!isHppOpen);
  };
  const togglePackingMenu = () => {
    setIsPackingOpen(!isPackingOpen);
  };
  const toggleGudangMenu = () => {
    setIsGudangOpen(!isGudangOpen);
  };

  const toggleAksesorisMenu = () => {
    setIsAksesorisOpen(!isAksesorisOpen);
  };

  const toggleGudangProdukMenu = () => {
    setIsGudangProdukOpen(!isGudangProdukOpen);
  };

  const toggleQcMenu = () => {
    setIsQcOpen(!isQcOpen);
  };

  const toggleSampleMenu = () => {
    setIsSampleOpen(!isSampleOpen);
  };

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    setIsSidebarOpen(false);
  };
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="layout-container">
      {/* Overlay untuk mobile */}
      {isSidebarOpen && <div className="sidebar-overlay active" onClick={toggleSidebar}></div>}

      {/* Tombol Menu (hanya di mobile) */}
      <button className="menu-button" onClick={toggleSidebar}>
        {isSidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "24px", height: "24px", background: "#4f46e5", borderRadius: "6px", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff" }}>
              <FaLayerGroup size={12} />
            </div>
            <h3>ILOOK SYSTEM</h3>
          </div>
        </div>
        <nav className="sidebar-menu">
          <ul>
            {role !== "penjahit" && (
              <>
                <li>
                  <Link to="/home" className={`sidebar-link ${activeMenu === "home" ? "active" : ""}`} onClick={() => handleMenuClick("home")}>
                    <FaHome className="icon" /> DASHBOARD
                  </Link>
                </li>
                <li>
                  <Link to="/laporan-daily-produksi" className={`sidebar-link ${activeMenu === "laporan-daily-produksi" ? "active" : ""}`} onClick={() => handleMenuClick("laporan-daily-produksi")}>
                    <FaChartLine className="icon" /> Laporan Daily Produksi
                  </Link>
                </li>
              </>
            )}

            {/* ── Quality Control ── */}
            <li>
              <div onClick={toggleQcMenu} className={`sidebar-link dropdown-toggle ${(activeMenu === "qc" || activeMenu === "qc-lolos" || activeMenu === "qc-reject") ? "active" : ""}`}>
                <FaClipboardCheck className="icon" /> Quality Control
                <span className={`arrow ${isQcOpen ? "open" : ""}`}>{isQcOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isQcOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <Link to="/qc-lolos" className={`dropdown-link ${activeMenu === "qc-lolos" ? "active" : ""}`} onClick={() => handleMenuClick("qc-lolos")}>
                      <FaCheckSquare className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> QC Lolos
                    </Link>
                  </li>
                  <li>
                    <Link to="/qc-reject" className={`dropdown-link ${activeMenu === "qc-reject" ? "active" : ""}`} onClick={() => handleMenuClick("qc-reject")}>
                      <FaTimes className="icon" style={{ fontSize: "12px", marginRight: "8px", color: "#ff6b6b" }} /> QC Reject
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* ── Sample ── */}
            <li>
              <div onClick={toggleSampleMenu} className={`sidebar-link dropdown-toggle ${(activeMenu === "tukang-sample" || activeMenu === "spk-sample" || activeMenu === "summary-spk-sample") ? "active" : ""}`}>
                <FaLayerGroup className="icon" /> Management Sample
                <span className={`arrow ${isSampleOpen ? "open" : ""}`}>{isSampleOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isSampleOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <Link to="/tukang-sample" className={`dropdown-link ${activeMenu === "tukang-sample" ? "active" : ""}`} onClick={() => handleMenuClick("tukang-sample")}>
                      <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Tukang Sample
                    </Link>
                  </li>
                  <li>
                    <Link to="/spk-sample" className={`dropdown-link ${activeMenu === "spk-sample" ? "active" : ""}`} onClick={() => handleMenuClick("spk-sample")}>
                      <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SPK Sample
                    </Link>
                  </li>
                  <li>
                    <Link to="/summary-spk-sample" className={`dropdown-link ${activeMenu === "summary-spk-sample" ? "active" : ""}`} onClick={() => handleMenuClick("summary-spk-sample")}>
                      <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Summary SPK Sample
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li>
              <div onClick={toggleAksesorisMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "aksesoris" ? "active" : ""}`}>
                <FaBox className="icon" /> Aksesoris
                <span className={`arrow ${isAksesorisOpen ? "open" : ""}`}>{isAksesorisOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isAksesorisOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <Link to="aksesoris" className={`dropdown-link ${activeMenu === "aksesoris" ? "active" : ""}`} onClick={() => handleMenuClick("aksesoris")}>
                      <FaBox className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Data Aksesoris
                    </Link>
                  </li>
                  <li>
                    <Link to="pembelianA" className={`dropdown-link ${activeMenu === "pembelianA" ? "active" : ""}`} onClick={() => handleMenuClick("pembelianA")}>
                      <FaShoppingCart className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pembelian Aksesoris Toko
                    </Link>
                  </li>
                  <li>
                    <Link to="petugas-c" className={`dropdown-link ${activeMenu === "petugas-c" ? "active" : ""}`} onClick={() => handleMenuClick("petugas-c")}>
                      <FaShoppingCart className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pembelian Aksesoris CMT
                    </Link>
                  </li>
                </ul>
              )}
            </li>


            <li>
              <div onClick={toggleHppMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "hpp" ? "active" : ""}`}>
                <FaShoppingBag className="icon" /> Produk
                <span className={`arrow ${isHppOpen ? "open" : ""}`}>{isHppOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isHppOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <Link to="hppProduk" className={`dropdown-link ${activeMenu === "hppProduk" ? "active" : ""}`} onClick={() => handleMenuClick("hppProduk")}>
                      <FaShoppingBag className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hpp Produk
                    </Link>
                  </li>
                </ul>
              )}
            </li>




            <li>
              <div onClick={toggleGudangMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "gudang" ? "active" : ""}`}>
                <FaWarehouse className="icon" /> Gudang Bahan
                <span className={`arrow ${isGudangOpen ? "open" : ""}`}>{isGudangOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isGudangOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <Link to="pabrik" className={`dropdown-link ${activeMenu === "pabrik" ? "active" : ""}`} onClick={() => handleMenuClick("pabrik")}>
                      <FaBuilding className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pabrik
                    </Link>
                  </li>
                  <li>
                    <Link to="gudang" className={`dropdown-link ${activeMenu === "gudang" ? "active" : ""}`} onClick={() => handleMenuClick("gudang")}>
                      <FaWarehouse className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Gudang
                    </Link>
                  </li>
                  <li>
                    <Link to="bahan" className={`dropdown-link ${activeMenu === "bahan" ? "active" : ""}`} onClick={() => handleMenuClick("bahan")}>
                      <FaLayerGroup className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Bahan
                    </Link>
                  </li>

                  <li>
                    <Link to="spk-bahan" className={`dropdown-link ${activeMenu === "spk-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("spk-bahan")}>
                      <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SPK Pemesanan Bahan
                    </Link>
                  </li>
                  <li>
                    <Link to="pembelianBahan" className={`dropdown-link ${activeMenu === "pembelianBahan" ? "active" : ""}`} onClick={() => handleMenuClick("pembelianBahan")}>
                      <FaShoppingCart className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pengiriman Bahan
                    </Link>
                  </li>

                  <li>
                    <Link to="refund-bahan" className={`dropdown-link ${activeMenu === "refund-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("refund-bahan")}>
                      <FaUndo className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Refund Bahan
                    </Link>
                  </li>
                  <li>
                    <Link to="scan-bahan" className={`dropdown-link ${activeMenu === "scan-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("scan-bahan")}>
                      <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Scan Bahan
                    </Link>
                  </li>
                  <li>
                    <Link to="stok-per-bahan" className={`dropdown-link ${activeMenu === "stok-per-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("stok-per-bahan")}>
                      <FaBox className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Stok Bahan
                    </Link>
                  </li>
                  <li>
                    <Link to="scan-stok-bahan-keluar" className={`dropdown-link ${activeMenu === "scan-stok-bahan-keluar" ? "active" : ""}`} onClick={() => handleMenuClick("scan-stok-bahan-keluar")}>
                      <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Scan Stok Bahan Keluar
                    </Link>
                  </li>
                  <li>
                    <Link to="riwayat-stok-bahan-keluar" className={`dropdown-link ${activeMenu === "riwayat-stok-bahan-keluar" ? "active" : ""}`} onClick={() => handleMenuClick("riwayat-stok-bahan-keluar")}>
                      <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Stok Bahan Keluar
                    </Link>
                  </li>
                  <li>
                    <Link to="pendapatan-pabrik" className={`dropdown-link ${activeMenu === "pendapatan-pabrik" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatan-pabrik")}>
                      <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pendapatan Pabrik
                    </Link>
                  </li>
                  <li>
                    <Link to="history-pendapatan-pabrik" className={`dropdown-link ${activeMenu === "history-pendapatan-pabrik" ? "active" : ""}`} onClick={() => handleMenuClick("history-pendapatan-pabrik")}>
                      <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> History Pendapatan Pabrik
                    </Link>
                  </li>
                </ul>
              )}
            </li>




            <li>
              <div onClick={toggleCuttingMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "cutting" ? "active" : ""}`}>
                <FaCut className="icon" /> Cutting
                <span className={`arrow ${isCuttingOpen ? "open" : ""}`}>{isCuttingOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isCuttingOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <Link to="dashboardCutting" className={`dropdown-link ${activeMenu === "dashboardCutting" ? "active" : ""}`} onClick={() => handleMenuClick("dashboardCutting")}>
                      <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Dasboard Cutting
                    </Link>
                  </li>

                  <li>
                    <Link to="tukangCutting" className={`dropdown-link ${activeMenu === "tukangCutting" ? "active" : ""}`} onClick={() => handleMenuClick("tukangCutting")}>
                      <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Tukang Cutting
                    </Link>
                  </li>
                  <li>
                    <Link to="tukangPola" className={`dropdown-link ${activeMenu === "tukangPola" ? "active" : ""}`} onClick={() => handleMenuClick("tukangPola")}>
                      <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Tukang Pola
                    </Link>
                  </li>
                  <li>
                    <Link to="markeran" className={`dropdown-link ${activeMenu === "markeran" ? "active" : ""}`} onClick={() => handleMenuClick("markeran")}>
                      <FaRuler className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Markeran Produk
                    </Link>
                  </li>
                  <li>
                    <Link to="spkcutting" className={`dropdown-link ${activeMenu === "spkcutting" ? "active" : ""}`} onClick={() => handleMenuClick("spkcutting")}>
                      <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SPK
                    </Link>
                  </li>
                  <li>
                    <Link to="hasilcutting" className={`dropdown-link ${activeMenu === "hasilcutting" ? "active" : ""}`} onClick={() => handleMenuClick("hasilcutting")}>
                      <FaCheckSquare className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hasil
                    </Link>
                  </li>
                  <li>
                    <Link to="laporanhasil" className={`dropdown-link ${activeMenu === "laporanhasil" ? "active" : ""}`} onClick={() => handleMenuClick("laporanhasil")}>
                      <FaCheckSquare className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Laporan Hasil
                    </Link>
                  </li>
                  <li>
                    <Link to="historyhasilcutting" className={`dropdown-link ${activeMenu === "historyhasilcutting" ? "active" : ""}`} onClick={() => handleMenuClick("historyhasilcutting")}>
                      <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> History Hasil Cutting
                    </Link>
                  </li>
                  <li>
                    <Link to="historydistribusispk" className={`dropdown-link ${activeMenu === "historydistribusispk" ? "active" : ""}`} onClick={() => handleMenuClick("historydistribusispk")}>
                      <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> History Distribusi SPK
                    </Link>
                  </li>
                  <li>
                    <Link to="hutangc" className={`dropdown-link ${activeMenu === "hutangc" ? "active" : ""}`} onClick={() => handleMenuClick("hutangc")}>
                      <FaCreditCard className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hutang
                    </Link>
                  </li>
                  <li>
                    <Link to="cashboanc" className={`dropdown-link ${activeMenu === "cashboanc" ? "active" : ""}`} onClick={() => handleMenuClick("cashboanc")}>
                      <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Cashboan
                    </Link>
                  </li>
                  <li>
                    <Link to="pendapatancutting" className={`dropdown-link ${activeMenu === "pendapatancutting" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatancutting")}>
                      <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pendapatan
                    </Link>
                  </li>
                  <li>
                    <Link to="pendapatanhistory" className={`dropdown-link ${activeMenu === "pendapatanhistory" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatanhistory")}>
                      <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> History Pendapatan
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li>
              <div onClick={toggleJasaMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "jasa" ? "active" : ""}`}>
                <FaTools className="icon" /> Jasa
                <span className={`arrow ${isJasaOpen ? "open" : ""}`}>{isJasaOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isJasaOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <Link to="dashboard-jasa" className={`dropdown-link ${activeMenu === "dashboard-jasa" ? "active" : ""}`} onClick={() => handleMenuClick("dashboard-jasa")}>
                      <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Dashboard Jasa
                    </Link>
                  </li>
                  <li>
                    <Link to="tukangJasa" className={`dropdown-link ${activeMenu === "tukangJasa" ? "active" : ""}`} onClick={() => handleMenuClick("tukangJasa")}>
                      <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Tukang Jasa
                    </Link>
                  </li>
                  <li>
                    <Link to="spkjasa" className={`dropdown-link ${activeMenu === "spkjasa" ? "active" : ""}`} onClick={() => handleMenuClick("spkjasa")}>
                      <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Spk Jasa
                    </Link>
                  </li>
                  <li>
                    <Link to="hasiljasa" className={`dropdown-link ${activeMenu === "hasiljasa" ? "active" : ""}`} onClick={() => handleMenuClick("hasiljasa")}>
                      <FaCheckSquare className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hasil Jasa
                    </Link>
                  </li>
                  <li>
                    <Link to="cashboanjasa" className={`dropdown-link ${activeMenu === "cashboanjasa" ? "active" : ""}`} onClick={() => handleMenuClick("cashboanjasa")}>
                      <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Cashboan
                    </Link>
                  </li>
                  <li>
                    <Link to="hutangjasa" className={`dropdown-link ${activeMenu === "hutangjasa" ? "active" : ""}`} onClick={() => handleMenuClick("hutangjasa")}>
                      <FaCreditCard className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hutang
                    </Link>
                  </li>
                  <li>
                    <Link to="pendapatanjasa" className={`dropdown-link ${activeMenu === "pendapatanjasa" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatanjasa")}>
                      <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pendapatan
                    </Link>
                  </li>
                  <li>
                    <Link to="pendapatanhistoryjasa" className={`dropdown-link ${activeMenu === "pendapatanhistoryjasa" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatanhistoryjasa")}>
                      <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> History Pendapatan
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li>
              <div onClick={toggleCmtMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "cmt" ? "active" : ""}`}>
                <FaTshirt className="icon" /> CMT
                <span className={`arrow ${isCmtOpen ? "open" : ""}`}>{isCmtOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isCmtOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <Link to="dashboard-cmt" className={`dropdown-link ${activeMenu === "dashboard-cmt" ? "active" : ""}`} onClick={() => handleMenuClick("dashboard-cmt")}>
                      <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Dashboard CMT
                    </Link>
                  </li>
                  <li>
                    <Link to="penjahit" className={`dropdown-link ${activeMenu === "penjahit" ? "active" : ""}`} onClick={() => handleMenuClick("penjahit")}>
                      <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> CMT
                    </Link>
                  </li>
                  <li>
                    <Link to="kode-seri-belum-dikerjakan" className={`dropdown-link ${activeMenu === "kodeSeri" ? "active" : ""}`} onClick={() => handleMenuClick("kodeSeri")}>
                      <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Belum Dikerjakan
                    </Link>
                  </li>
                  <li>
                    <Link to="spkcmt" className={`dropdown-link ${activeMenu === "spk" ? "active" : ""}`} onClick={() => handleMenuClick("spk")}>
                      <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SPK
                    </Link>
                  </li>

                  {role !== "penjahit" && (
                    <>
                      <li>
                        <Link to="data-dikerjakan-pengiriman-cmt" className={`dropdown-link ${activeMenu === "dataDikerjakanPengiriman" ? "active" : ""}`} onClick={() => handleMenuClick("dataDikerjakanPengiriman")}>
                          <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Data Dikerjakan & Pengiriman
                        </Link>
                      </li>
                      <li>
                        <Link to="pengiriman" className={`dropdown-link ${activeMenu === "pengiriman" ? "active" : ""}`} onClick={() => handleMenuClick("pengiriman")}>
                          <FaBox className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pengiriman
                        </Link>
                      </li>
                      <li>
                        <Link to="hutang" className={`dropdown-link ${activeMenu === "hutang" ? "active" : ""}`} onClick={() => handleMenuClick("hutang")}>
                          <FaCreditCard className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hutang
                        </Link>
                      </li>
                      <li>
                        <Link to="cashbon" className={`dropdown-link ${activeMenu === "cashbon" ? "active" : ""}`} onClick={() => handleMenuClick("casbon")}>
                          <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Casbon
                        </Link>
                      </li>
                      <li>
                        <Link to="pendapatan" className={`dropdown-link ${activeMenu === "pendapatan" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatan")}>
                          <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pendapatan
                        </Link>
                      </li>
                      <li>
                        <Link to="historyPendapatan" className={`dropdown-link ${activeMenu === "historyPendapatan" ? "active" : ""}`} onClick={() => handleMenuClick("historyPendapatan")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> History Pendapatan
                        </Link>
                      </li>
                      <li>
                        <Link to="deadline" className={`dropdown-link ${activeMenu === "deadline" ? "active" : ""}`} onClick={() => handleMenuClick("deadline")}>
                          <FaCalendarAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Log Deadline
                        </Link>
                      </li>
                      <li>
                        <Link to="status" className={`dropdown-link ${activeMenu === "status" ? "active" : ""}`} onClick={() => handleMenuClick("status")}>
                          <FaClipboardCheck className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Log Status
                        </Link>
                      </li>
                      <li>
                        <Link to="sku" className={`dropdown-link ${activeMenu === "sku" ? "active" : ""}`} onClick={() => handleMenuClick("sku")}>
                          <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SKU
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              )}
            </li>




            <li>
              <div
                onClick={toggleGudangProdukMenu}
                className={`sidebar-link dropdown-toggle ${[
                  "master-gudang-produk",
                  "input-sku-gudang",
                  "stok-lokasi-gudang",
                  "mutasi-gudang-produk",
                  "gudang-produk",
                  "stok-gudang-produk",
                  "picking-queue",
                ].includes(activeMenu)
                    ? "active"
                    : ""
                  }`}
              >
                <FaShoppingBag className="icon" /> Gudang Produk
                <span className={`arrow ${isGudangProdukOpen ? "open" : ""}`}>{isGudangProdukOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isGudangProdukOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <Link to="master-gudang-produk" className={`dropdown-link ${activeMenu === "master-gudang-produk" ? "active" : ""}`} onClick={() => handleMenuClick("master-gudang-produk")}>
                      <FaWarehouse className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Master Layout
                    </Link>
                  </li>
                  <li>
                    <Link to="input-sku-gudang" className={`dropdown-link ${activeMenu === "input-sku-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("input-sku-gudang")}>
                      <FaBox className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Input SKU Gudang
                    </Link>
                  </li>
                  <li>
                    <Link to="stok-lokasi-gudang" className={`dropdown-link ${activeMenu === "stok-lokasi-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("stok-lokasi-gudang")}>
                      <FaLayerGroup className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Stok per Lokasi
                    </Link>
                  </li>
                  <li>
                    <Link to="mutasi-gudang-produk" className={`dropdown-link ${activeMenu === "mutasi-gudang-produk" ? "active" : ""}`} onClick={() => handleMenuClick("mutasi-gudang-produk")}>
                      <FaBoxOpen className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Mutasi Gudang
                    </Link>
                  </li>
                  <li>
                    <Link to="gudang-produk" className={`dropdown-link ${activeMenu === "gudang-produk" ? "active" : ""}`} onClick={() => handleMenuClick("gudang-produk")}>
                      <FaWarehouse className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Gudang Produk Lama
                    </Link>
                  </li>
                  <li>
                    <Link to="stok-gudang-produk" className={`dropdown-link ${activeMenu === "stok-gudang-produk" ? "active" : ""}`} onClick={() => handleMenuClick("stok-gudang-produk")}>
                      <FaBox className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Stok Gudang Lama
                    </Link>
                  </li>
                  <li>
                    <Link to="picking-queue" className={`dropdown-link ${activeMenu === "picking-queue" ? "active" : ""}`} onClick={() => handleMenuClick("picking-queue")}>
                      <FaClipboardCheck className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Picking Queue
                    </Link>
                  </li>
                </ul>
              )}
            </li>
            <li>
              <div
                onClick={togglePackingMenu}
                className={`sidebar-link dropdown-toggle ${["packing", "packing-random", "logs", "seri"].includes(activeMenu) ? "active" : ""}`}
              >
                <FaBoxOpen className="icon" /> Packing
                <span className={`arrow ${isPackingOpen ? "open" : ""}`}>{isPackingOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isPackingOpen && (
                <ul className="dropdown-menu show">
                  <li>
                    <Link to="packing" className={`dropdown-link ${activeMenu === "packing" ? "active" : ""}`} onClick={() => handleMenuClick("packing")}>
                      <FaBoxOpen className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Packing
                    </Link>
                  </li>
                  <li>
                    <Link to="packing-random" className={`dropdown-link ${activeMenu === "packing-random" ? "active" : ""}`} onClick={() => handleMenuClick("packing-random")}>
                      <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Packing Random
                    </Link>
                  </li>
                  <li>
                    <Link to="logs" className={`dropdown-link ${activeMenu === "logs" ? "active" : ""}`} onClick={() => handleMenuClick("logs")}>
                      <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> History scan
                    </Link>
                  </li>
                  <li>
                    <Link to="seri" className={`dropdown-link ${activeMenu === "seri" ? "active" : ""}`} onClick={() => handleMenuClick("seri")}>
                      <FaQrcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Seri
                    </Link>
                  </li>
                </ul>
              )}
            </li>




            <li style={{ marginTop: "auto", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.2)" }}>
              <button className="sidebar-link" onClick={handleLogout} style={{ color: "#ff6b6b" }}>
                <FaSignOutAlt className="icon" /> Logout
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
