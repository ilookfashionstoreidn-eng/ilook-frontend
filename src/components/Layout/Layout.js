import React, { useState, useEffect, useCallback } from "react";
import "./Layout.css";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
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
  FaListUl,
  FaUser,
  FaRuler,
  FaCheckSquare,
  FaBoxOpen,
  FaBuilding,
  FaBarcode,
  FaClock,
  FaLayerGroup,
  FaChartLine,
  FaUndo,
  FaPrint,
  FaMoon,
  FaSun,
} from "react-icons/fa";
import { FiAlertTriangle } from "react-icons/fi";
import API from "../../api";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCmtOpen, setIsCmtOpen] = useState(false);
  const [isCuttingOpen, setIsCuttingOpen] = useState(false);
  const [isJasaOpen, setIsJasaOpen] = useState(false);
  const [isHppOpen, setIsHppOpen] = useState(false);
  const [isPackingOpen, setIsPackingOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);

  const [isGudangOpen, setIsGudangOpen] = useState(false);
  const [isGudangProdukOpen, setIsGudangProdukOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("home");
  const [role, setRole] = useState("");
  const [menus, setMenus] = useState([]);
  const [isAksesorisOpen, setIsAksesorisOpen] = useState(false);
  const [isQcOpen, setIsQcOpen] = useState(false);
  const [isSampleOpen, setIsSampleOpen] = useState(false);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  // Sync active menu with current path
  useEffect(() => {
    const path = location.pathname.replace(/^\//, '');
    if (path) {
      setActiveMenu(path);
      // Auto open menus based on path
      if (['packing', 'packing-random', 'packing-pendingan', 'packing-belum-barcode', 'packing-no-data-ginee', 'packing-inject', 'seri', 'monitoring', 'packing-printed', 'packing-daily-report', 'packing-daily-packing-report', 'logs'].includes(path)) setIsPackingOpen(true);
      if (['gudang', 'list-stok-gudang', 'gudang-logs', 'scan-masuk-gudang'].includes(path)) setIsGudangOpen(true);
      if (['list-stok-product', 'riwayat-opname-product', 'riwayat-masuk-product', 'riwayat-keluar-product', 'riwayat-scan-pengiriman'].includes(path)) setIsGudangProdukOpen(true);
      if (['jahit', 'jahit-spk', 'pengiriman', 'jahit-hutang', 'jahit-cashbon', 'jahit-pendapatan', 'jahit-deadline', 'jahit-status', 'kinerja', 'kinerja-detail', 'jahit-riwayat-pendapatan'].includes(path)) setIsCmtOpen(true);
      if (['cutting', 'tukang-pola', 'spk-cutting', 'hasil-cutting', 'history-hasil-cutting', 'spk-distribusi-history', 'hutang-cutting', 'cashbon-cutting', 'pendapatan-cutting', 'history-pendapatan-cutting', 'markeran-produk'].includes(path)) setIsCuttingOpen(true);
      if (['tukang-jasa', 'spk-jasa', 'hasil-jasa', 'cashbon-jasa', 'hutang-jasa', 'pendapatan-jasa', 'history-pendapatan-jasa'].includes(path)) setIsJasaOpen(true);
      if (['qc-lolos', 'qc-reject'].includes(path)) setIsQcOpen(true);
      if (['return', 'return-logs'].includes(path)) setIsReturnOpen(true);
    } else {
      setActiveMenu('home');
    }
  }, [location.pathname]);
  const handleLogout = useCallback(async () => {
    try {
      await API.post("/logout");
    } catch (error) { }
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("foto");
    localStorage.removeItem("menus");
    localStorage.removeItem("loginTimestamp"); // Hapus timestamp login
    navigate("/");
  }, [navigate]);

  useEffect(() => {
    const userRole = localStorage.getItem("role"); // Ambil role dari localStorage
    setRole(userRole);

    try {
      const userMenus = JSON.parse(localStorage.getItem("menus") || "[]");
      setMenus(userMenus);
    } catch (e) {
      setMenus([]);
    }

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

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Auto collapse removed for better UX

  const hasAccess = (menuKey) => {
    if (role === "super-admin") return true;
    if (menuKey.includes(":")) {
      return menus.includes(menuKey);
    }
    return menus.includes(menuKey) || menus.some(m => m.startsWith(menuKey + ":"));
  };

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
  const toggleReturnMenu = () => {
    setIsReturnOpen(!isReturnOpen);
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
      <aside 
        className={`sidebar ${isSidebarOpen ? "open" : ""} ${isSidebarCollapsed ? "collapsed" : ""}`}
        onMouseEnter={() => {
          setIsSidebarHovered(true);
          if (isSidebarCollapsed) setIsSidebarCollapsed(false);
        }}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: 'hidden' }}>
            <div style={{ width: "26px", height: "26px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderRadius: "7px", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", flexShrink: 0, boxShadow: "0 4px 10px -4px rgba(16,185,129,0.6)" }}>
              <FaLayerGroup size={12} />
            </div>
            <h3 className="sidebar-title">ILOOK SYSTEM</h3>
          </div>
          <button
            className="sidebar-collapse-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            <FaBars />
          </button>
        </div>
        <nav className="sidebar-menu">
          <ul>
            {hasAccess("dashboard") && (
              <li>
                <Link to="/home" className={`sidebar-link ${activeMenu === "home" ? "active" : ""}`} onClick={() => handleMenuClick("home")}>
                  <FaHome className="icon" /> Dashboard
                </Link>
              </li>
            )}

            {hasAccess("laporan_daily_produksi") && (
              <li>
                <Link to="/laporan-daily-produksi" className={`sidebar-link ${activeMenu === "laporan-daily-produksi" ? "active" : ""}`} onClick={() => handleMenuClick("laporan-daily-produksi")}>
                  <FaChartLine className="icon" /> Laporan Produksi Harian
                </Link>
              </li>
            )}

            {/* ── Quality Control ── */}
            {hasAccess("qc") && (
              <li>
                <div onClick={toggleQcMenu} className={`sidebar-link dropdown-toggle ${(activeMenu === "qc" || activeMenu === "qc-lolos" || activeMenu === "qc-reject") ? "active" : ""}`}>
                  <FaClipboardCheck className="icon" /> Quality Control
                  <span className={`arrow ${isQcOpen ? "open" : ""}`}>{isQcOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isQcOpen && (
                  <ul className="dropdown-menu show">
                    {hasAccess("qc:lolos") && (
                      <li>
                        <Link to="/qc-lolos" className={`dropdown-link ${activeMenu === "qc-lolos" ? "active" : ""}`} onClick={() => handleMenuClick("qc-lolos")}>
                          <FaCheckSquare className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> QC Lolos
                        </Link>
                      </li>
                    )}
                    {hasAccess("qc:reject") && (
                      <li>
                        <Link to="/qc-reject" className={`dropdown-link ${activeMenu === "qc-reject" ? "active" : ""}`} onClick={() => handleMenuClick("qc-reject")}>
                          <FaTimes className="icon" style={{ fontSize: "12px", marginRight: "8px", color: "#ff6b6b" }} /> QC Reject
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}

            {/* ── Sample ── */}
            {hasAccess("sample") && (
              <li>
                <div onClick={toggleSampleMenu} className={`sidebar-link dropdown-toggle ${(activeMenu === "tukang-sample" || activeMenu === "spk-sample" || activeMenu === "summary-spk-sample") ? "active" : ""}`}>
                  <FaLayerGroup className="icon" /> Manajemen Sample
                  <span className={`arrow ${isSampleOpen ? "open" : ""}`}>{isSampleOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isSampleOpen && (
                  <ul className="dropdown-menu show">
                    {hasAccess("sample:tukang") && (
                      <li>
                        <Link to="/tukang-sample" className={`dropdown-link ${activeMenu === "tukang-sample" ? "active" : ""}`} onClick={() => handleMenuClick("tukang-sample")}>
                          <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Tukang Sample
                        </Link>
                      </li>
                    )}
                    {hasAccess("sample:spk") && (
                      <li>
                        <Link to="/spk-sample" className={`dropdown-link ${activeMenu === "spk-sample" ? "active" : ""}`} onClick={() => handleMenuClick("spk-sample")}>
                          <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SPK Sample
                        </Link>
                      </li>
                    )}
                    {hasAccess("sample:summary") && (
                      <li>
                        <Link to="/summary-spk-sample" className={`dropdown-link ${activeMenu === "summary-spk-sample" ? "active" : ""}`} onClick={() => handleMenuClick("summary-spk-sample")}>
                          <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Summary SPK Sample
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}

            {hasAccess("aksesoris") && (
              <li>
                <div onClick={toggleAksesorisMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "aksesoris" ? "active" : ""}`}>
                  <FaBox className="icon" /> Aksesoris
                  <span className={`arrow ${isAksesorisOpen ? "open" : ""}`}>{isAksesorisOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isAksesorisOpen && (
                  <ul className="dropdown-menu show">
                    {hasAccess("aksesoris:data") && (
                      <li>
                        <Link to="aksesoris" className={`dropdown-link ${activeMenu === "aksesoris" ? "active" : ""}`} onClick={() => handleMenuClick("aksesoris")}>
                          <FaBox className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Data Aksesoris
                        </Link>
                      </li>
                    )}
                    {hasAccess("aksesoris:pembelian_toko") && (
                      <li>
                        <Link to="pembelianA" className={`dropdown-link ${activeMenu === "pembelianA" ? "active" : ""}`} onClick={() => handleMenuClick("pembelianA")}>
                          <FaShoppingCart className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pembelian Aksesoris Toko
                        </Link>
                      </li>
                    )}
                    {hasAccess("aksesoris:pembelian_cmt") && (
                      <li>
                        <Link to="petugas-c" className={`dropdown-link ${activeMenu === "petugas-c" ? "active" : ""}`} onClick={() => handleMenuClick("petugas-c")}>
                          <FaShoppingCart className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pembelian Aksesoris CMT
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}


            {hasAccess("produk") && (
              <li>
                <div onClick={toggleHppMenu} className={`sidebar-link dropdown-toggle ${(activeMenu === "hpp" || activeMenu === "hppProduk" || activeMenu === "produk-list") ? "active" : ""}`}>
                  <FaShoppingBag className="icon" /> Produk
                  <span className={`arrow ${isHppOpen ? "open" : ""}`}>{isHppOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isHppOpen && (
                  <ul className="dropdown-menu show">
                    {hasAccess("produk:list") && (
                      <li>
                        <Link to="produk-list" className={`dropdown-link ${activeMenu === "produk-list" ? "active" : ""}`} onClick={() => handleMenuClick("produk-list")}>
                          <FaLayerGroup className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Daftar Produk
                        </Link>
                      </li>
                    )}
                    {hasAccess("produk:hpp") && (
                      <li>
                        <Link to="hppProduk" className={`dropdown-link ${activeMenu === "hppProduk" ? "active" : ""}`} onClick={() => handleMenuClick("hppProduk")}>
                          <FaShoppingBag className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> HPP Produk
                        </Link>
                      </li>
                    )}
                    {hasAccess("produk:list") && (
                      <li>
                        <Link to="daftar-sku-ginee" className={`dropdown-link ${activeMenu === "daftar-sku-ginee" ? "active" : ""}`} onClick={() => handleMenuClick("daftar-sku-ginee")}>
                          <FaLayerGroup className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Daftar SKU Ginee
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}

            {hasAccess("gudang_bahan") && (
              <li>
                <div onClick={toggleGudangMenu} className={`sidebar-link dropdown-toggle ${["gudang", "bahan-list", "stok-opname-bahan"].includes(activeMenu) ? "active" : ""}`}>
                  <FaWarehouse className="icon" /> Gudang Bahan
                  <span className={`arrow ${isGudangOpen ? "open" : ""}`}>{isGudangOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isGudangOpen && (
                  <ul className="dropdown-menu show dropdown-menu-grouped">
                    <div className="dropdown-group-label">Master Data</div>
                    {hasAccess("gudang_bahan:pabrik") && (
                      <li>
                        <Link to="pabrik" className={`dropdown-link ${activeMenu === "pabrik" ? "active" : ""}`} onClick={() => handleMenuClick("pabrik")}>
                          <FaBuilding className="icon" style={{ fontSize: "12px", marginRight: "8px" }} />Data Pabrik
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_bahan:gudang") && (
                      <li>
                        <Link to="gudang" className={`dropdown-link ${activeMenu === "gudang" ? "active" : ""}`} onClick={() => handleMenuClick("gudang")}>
                          <FaWarehouse className="icon" style={{ fontSize: "12px", marginRight: "8px" }} />Data Gudang
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_bahan:bahan") && (
                      <li>
                        <Link to="bahan" className={`dropdown-link ${activeMenu === "bahan" ? "active" : ""}`} onClick={() => handleMenuClick("bahan")}>
                          <FaLayerGroup className="icon" style={{ fontSize: "12px", marginRight: "8px" }} />Data Bahan
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_bahan:list_bahan") && (
                      <li>
                        <Link to="bahan-list" className={`dropdown-link ${activeMenu === "bahan-list" ? "active" : ""}`} onClick={() => handleMenuClick("bahan-list")}>
                          <FaListUl className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Daftar Bahan
                        </Link>
                      </li>
                    )}

                    <div className="dropdown-group-label">Operasional</div>
                    {hasAccess("gudang_bahan:pemesanan") && (
                      <li>
                        <Link to="spk-bahan" className={`dropdown-link ${activeMenu === "spk-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("spk-bahan")}>
                          <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pemesanan Bahan
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_bahan:pengiriman") && (
                      <li>
                        <Link to="pembelianBahan" className={`dropdown-link ${activeMenu === "pembelianBahan" ? "active" : ""}`} onClick={() => handleMenuClick("pembelianBahan")}>
                          <FaShoppingCart className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pengiriman Bahan
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_bahan:return") && (
                      <li>
                        <Link to="refund-bahan" className={`dropdown-link ${activeMenu === "refund-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("refund-bahan")}>
                          <FaUndo className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Retur Bahan
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_bahan:opname") && (
                      <li>
                        <Link to="stok-opname-bahan" className={`dropdown-link ${activeMenu === "stok-opname-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("stok-opname-bahan")}>
                          <FaClipboardCheck className="icon" style={{ fontSize: "12px", marginRight: "8px", color: "#a78bfa" }} /> Stok Opname Bahan
                        </Link>
                      </li>
                    )}

                    <div className="dropdown-group-label">Inventory</div>
                    {hasAccess("gudang_bahan:stok") && (
                      <li>
                        <Link to="stok-per-bahan" className={`dropdown-link ${activeMenu === "stok-per-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("stok-per-bahan")}>
                          <FaBox className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Stok Bahan
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_bahan:scan_masuk") && (
                      <li>
                        <Link to="scan-bahan" className={`dropdown-link ${activeMenu === "scan-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("scan-bahan")}>
                          <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Scan Bahan Masuk
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_bahan:scan_keluar") && (
                      <li>
                        <Link to="scan-stok-bahan-keluar" className={`dropdown-link ${activeMenu === "scan-stok-bahan-keluar" ? "active" : ""}`} onClick={() => handleMenuClick("scan-stok-bahan-keluar")}>
                          <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Scan Bahan Keluar
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_bahan:history_keluar") && (
                      <li>
                        <Link to="riwayat-stok-bahan-keluar" className={`dropdown-link ${activeMenu === "riwayat-stok-bahan-keluar" ? "active" : ""}`} onClick={() => handleMenuClick("riwayat-stok-bahan-keluar")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Stok Keluar
                        </Link>
                      </li>
                    )}

                    <div className="dropdown-group-label">Keuangan</div>
                    {hasAccess("gudang_bahan:hutang_pabrik") && (
                      <li>
                        <Link to="pendapatan-pabrik" className={`dropdown-link ${activeMenu === "pendapatan-pabrik" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatan-pabrik")}>
                          <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hutang Pabrik
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_bahan:history_hutang_pabrik") && (
                      <li>
                        <Link to="history-pendapatan-pabrik" className={`dropdown-link ${activeMenu === "history-pendapatan-pabrik" ? "active" : ""}`} onClick={() => handleMenuClick("history-pendapatan-pabrik")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Hutang Pabrik
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}

            {hasAccess("cutting") && (
              <li>
                <div onClick={toggleCuttingMenu} className={`sidebar-link dropdown-toggle ${["dashboardCutting", "tukangCutting", "tukangPola", "markeran", "spkcutting", "hasilcutting", "laporanhasil", "laporan-data-acuan", "historyhasilcutting", "historydistribusispk", "hutangc", "cashboanc", "pendapatancutting", "pendapatanhistory"].includes(activeMenu) ? "active" : ""}`}>
                  <FaCut className="icon" /> Cutting
                  <span className={`arrow ${isCuttingOpen ? "open" : ""}`}>{isCuttingOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isCuttingOpen && (
                  <ul className="dropdown-menu show dropdown-menu-grouped">
                    <div className="dropdown-group-label">Utama</div>
                    {hasAccess("cutting:dashboard") && (
                      <li>
                        <Link to="dashboardCutting" className={`dropdown-link ${activeMenu === "dashboardCutting" ? "active" : ""}`} onClick={() => handleMenuClick("dashboardCutting")}>
                          <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Dashboard Cutting
                        </Link>
                      </li>
                    )}

                    <div className="dropdown-group-label">Master Data</div>
                    {hasAccess("cutting:tukang") && (
                      <li>
                        <Link to="tukangCutting" className={`dropdown-link ${activeMenu === "tukangCutting" ? "active" : ""}`} onClick={() => handleMenuClick("tukangCutting")}>
                          <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Tukang Cutting
                        </Link>
                      </li>
                    )}


                    <div className="dropdown-group-label">Operasional</div>
                    {hasAccess("cutting:spk") && (
                      <li>
                        <Link to="spkcutting" className={`dropdown-link ${activeMenu === "spkcutting" ? "active" : ""}`} onClick={() => handleMenuClick("spkcutting")}>
                          <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SPK Cutting
                        </Link>
                      </li>
                    )}
                    {hasAccess("cutting:hasil") && (
                      <li>
                        <Link to="hasilcutting" className={`dropdown-link ${activeMenu === "hasilcutting" ? "active" : ""}`} onClick={() => handleMenuClick("hasilcutting")}>
                          <FaCheckSquare className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Input Hasil Cutting
                        </Link>
                      </li>
                    )}
                    {hasAccess("cutting:laporan") && (
                      <li>
                        <Link to="laporanhasil" className={`dropdown-link ${activeMenu === "laporanhasil" ? "active" : ""}`} onClick={() => handleMenuClick("laporanhasil")}>
                          <FaClipboardCheck className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Laporan Hasil Cutting
                        </Link>
                      </li>
                    )}
                    {hasAccess("cutting:acuan") && (
                      <li>
                        <Link to="laporan-data-acuan" className={`dropdown-link ${activeMenu === "laporan-data-acuan" ? "active" : ""}`} onClick={() => handleMenuClick("laporan-data-acuan")}>
                          <FaListUl className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Laporan Data Acuan
                        </Link>
                      </li>
                    )}
                    {hasAccess("cutting:history_hasil") && (
                      <li>
                        <Link to="historyhasilcutting" className={`dropdown-link ${activeMenu === "historyhasilcutting" ? "active" : ""}`} onClick={() => handleMenuClick("historyhasilcutting")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Hasil Cutting
                        </Link>
                      </li>
                    )}
                    {hasAccess("cutting:history_distribusi") && (
                      <li>
                        <Link to="historydistribusispk" className={`dropdown-link ${activeMenu === "historydistribusispk" ? "active" : ""}`} onClick={() => handleMenuClick("historydistribusispk")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Distribusi SPK
                        </Link>
                      </li>
                    )}

                    <div className="dropdown-group-label">Keuangan</div>
                    {hasAccess("cutting:hutang") && (
                      <li>
                        <Link to="hutangc" className={`dropdown-link ${activeMenu === "hutangc" ? "active" : ""}`} onClick={() => handleMenuClick("hutangc")}>
                          <FaCreditCard className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hutang Tukang Cutting
                        </Link>
                      </li>
                    )}
                    {hasAccess("cutting:cashbon") && (
                      <li>
                        <Link to="cashboanc" className={`dropdown-link ${activeMenu === "cashboanc" ? "active" : ""}`} onClick={() => handleMenuClick("cashboanc")}>
                          <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Kasbon Tukang Cutting
                        </Link>
                      </li>
                    )}
                    {hasAccess("cutting:piutang") && (
                      <li>
                        <Link to="pendapatancutting" className={`dropdown-link ${activeMenu === "pendapatancutting" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatancutting")}>
                          <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Piutang Tukang Cutting
                        </Link>
                      </li>
                    )}
                    {hasAccess("cutting:history_pembayaran") && (
                      <li>
                        <Link to="pendapatanhistory" className={`dropdown-link ${activeMenu === "pendapatanhistory" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatanhistory")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Pembayaran
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}

            {hasAccess("jasa") && (
              <li>
                <div onClick={toggleJasaMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "jasa" ? "active" : ""}`}>
                  <FaTools className="icon" /> Jasa
                  <span className={`arrow ${isJasaOpen ? "open" : ""}`}>{isJasaOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isJasaOpen && (
                  <ul className="dropdown-menu show">
                    {hasAccess("jasa:dashboard") && (
                      <li>
                        <Link to="dashboard-jasa" className={`dropdown-link ${activeMenu === "dashboard-jasa" ? "active" : ""}`} onClick={() => handleMenuClick("dashboard-jasa")}>
                          <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Dashboard Jasa
                        </Link>
                      </li>
                    )}
                    {hasAccess("jasa:tukang") && (
                      <li>
                        <Link to="tukangJasa" className={`dropdown-link ${activeMenu === "tukangJasa" ? "active" : ""}`} onClick={() => handleMenuClick("tukangJasa")}>
                          <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Tukang Jasa
                        </Link>
                      </li>
                    )}
                    {hasAccess("jasa:spk") && (
                      <li>
                        <Link to="spkjasa" className={`dropdown-link ${activeMenu === "spkjasa" ? "active" : ""}`} onClick={() => handleMenuClick("spkjasa")}>
                          <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SPK Jasa
                        </Link>
                      </li>
                    )}
                    {hasAccess("jasa:hasil") && (
                      <li>
                        <Link to="hasiljasa" className={`dropdown-link ${activeMenu === "hasiljasa" ? "active" : ""}`} onClick={() => handleMenuClick("hasiljasa")}>
                          <FaCheckSquare className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hasil Jasa
                        </Link>
                      </li>
                    )}
                    {hasAccess("jasa:cashbon") && (
                      <li>
                        <Link to="cashboanjasa" className={`dropdown-link ${activeMenu === "cashboanjasa" ? "active" : ""}`} onClick={() => handleMenuClick("cashboanjasa")}>
                          <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Kasbon
                        </Link>
                      </li>
                    )}
                    {hasAccess("jasa:hutang") && (
                      <li>
                        <Link to="hutangjasa" className={`dropdown-link ${activeMenu === "hutangjasa" ? "active" : ""}`} onClick={() => handleMenuClick("hutangjasa")}>
                          <FaCreditCard className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hutang
                        </Link>
                      </li>
                    )}
                    {hasAccess("jasa:pendapatan") && (
                      <li>
                        <Link to="pendapatanjasa" className={`dropdown-link ${activeMenu === "pendapatanjasa" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatanjasa")}>
                          <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pendapatan
                        </Link>
                      </li>
                    )}
                    {hasAccess("jasa:history_pendapatan") && (
                      <li>
                        <Link to="pendapatanhistoryjasa" className={`dropdown-link ${activeMenu === "pendapatanhistoryjasa" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatanhistoryjasa")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Pendapatan
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}

            {hasAccess("cmt") && (
              <li>
                <div onClick={toggleCmtMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "cmt" ? "active" : ""}`}>
                  <FaTshirt className="icon" /> CMT
                  <span className={`arrow ${isCmtOpen ? "open" : ""}`}>{isCmtOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isCmtOpen && (
                  <ul className="dropdown-menu show">
                    {hasAccess("cmt:dashboard") && (
                      <li>
                        <Link to="dashboard-cmt" className={`dropdown-link ${activeMenu === "dashboard-cmt" ? "active" : ""}`} onClick={() => handleMenuClick("dashboard-cmt")}>
                          <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Dashboard CMT
                        </Link>
                      </li>
                    )}
                    {hasAccess("cmt:penjahit") && (
                      <li>
                        <Link to="penjahit" className={`dropdown-link ${activeMenu === "penjahit" ? "active" : ""}`} onClick={() => handleMenuClick("penjahit")}>
                          <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Daftar Penjahit
                        </Link>
                      </li>
                    )}
                    {hasAccess("cmt:pekerjaan_tersedia") && (
                      <li>
                        <Link to="kode-seri-belum-dikerjakan" className={`dropdown-link ${activeMenu === "kodeSeri" ? "active" : ""}`} onClick={() => handleMenuClick("kodeSeri")}>
                          <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pekerjaan Tersedia
                        </Link>
                      </li>
                    )}
                    {hasAccess("cmt:spk") && (
                      <li>
                        <Link to="spkcmt" className={`dropdown-link ${activeMenu === "spk" ? "active" : ""}`} onClick={() => handleMenuClick("spk")}>
                          <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SPK CMT
                        </Link>
                      </li>
                    )}

                    {role !== "penjahit" && (
                      <>
                        {hasAccess("cmt:data_dikerjakan") && (
                          <li>
                            <Link to="data-dikerjakan-pengiriman-cmt" className={`dropdown-link ${activeMenu === "dataDikerjakanPengiriman" ? "active" : ""}`} onClick={() => handleMenuClick("dataDikerjakanPengiriman")}>
                              <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Data Dikerjakan & Pengiriman
                            </Link>
                          </li>
                        )}
                        {hasAccess("cmt:pengiriman") && (
                          <li>
                            <Link to="pengiriman" className={`dropdown-link ${activeMenu === "pengiriman" ? "active" : ""}`} onClick={() => handleMenuClick("pengiriman")}>
                              <FaBox className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pengiriman
                            </Link>
                          </li>
                        )}
                        {hasAccess("cmt:hutang") && (
                          <li>
                            <Link to="hutang" className={`dropdown-link ${activeMenu === "hutang" ? "active" : ""}`} onClick={() => handleMenuClick("hutang")}>
                              <FaCreditCard className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hutang
                            </Link>
                          </li>
                        )}
                        {hasAccess("cmt:cashbon") && (
                          <li>
                            <Link to="cashbon" className={`dropdown-link ${activeMenu === "cashbon" ? "active" : ""}`} onClick={() => handleMenuClick("casbon")}>
                              <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Kasbon
                            </Link>
                          </li>
                        )}
                        {hasAccess("cmt:pendapatan") && (
                          <li>
                            <Link to="pendapatan" className={`dropdown-link ${activeMenu === "pendapatan" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatan")}>
                              <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pendapatan
                            </Link>
                          </li>
                        )}
                        {hasAccess("cmt:history_pendapatan") && (
                          <li>
                            <Link to="historyPendapatan" className={`dropdown-link ${activeMenu === "historyPendapatan" ? "active" : ""}`} onClick={() => handleMenuClick("historyPendapatan")}>
                              <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Pendapatan
                            </Link>
                          </li>
                        )}
                        {/* 
                        {hasAccess("cmt:deadline") && (
                          <li>
                            <Link to="deadline" className={`dropdown-link ${activeMenu === "deadline" ? "active" : ""}`} onClick={() => handleMenuClick("deadline")}>
                              <FaCalendarAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Log Deadline
                            </Link>
                          </li>
                        )}
                        {hasAccess("cmt:status") && (
                          <li>
                            <Link to="status" className={`dropdown-link ${activeMenu === "status" ? "active" : ""}`} onClick={() => handleMenuClick("status")}>
                              <FaClipboardCheck className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Log Status
                            </Link>
                          </li>
                        )}
                        {hasAccess("cmt:sku") && (
                          <li>
                            <Link to="sku" className={`dropdown-link ${activeMenu === "sku" ? "active" : ""}`} onClick={() => handleMenuClick("sku")}>
                              <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SKU
                            </Link>
                          </li>
                        )} 
                        */}
                      </>
                    )}
                  </ul>
                )}
              </li>
            )}

            {hasAccess("gudang_produk") && (
              <li>
                <div
                  onClick={toggleGudangProdukMenu}
                  className={`sidebar-link dropdown-toggle ${[
                    "master-gudang-produk",
                    "input-sku-gudang",
                    "scan-produk-masuk-gudang",
                    "stok-awal-gudang-produk",
                    "stok-lokasi-gudang",
                    "list-stok-product",
                    "mutasi-gudang-produk",
                    "history-mutasi-gudang",
                    "history-produk-gudang",
                    "history-stok-awal-gudang",
                    "history-produk-masuk-gudang",
                    "history-out-check-gudang",
                    "stok-opname-gudang",
                    "stok-opname-gudang",
                    "pencarian-seri-gudang",
                    "scan-sample",
                    "riwayat-sample",
                  ].includes(activeMenu)
                    ? "active"
                    : ""
                    }`}
                >
                  <FaShoppingBag className="icon" /> Gudang Produk
                  <span className={`arrow ${isGudangProdukOpen ? "open" : ""}`}>{isGudangProdukOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isGudangProdukOpen && (
                  <ul className="dropdown-menu show dropdown-menu-grouped">
                    <div className="dropdown-group-label">Master</div>
                    {hasAccess("gudang_produk:master_layout") && (
                      <li>
                        <Link to="master-gudang-produk" className={`dropdown-link ${activeMenu === "master-gudang-produk" ? "active" : ""}`} onClick={() => handleMenuClick("master-gudang-produk")}>
                          <FaWarehouse className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Layout Gudang
                        </Link>
                      </li>
                    )}

                    <div className="dropdown-group-label">Operasional</div>
                    {/* {hasAccess("gudang_produk:input_sku") && (
                      <li>
                        <Link to="input-sku-gudang" className={`dropdown-link ${activeMenu === "input-sku-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("input-sku-gudang")}>
                          <FaBox className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Input SKU Gudang
                        </Link>
                      </li>
                    )} */}
                    {hasAccess("gudang_produk:scan_masuk") && (
                      <li>
                        <Link to="scan-produk-masuk-gudang" className={`dropdown-link ${activeMenu === "scan-produk-masuk-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("scan-produk-masuk-gudang")}>
                          <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Scan Produk Masuk
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_produk:mutasi") && (
                      <li>
                        <Link to="mutasi-gudang-produk" className={`dropdown-link ${activeMenu === "mutasi-gudang-produk" ? "active" : ""}`} onClick={() => handleMenuClick("mutasi-gudang-produk")}>
                          <FaBoxOpen className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Mutasi Gudang
                        </Link>
                      </li>
                    )}
                    {/* {hasAccess("gudang_produk:picking_queue") && (
                      <li>
                        <Link to="picking-queue" className={`dropdown-link ${activeMenu === "picking-queue" ? "active" : ""}`} onClick={() => handleMenuClick("picking-queue")}>
                          <FaClipboardCheck className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Picking Queue
                        </Link>
                      </li>
                    )} */}

                    <div className="dropdown-group-label">Stok & Opname</div>
                    {hasAccess("gudang_produk:stok_awal") && (
                      <li>
                        <Link to="stok-awal-gudang-produk" className={`dropdown-link ${activeMenu === "stok-awal-gudang-produk" ? "active" : ""}`} onClick={() => handleMenuClick("stok-awal-gudang-produk")}>
                          <FaClipboardCheck className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Stok Awal
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_produk:stok_opname") && (
                      <li>
                        <Link to="stok-opname-gudang" className={`dropdown-link ${activeMenu === "stok-opname-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("stok-opname-gudang")}>
                          <FaClipboardCheck className="icon" style={{ fontSize: "12px", marginRight: "8px", color: "#a78bfa" }} /> Stok Opname
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_produk:stok_lokasi") && (
                      <li>
                        <Link to="stok-lokasi-gudang" className={`dropdown-link ${activeMenu === "stok-lokasi-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("stok-lokasi-gudang")}>
                          <FaLayerGroup className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Stok per Lokasi
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_produk:list_stok") && (
                      <li>
                        <Link to="list-stok-product" className={`dropdown-link ${activeMenu === "list-stok-product" ? "active" : ""}`} onClick={() => handleMenuClick("list-stok-product")}>
                          <FaBox className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Daftar Stok Produk
                        </Link>
                      </li>
                    )}

                    <div className="dropdown-group-label">History & Lainnya</div>
                    {hasAccess("gudang_produk:stok_opname") && (
                      <li>
                        <Link to="riwayat-stok-opname-gudang" className={`dropdown-link ${activeMenu === "riwayat-stok-opname-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("riwayat-stok-opname-gudang")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px", color: "#a78bfa" }} /> Riwayat Stok Opname
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_produk:history_mutasi") && (
                      <li>
                        <Link to="history-mutasi-gudang" className={`dropdown-link ${activeMenu === "history-mutasi-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("history-mutasi-gudang")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Mutasi
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_produk:history_produk") && (
                      <li>
                        <Link to="history-produk-gudang" className={`dropdown-link ${activeMenu === "history-produk-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("history-produk-gudang")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Produk
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_produk:history_stok_awal") && (
                      <li>
                        <Link to="history-stok-awal-gudang" className={`dropdown-link ${activeMenu === "history-stok-awal-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("history-stok-awal-gudang")}>
                          <FaClipboardCheck className="icon" style={{ fontSize: "12px", marginRight: "8px", color: "#a78bfa" }} /> Riwayat Stok Awal
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_produk:history_produk_masuk") && (
                      <li>
                        <Link to="history-produk-masuk-gudang" className={`dropdown-link ${activeMenu === "history-produk-masuk-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("history-produk-masuk-gudang")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Produk Masuk
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_produk:history_out_check") && (
                      <li>
                        <Link to="history-out-check-gudang" className={`dropdown-link ${activeMenu === "history-out-check-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("history-out-check-gudang")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Keluar Masuk
                        </Link>
                      </li>
                    )}
                    {hasAccess("gudang_produk:pencarian_seri") && (
                      <li>
                        <Link to="pencarian-seri-gudang" className={`dropdown-link ${activeMenu === "pencarian-seri-gudang" ? "active" : ""}`} onClick={() => handleMenuClick("pencarian-seri-gudang")}>
                          <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pencarian Seri
                        </Link>
                      </li>
                    )}

                    <div className="dropdown-group-label">Manajemen Sample</div>
                    {hasAccess("gudang_produk:sample") && (
                      <>
                        <li>
                          <Link to="scan-sample" className={`dropdown-link ${activeMenu === "scan-sample" ? "active" : ""}`} onClick={() => handleMenuClick("scan-sample")}>
                            <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Scan Sample (Pinjam/Kembali)
                          </Link>
                        </li>
                        <li>
                          <Link to="riwayat-sample" className={`dropdown-link ${activeMenu === "riwayat-sample" ? "active" : ""}`} onClick={() => handleMenuClick("riwayat-sample")}>
                            <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Sample Gudang
                          </Link>
                        </li>
                      </>
                    )}
                  </ul>
                )}
              </li>
            )}

            {hasAccess("packing") && (
              <li>
                <div
                  onClick={togglePackingMenu}
                  className={`sidebar-link dropdown-toggle ${["packing", "packing-belum-barcode", "packing-random", "packing-pendingan", "packing-no-data-ginee", "packing-inject", "logs", "seri", "monitoring", "packing-printed", "packing-daily-report", "packing-daily-packing-report"].includes(activeMenu) ? "active" : ""}`}
                >
                  <FaBoxOpen className="icon" /> Packing
                  <span className={`arrow ${isPackingOpen ? "open" : ""}`}>{isPackingOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isPackingOpen && (
                  <ul className="dropdown-menu show dropdown-menu-grouped">
                    <div className="dropdown-group-label">Operasional</div>
                    {hasAccess("packing:packing") && (
                      <li>
                        <Link to="packing" className={`dropdown-link ${activeMenu === "packing" ? "active" : ""}`} onClick={() => handleMenuClick("packing")}>
                          <FaBoxOpen className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Packing
                        </Link>
                      </li>
                    )}
                    {hasAccess("packing:random") && (
                      <li>
                        <Link to="packing-random" className={`dropdown-link ${activeMenu === "packing-random" ? "active" : ""}`} onClick={() => handleMenuClick("packing-random")}>
                          <FaBarcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Packing Random
                        </Link>
                      </li>
                    )}
                    {hasAccess("packing:pendingan") && (
                      <li>
                        <Link to="packing-pendingan" className={`dropdown-link ${activeMenu === "packing-pendingan" ? "active" : ""}`} onClick={() => handleMenuClick("packing-pendingan")}>
                          <FaClock className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Barang Pending
                        </Link>
                      </li>
                    )}
                    {hasAccess("packing:belum_barcode") && (
                      <li>
                        <Link to="packing-belum-barcode" className={`dropdown-link ${activeMenu === "packing-belum-barcode" ? "active" : ""}`} onClick={() => handleMenuClick("packing-belum-barcode")}>
                          <FaQrcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Produk Belum Barcode
                        </Link>
                      </li>
                    )}
                    {hasAccess("packing:no_data_ginee") && (
                      <li>
                        <Link to="packing-no-data-ginee" className={`dropdown-link ${activeMenu === "packing-no-data-ginee" ? "active" : ""}`} onClick={() => handleMenuClick("packing-no-data-ginee")}>
                          <FiAlertTriangle className="icon" style={{ fontSize: "12px", marginRight: "8px", color: "#f59e0b" }} /> No Data Ginee
                        </Link>
                      </li>
                    )}
                    {hasAccess("packing:inject") && (
                      <li>
                        <Link to="packing-inject" className={`dropdown-link ${activeMenu === "packing-inject" ? "active" : ""}`} onClick={() => handleMenuClick("packing-inject")}>
                          <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Inject Data
                        </Link>
                      </li>
                    )}
                    {hasAccess("packing:seri") && (
                      <li>
                        <Link to="seri" className={`dropdown-link ${activeMenu === "seri" ? "active" : ""}`} onClick={() => handleMenuClick("seri")}>
                          <FaQrcode className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Seri
                        </Link>
                      </li>
                    )}

                    <div className="dropdown-group-label">Monitoring &amp; Laporan</div>
                    {hasAccess("packing:logs") && (
                      <li>
                        <Link to="monitoring" className={`dropdown-link ${activeMenu === "monitoring" ? "active" : ""}`} onClick={() => handleMenuClick("monitoring")}>
                          <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Monitoring Harian
                        </Link>
                      </li>
                    )}
                    {hasAccess("packing:logs") && (
                      <li>
                        <Link to="packing-printed" className={`dropdown-link ${activeMenu === "packing-printed" ? "active" : ""}`} onClick={() => handleMenuClick("packing-printed")}>
                          <FaPrint className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Cetak vs Packing
                        </Link>
                      </li>
                    )}
                    {hasAccess("packing:logs") && (
                      <li>
                        <Link to="packing-daily-report" className={`dropdown-link ${activeMenu === "packing-daily-report" ? "active" : ""}`} onClick={() => handleMenuClick("packing-daily-report")}>
                          <FaCalendarAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Laporan Cetak Harian
                        </Link>
                      </li>
                    )}
                    {hasAccess("packing:logs") && (
                      <li>
                        <Link to="packing-daily-packing-report" className={`dropdown-link ${activeMenu === "packing-daily-packing-report" ? "active" : ""}`} onClick={() => handleMenuClick("packing-daily-packing-report")}>
                          <FaBoxOpen className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Laporan Packing Harian
                        </Link>
                      </li>
                    )}
                    {hasAccess("packing:logs") && (
                      <li>
                        <Link to="logs" className={`dropdown-link ${activeMenu === "logs" ? "active" : ""}`} onClick={() => handleMenuClick("logs")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Riwayat Scan
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}

            {hasAccess("return") && (
              <li>
                <div
                  onClick={toggleReturnMenu}
                  className={`sidebar-link dropdown-toggle ${["return", "return-logs"].includes(activeMenu) ? "active" : ""}`}
                >
                  <FaUndo className="icon" /> Retur
                  <span className={`arrow ${isReturnOpen ? "open" : ""}`}>{isReturnOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                </div>
                {isReturnOpen && (
                  <ul className="dropdown-menu show">
                    {hasAccess("return:return") && (
                      <li>
                        <Link to="return" className={`dropdown-link ${activeMenu === "return" ? "active" : ""}`} onClick={() => handleMenuClick("return")}>
                          <FaUndo className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Retur
                        </Link>
                      </li>
                    )}
                    {hasAccess("return:logs") && (
                      <li>
                        <Link to="return-logs" className={`dropdown-link ${activeMenu === "return-logs" ? "active" : ""}`} onClick={() => handleMenuClick("return-logs")}>
                          <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Log Retur
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}
            {role === "super-admin" && (
              <li>
                <Link to="/user-management" className={`sidebar-link ${activeMenu === "user-management" ? "active" : ""}`} onClick={() => handleMenuClick("user-management")}>
                  <FaUser className="icon" /> User Management
                </Link>
              </li>
            )}

            <li style={{ marginTop: "auto", paddingTop: "10px", borderTop: "1px solid var(--side-border)" }}>
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
