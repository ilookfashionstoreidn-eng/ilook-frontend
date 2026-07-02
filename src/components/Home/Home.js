import React, { useEffect, useState } from "react";
import "./Home.css";
import { FaLayerGroup } from "react-icons/fa";

const Home = () => {
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    // We can try to get some info about the logged in user to make it personal
    const role = localStorage.getItem("role");
    if (role) {
      setUserName(role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
    }
  }, []);

  return (
    <div className="home-welcome-wrapper">
      <div className="home-welcome-card">
        <div className="home-welcome-icon-container">
          <FaLayerGroup className="home-welcome-icon" />
        </div>
        <h1 className="home-welcome-title">Selamat Datang di ILOOK System</h1>
        <p className="home-welcome-subtitle">
          Halo <strong>{userName}</strong>, selamat datang kembali. <br/>
          Sistem manajemen terpadu ILOOK siap membantu alur kerja Anda hari ini. <br/>
          Silakan gunakan menu navigasi di sebelah kiri untuk memulai.
        </p>
      </div>
    </div>
  );
};

export default Home;