import React, { useState, useEffect, useCallback } from "react";
import "./Layout.css";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { FaBars, FaTimes, FaHome, FaCogs, FaChevronDown, FaChevronUp } from "react-icons/fa";
import API from "../../api";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCmtOpen, setIsCmtOpen] = useState(false);
  const [isCuttingOpen, setIsCuttingOpen] = useState(false);
  const [isJasaOpen, setIsJasaOpen] = useState(false);
  const [isHppOpen, setIsHppOpen] = useState(false);
  const [isPackingOpen, setIsPackingOpen] = useState(false);

  const [isGudangOpen, setIsGudangOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("home");
  const [role, setRole] = useState("");
  const [isAksesorisOpen, setIsAksesorisOpen] = useState(false);

  const navigate = useNavigate();
  const handleLogout = useCallback(async () => {
    try {
      await API.post("/logout");
    } catch (error) {}
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

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    setIsSidebarOpen(false);
  };
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="layout-container">
      {/* Tombol Menu (hanya di mobile) */}
      <button className="menu-button" onClick={toggleSidebar}>
        {isSidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h3>ILOOK FASHION</h3>
        </div>
        <nav className="sidebar-menu">
          <ul>
            {role !== "penjahit" && (
              <li>
                <Link to="/home" className={`sidebar-link ${activeMenu === "home" ? "active" : ""}`} onClick={() => handleMenuClick("home")}>
                  <FaHome className="icon" /> DASHBOARD
                </Link>
              </li>
            )}
            <li>
              <div onClick={toggleCmtMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "cmt" ? "active" : ""}`}>
                <FaCogs className="icon" /> CMT
                <span className={`arrow ${isCmtOpen ? "open" : ""}`}>{isCmtOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isCmtOpen && (
                <ul className="dropdown-menu">
                  <li>
                    <Link to="penjahit" className={`dropdown-link ${activeMenu === "penjahit" ? "active" : ""}`} onClick={() => handleMenuClick("penjahit")}>
                      CMT
                    </Link>
                  </li>
                  <li>
                    <Link to="spkcmt" className={`dropdown-link ${activeMenu === "spk" ? "active" : ""}`} onClick={() => handleMenuClick("spk")}>
                      SPK
                    </Link>
                  </li>

                  <li>
                    <Link to="kinerja2" className={`dropdown-link ${activeMenu === "kinerja2" ? "active" : ""}`} onClick={() => handleMenuClick("kinerja2")}>
                      Kinerja
                    </Link>
                  </li>

                  {role !== "penjahit" && (
                    <>
                      <li>
                        <Link to="pengiriman" className={`dropdown-link ${activeMenu === "pengiriman" ? "active" : ""}`} onClick={() => handleMenuClick("pengiriman")}>
                          Pengiriman
                        </Link>
                      </li>
                      <li>
                        <Link to="hutang" className={`dropdown-link ${activeMenu === "hutang" ? "active" : ""}`} onClick={() => handleMenuClick("hutang")}>
                          Hutang
                        </Link>
                      </li>
                      <li>
                        <Link to="cashbon" className={`dropdown-link ${activeMenu === "cashbon" ? "active" : ""}`} onClick={() => handleMenuClick("casbon")}>
                          Casbon
                        </Link>
                      </li>
                      <li>
                        <Link to="pendapatan" className={`dropdown-link ${activeMenu === "pendapatan" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatan")}>
                          Pendapatan
                        </Link>
                      </li>
                      <li>
                        <Link to="historyPendapatan" className={`dropdown-link ${activeMenu === "historyPendapatan" ? "active" : ""}`} onClick={() => handleMenuClick("historyPendapatan")}>
                          History Pendapatan
                        </Link>
                      </li>
                      <li>
                        <Link to="deadline" className={`dropdown-link ${activeMenu === "deadline" ? "active" : ""}`} onClick={() => handleMenuClick("deadline")}>
                          Log Deadline
                        </Link>
                      </li>
                      <li>
                        <Link to="status" className={`dropdown-link ${activeMenu === "status" ? "active" : ""}`} onClick={() => handleMenuClick("status")}>
                          Log Status
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              )}
              <li>
                <li>
                  <div onClick={toggleAksesorisMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "aksesoris" ? "active" : ""}`}>
                    <FaCogs className="icon" /> Aksesoris
                    <span className={`arrow ${isAksesorisOpen ? "open" : ""}`}>{isAksesorisOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
                  </div>
                  {isAksesorisOpen && (
                    <ul className="dropdown-menu">
                      <li>
                        <Link to="aksesoris" className={`dropdown-link ${activeMenu === "aksesoris" ? "active" : ""}`} onClick={() => handleMenuClick("aksesoris")}>
                          Data Aksesoris
                        </Link>
                      </li>
                      <li>
                        <Link to="pembelianA" className={`dropdown-link ${activeMenu === "pembelianA" ? "active" : ""}`} onClick={() => handleMenuClick("pembelianA")}>
                          Pembelian Aksesoris Toko
                        </Link>
                      </li>

                      <li>
                        <Link to="petugas-c" className={`dropdown-link ${activeMenu === "petugas-c" ? "active" : ""}`} onClick={() => handleMenuClick("petugas-c")}>
                          Pembelian Aksesoris CMT
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
              </li>
            </li>
            <li>
              <div onClick={toggleCuttingMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "cutting" ? "active" : ""}`}>
                <FaCogs className="icon" /> CUTTING
                <span className={`arrow ${isCuttingOpen ? "open" : ""}`}>{isCuttingOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isCuttingOpen && (
                <ul className="dropdown-menu">
                  <li>
                    <Link to="tukangCutting" className={`dropdown-link ${activeMenu === "tukangCutting" ? "active" : ""}`} onClick={() => handleMenuClick("tukangCutting")}>
                      Tukang Cutting
                    </Link>
                  </li>

                  <li>
                    <Link to="markeran" className={`dropdown-link ${activeMenu === "markeran" ? "active" : ""}`} onClick={() => handleMenuClick("markeran")}>
                      Markeran Produk
                    </Link>
                  </li>
                  <li>
                    <Link to="spkcutting" className={`dropdown-link ${activeMenu === "spkcutting" ? "active" : ""}`} onClick={() => handleMenuClick("spkcutting")}>
                      SPK
                    </Link>
                  </li>
                  <li>
                    <Link to="hasilcutting" className={`dropdown-link ${activeMenu === "hasilcutting" ? "active" : ""}`} onClick={() => handleMenuClick("hasilcutting")}>
                      Hasil
                    </Link>
                  </li>
                  <li>
                    <Link to="hutangc" className={`dropdown-link ${activeMenu === "hutangc" ? "active" : ""}`} onClick={() => handleMenuClick("hutangc")}>
                      Hutang
                    </Link>
                  </li>
                  <li>
                    <Link to="cashboanc" className={`dropdown-link ${activeMenu === "cashboanc" ? "active" : ""}`} onClick={() => handleMenuClick("cashboanc")}>
                      Cashboan
                    </Link>
                  </li>

                  <li>
                    <Link to="pendapatancutting" className={`dropdown-link ${activeMenu === "pendapatancutting" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatancutting")}>
                      Pendapatan
                    </Link>
                  </li>
                  <li>
                    <Link to="pendapatanhistory" className={`dropdown-link ${activeMenu === "pendapatanhistory" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatanhistory")}>
                      History Pendapatan
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li>
              <div onClick={toggleJasaMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "jasa" ? "active" : ""}`}>
                <FaCogs className="icon" /> JASA
                <span className={`arrow ${isJasaOpen ? "open" : ""}`}>{isJasaOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isJasaOpen && (
                <ul className="dropdown-menu">
                  <li>
                    <Link to="tukangJasa" className={`dropdown-link ${activeMenu === "tukangJasa" ? "active" : ""}`} onClick={() => handleMenuClick("tukangJasa")}>
                      Tukang Jasa
                    </Link>
                  </li>

                  <li>
                    <Link to="spkjasa" className={`dropdown-link ${activeMenu === "spkjasa" ? "active" : ""}`} onClick={() => handleMenuClick("spkjasa")}>
                      Spk Jasa
                    </Link>
                  </li>

                  <li>
                    <Link to="hasiljasa" className={`dropdown-link ${activeMenu === "hasiljasa" ? "active" : ""}`} onClick={() => handleMenuClick("hasiljasa")}>
                      Hasil Jasa
                    </Link>
                  </li>

                  <li>
                    <Link to="cashboanjasa" className={`dropdown-link ${activeMenu === "cashboanjasa" ? "active" : ""}`} onClick={() => handleMenuClick("cashboanjasa")}>
                      Cashboan
                    </Link>
                  </li>

                  <li>
                    <Link to="hutangjasa" className={`dropdown-link ${activeMenu === "hutangjasa" ? "active" : ""}`} onClick={() => handleMenuClick("hutangjasa")}>
                      Hutang
                    </Link>
                  </li>

                  <li>
                    <Link to="pendapatanjasa" className={`dropdown-link ${activeMenu === "pendapatanjasa" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatanjasa")}>
                      Pendapatan
                    </Link>
                  </li>
                  <li>
                    <Link to="pendapatanhistoryjasa" className={`dropdown-link ${activeMenu === "pendapatanhistoryjasa" ? "active" : ""}`} onClick={() => handleMenuClick("pendapatanhistoryjasa")}>
                      History Pendapatan
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li>
              <div onClick={toggleHppMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "hpp" ? "active" : ""}`}>
                <FaCogs className="icon" /> Produk
                <span className={`arrow ${isHppOpen ? "open" : ""}`}>{isHppOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isHppOpen && (
                <ul className="dropdown-menu">
                  <li>
                    <Link to="hppProduk" className={`dropdown-link ${activeMenu === "hppProduk" ? "active" : ""}`} onClick={() => handleMenuClick("hppProduk")}>
                      Hpp Produk
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li>
              <div onClick={togglePackingMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "packing" ? "active" : ""}`}>
                <FaCogs className="icon" /> Packing
                <span className={`arrow ${isPackingOpen ? "open" : ""}`}>{isPackingOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isPackingOpen && (
                <ul className="dropdown-menu">
                  <li>
                    <Link to="packing" className={`dropdown-link ${activeMenu === "packing" ? "active" : ""}`} onClick={() => handleMenuClick("packing")}>
                      Packing
                    </Link>
                  </li>
                  <li>
                    <Link to="logs" className={`dropdown-link ${activeMenu === "logs" ? "active" : ""}`} onClick={() => handleMenuClick("logs")}>
                      History scan
                    </Link>
                  </li>
                  <li>
                    <Link to="seri" className={`dropdown-link ${activeMenu === "seri" ? "active" : ""}`} onClick={() => handleMenuClick("seri")}>
                      Seri
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li>
              <div onClick={toggleGudangMenu} className={`sidebar-link dropdown-toggle ${activeMenu === "hpp" ? "active" : ""}`}>
                <FaCogs className="icon" /> Gudang
                <span className={`arrow ${isGudangOpen ? "open" : ""}`}>{isGudangOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isGudangOpen && (
                <ul className="dropdown-menu">
                  <li>
                    <Link to="pabrik" className={`dropdown-link ${activeMenu === "pabrik" ? "active" : ""}`} onClick={() => handleMenuClick("pabrik")}>
                      Pabrik
                    </Link>
                  </li>
                  <li>
                    <Link to="gudang" className={`dropdown-link ${activeMenu === "gudang" ? "active" : ""}`} onClick={() => handleMenuClick("gudang")}>
                      Gudang
                    </Link>
                  </li>
                  <li>
                    <Link to="bahan" className={`dropdown-link ${activeMenu === "bahan" ? "active" : ""}`} onClick={() => handleMenuClick("bahan")}>
                      Bahan
                    </Link>
                  </li>
                  <li>
                    <Link to="pembelianBahan" className={`dropdown-link ${activeMenu === "pembelianBahan" ? "active" : ""}`} onClick={() => handleMenuClick("pembelianBahan")}>
                      Pembelian Bahan
                    </Link>
                  </li>
                  <li>
                    <Link to="scan-bahan" className={`dropdown-link ${activeMenu === "scan-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("scan-bahan")}>
                      Scan Bahan
                    </Link>
                  </li>
                  <li>
                    <Link to="stok-per-bahan" className={`dropdown-link ${activeMenu === "stok-per-bahan" ? "active" : ""}`} onClick={() => handleMenuClick("stok-per-bahan")}>
                      Stok Bahan
                    </Link>
                  </li>
                  <li>
                    <Link to="scan-stok-bahan-keluar" className={`dropdown-link ${activeMenu === "scan-stok-bahan-keluar" ? "active" : ""}`} onClick={() => handleMenuClick("scan-stok-bahan-keluar")}>
                      Scan Stok Bahan Keluar
                    </Link>
                  </li>
                  <li>
                    <Link to="riwayat-stok-bahan-keluar" className={`dropdown-link ${activeMenu === "riwayat-stok-bahan-keluar" ? "active" : ""}`} onClick={() => handleMenuClick("riwayat-stok-bahan-keluar")}>
                      Riwayat Stok Bahan Keluar
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li>
              <button className="sidebar-link" onClick={handleLogout}>
                Logout
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
