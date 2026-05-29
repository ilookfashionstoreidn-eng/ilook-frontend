const fs = require('fs');

const filePath = 'd:/WINDU/NEXT/ilook-frontend/src/components/Layout/Layout.js';
let content = fs.readFileSync(filePath, 'utf-8');

const replacement = `            <li>
              <div onClick={toggleCuttingMenu} className={\`sidebar-link dropdown-toggle \${["dashboardCutting", "tukangCutting", "tukangPola", "markeran", "spkcutting", "hasilcutting", "laporanhasil", "historyhasilcutting", "historydistribusispk", "hutangc", "cashboanc", "pendapatancutting", "pendapatanhistory"].includes(activeMenu) ? "active" : ""}\`}>
                <FaCut className="icon" /> Cutting
                <span className={\`arrow \${isCuttingOpen ? "open" : ""}\`}>{\isCuttingOpen ? <FaChevronUp /> : <FaChevronDown />}</span>
              </div>
              {isCuttingOpen && (
                <ul className="dropdown-menu show dropdown-menu-grouped">
                  <div className="dropdown-group-label">Utama</div>
                  <li>
                    <Link to="dashboardCutting" className={\`dropdown-link \${activeMenu === "dashboardCutting" ? "active" : ""}\`} onClick={() => handleMenuClick("dashboardCutting")}>
                      <FaChartLine className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Dashboard Cutting
                    </Link>
                  </li>

                  <div className="dropdown-group-label">Master Data</div>
                  <li>
                    <Link to="tukangCutting" className={\`dropdown-link \${activeMenu === "tukangCutting" ? "active" : ""}\`} onClick={() => handleMenuClick("tukangCutting")}>
                      <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Tukang Cutting
                    </Link>
                  </li>
                  <li>
                    <Link to="tukangPola" className={\`dropdown-link \${activeMenu === "tukangPola" ? "active" : ""}\`} onClick={() => handleMenuClick("tukangPola")}>
                      <FaUser className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Tukang Pola
                    </Link>
                  </li>
                  <li>
                    <Link to="markeran" className={\`dropdown-link \${activeMenu === "markeran" ? "active" : ""}\`} onClick={() => handleMenuClick("markeran")}>
                      <FaRuler className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Markeran Produk
                    </Link>
                  </li>

                  <div className="dropdown-group-label">Operasional</div>
                  <li>
                    <Link to="spkcutting" className={\`dropdown-link \${activeMenu === "spkcutting" ? "active" : ""}\`} onClick={() => handleMenuClick("spkcutting")}>
                      <FaFileAlt className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> SPK
                    </Link>
                  </li>
                  <li>
                    <Link to="hasilcutting" className={\`dropdown-link \${activeMenu === "hasilcutting" ? "active" : ""}\`} onClick={() => handleMenuClick("hasilcutting")}>
                      <FaCheckSquare className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hasil
                    </Link>
                  </li>
                  <li>
                    <Link to="laporanhasil" className={\`dropdown-link \${activeMenu === "laporanhasil" ? "active" : ""}\`} onClick={() => handleMenuClick("laporanhasil")}>
                      <FaClipboardCheck className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Laporan Hasil
                    </Link>
                  </li>
                  <li>
                    <Link to="historyhasilcutting" className={\`dropdown-link \${activeMenu === "historyhasilcutting" ? "active" : ""}\`} onClick={() => handleMenuClick("historyhasilcutting")}>
                      <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> History Hasil Cutting
                    </Link>
                  </li>
                  <li>
                    <Link to="historydistribusispk" className={\`dropdown-link \${activeMenu === "historydistribusispk" ? "active" : ""}\`} onClick={() => handleMenuClick("historydistribusispk")}>
                      <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> History Distribusi SPK
                    </Link>
                  </li>

                  <div className="dropdown-group-label">Keuangan</div>
                  <li>
                    <Link to="hutangc" className={\`dropdown-link \${activeMenu === "hutangc" ? "active" : ""}\`} onClick={() => handleMenuClick("hutangc")}>
                      <FaCreditCard className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Hutang
                    </Link>
                  </li>
                  <li>
                    <Link to="cashboanc" className={\`dropdown-link \${activeMenu === "cashboanc" ? "active" : ""}\`} onClick={() => handleMenuClick("cashboanc")}>
                      <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Cashboan
                    </Link>
                  </li>
                  <li>
                    <Link to="pendapatancutting" className={\`dropdown-link \${activeMenu === "pendapatancutting" ? "active" : ""}\`} onClick={() => handleMenuClick("pendapatancutting")}>
                      <FaMoneyBillWave className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> Pendapatan
                    </Link>
                  </li>
                  <li>
                    <Link to="pendapatanhistory" className={\`dropdown-link \${activeMenu === "pendapatanhistory" ? "active" : ""}\`} onClick={() => handleMenuClick("pendapatanhistory")}>
                      <FaHistory className="icon" style={{ fontSize: "12px", marginRight: "8px" }} /> History Pendapatan
                    </Link>
                  </li>
                </ul>
              )}
            </li>`;

// Find the regex to replace the broken cutting block
const regex = /<li>\s*<div onClick={toggleCuttingMenu}[\s\S]*?<li>\s*<Link to="markeran"[\s\S]*?<\/li>\s*(<\/ul>\s*<\/div>\s*<\/li>)?\s*<li>\s*<div onClick={toggleJasaMenu}/m;

content = content.replace(regex, replacement + '\n            <li>\n              <div onClick={toggleJasaMenu}');

fs.writeFileSync(filePath, content);
console.log("Layout.js fixed!");
