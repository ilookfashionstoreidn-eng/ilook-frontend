import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Import file CSS
import API from "../../api";

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
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/path/to/logo.png" alt="" className="logo" />
          <h2>ILOOK ADMIN</h2>
          <p>Please input your email and password</p>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Username" required className="login-input" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="login-input" />
          <div className="login-options">
            <label>
              <input type="checkbox" />
              Remember this Device
            </label>
          </div>
          <button type="submit" className="login-button">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
