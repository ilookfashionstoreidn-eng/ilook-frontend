import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import API from "../../api";
import { FiActivity, FiLock, FiLogIn, FiMail, FiShield } from "react-icons/fi";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setErrorMessage("");

      const response = await API.post("/login", { email, password });
      const data = response.data;

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("foto", data.user.foto);
      localStorage.setItem("loginTimestamp", Date.now().toString());

      navigate("/home");
    } catch (error) {
      let message = "Login gagal. ";

      if (error.response) {
        message += error.response.data?.message || error.response.data?.error || error.message;
      } else if (error.request) {
        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000/api";
        message += `Tidak ada respons dari server. Pastikan backend berjalan di ${apiUrl.replace("/api", "")}`;
      } else {
        message += error.message || "Terjadi kesalahan saat mengirim request";
      }

      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-logo-icon">
            <FiActivity />
          </div>
          <h1 className="login-greeting">iLook System</h1>
          <p className="login-tagline">
            Sistem terintegrasi untuk memantau produksi, quality control, dan distribusi dalam satu alur kerja yang rapi.
          </p>
          
        </div>
      </div>

      <div className="login-right">
        <div className="login-right-content">
          <h2 className="login-app-name">ILOOK SYSTEM</h2>
          <h3 className="login-welcome">Masuk ke Dashboard </h3>
          <p className="login-helper">Gunakan akun operasional Anda untuk melanjutkan.</p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-form-group">
              <label className="login-label">Email</label>
              <div className="login-input-wrap">
                <FiMail className="login-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  required
                  className="login-input"
                />
              </div>
            </div>

            <div className="login-form-group">
              <label className="login-label">Password</label>
              <div className="login-input-wrap">
                <FiLock className="login-input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="login-input"
                />
              </div>
            </div>

            {errorMessage && <div className="login-error-box">{errorMessage}</div>}

            <button type="submit" className="login-button-primary" disabled={submitting}>
              <FiLogIn />
              {submitting ? "Memproses..." : "Masuk ke Sistem"}
            </button>
          </form>

          <div className="login-form-footer">
            <span>Butuh bantuan? Hubungi admin sistem</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
