import React from "react";
import { Navigate, useNavigate, Outlet } from "react-router-dom";
import { FiShield, FiHome } from "react-icons/fi";
import "./MenuProtectedRoute.css";

const MenuProtectedRoute = ({ children, menuKey }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  
  let userMenus = [];
  try {
    userMenus = JSON.parse(localStorage.getItem("menus") || "[]");
  } catch (e) {
    userMenus = [];
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (role === "super-admin") {
    return children ? children : <Outlet />;
  }

  if (menuKey === "user-management") {
    return <AccessDeniedScreen navigate={navigate} />;
  }

  const hasAccess = userMenus.includes(menuKey) || 
                    (!menuKey.includes(":") && userMenus.some(m => m.startsWith(menuKey + ":")));

  if (!hasAccess) {
    return <AccessDeniedScreen navigate={navigate} />;
  }

  return children ? children : <Outlet />;
};

const AccessDeniedScreen = ({ navigate }) => {
  return (
    <div className="denied-page">
      <div className="denied-shell">
        <section className="denied-panel">
          <div className="denied-icon">
            <FiShield />
          </div>
          <div className="denied-copy">
            <span className="denied-eyebrow">Akses Terbatas</span>
            <h1>Akses Ditolak</h1>
            <p>
              Anda tidak memiliki izin untuk mengakses halaman ini. Halaman ini memerlukan hak akses khusus dari sistem. Silakan hubungi Superadmin Anda jika memerlukan akses ini.
            </p>
          </div>
          <button className="denied-home-btn" onClick={() => navigate("/home")}>
            <FiHome /> Kembali ke Dashboard
          </button>
        </section>
      </div>
    </div>
  );
};

export default MenuProtectedRoute;
