import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import API from "../../api";
import { FaAsterisk, FaGoogle } from "react-icons/fa";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await API.post("/login", { email, password });

      const data = response.data;
      console.log("Data dari API:", data);

      // Simpan token dan role
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("foto", data.user.foto);
      // Simpan timestamp login untuk pengecekan expiry (1 minggu)
      localStorage.setItem("loginTimestamp", Date.now().toString());

      console.log("Role dari LocalStorage setelah disimpan:", localStorage.getItem("role"));

      // Arahkan ke halaman Home setelah login berhasil
      navigate("/home");
    } catch (error) {
      console.error("Error login:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        response: error.response,
        request: error.request,
      });

      let errorMessage = "Login Gagal: ";

      if (error.response) {
        // Server responded with error status
        errorMessage += error.response.data?.message || error.response.data?.error || error.message;
      } else if (error.request) {
        // Request was made but no response received
        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000/api";
        errorMessage += `Tidak ada respons dari server. Pastikan backend berjalan di ${apiUrl.replace("/api", "")}`;
      } else {
        // Error setting up request
        errorMessage += error.message || "Terjadi kesalahan saat mengirim request";
      }

      alert(errorMessage);
    }
  };

  return (
    <div className="login-page">
      {/* Left Column - Branding Section */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-logo-icon">
            <FaAsterisk />
          </div>
          <h1 className="login-greeting">Hello iLook! 👋</h1>
          <p className="login-tagline">Kelola produksi pakaian dengan efisien. Sistem manajemen terintegrasi untuk memudahkan proses dari bahan hingga produk jadi.</p>
        </div>
      </div>

      {/* Right Column - Login Form Section */}
      <div className="login-right">
        <div className="login-right-content">
          <h2 className="login-app-name">iLook</h2>
          <h3 className="login-welcome">Welcome Back!</h3>
          

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-form-group">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email atau Username" required className="login-input" />
            </div>

            <div className="login-form-group">
              <label className="login-label">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan password" required className="login-input" />
            </div>

            <button type="submit" className="login-button-primary">
              Login Now
            </button>

            

           
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
