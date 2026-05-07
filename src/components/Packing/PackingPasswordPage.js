import React, { useEffect, useMemo, useState } from "react";
import { FaRegCopy } from "react-icons/fa";
import { FiCheckCircle, FiClock, FiKey } from "react-icons/fi";
import { getAllPackingPasswords } from "../../utils/packingPassword";
import "./Packing.css";

const PackingPasswordPage = () => {
  const [now, setNow] = useState(() => new Date());
  const [copyStatus, setCopyStatus] = useState("");
  const passwordList = useMemo(() => getAllPackingPasswords(now), [now]);
  const activeInfo = passwordList[0];

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const handleCopyPassword = async (password, label) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopyStatus(`Password ${label} disalin`);
    } catch (error) {
      setCopyStatus("Gagal menyalin otomatis");
    }

    setTimeout(() => setCopyStatus(""), 1800);
  };

  return (
    <div className="pk-page pk-password-page">
      <div className="pk-password-shell">
        <section className="pk-password-hero">
          <div className="pk-password-title">
            <div className="pk-brand-icon">
              <FiKey />
            </div>
            <div>
              <span className="pk-access-eyebrow">Packing Access</span>
              <h1>Password Packing Hari Ini</h1>
              <p>
                {/* Setiap menu punya password berbeda. Saat pindah menu dan buka lagi,
                sistem akan minta password menu itu lagi. */}
              </p>
            </div>
          </div>

          <div className="pk-password-list">
            {passwordList.map((passwordInfo) => (
              <article key={passwordInfo.key} className="pk-password-code">
                <span>{passwordInfo.label}</span>
                <strong>{passwordInfo.password}</strong>
                <small>{passwordInfo.path}</small>
                <button
                  type="button"
                  className="btn-search-modern"
                  onClick={() =>
                    handleCopyPassword(passwordInfo.password, passwordInfo.label)
                  }
                >
                  <FaRegCopy /> Copy
                </button>
              </article>
            ))}
          </div>

          {copyStatus && (
            <div className="pk-access-success">
              <FiCheckCircle /> {copyStatus}
            </div>
          )}
        </section>

        <section className="pk-password-grid">
          <article className="pk-password-info">
            <div className="pk-kpi-head">
              <FiClock /> Periode Aktif
            </div>
            <strong>{activeInfo.activeDate}</strong>
            <small>Mulai: {activeInfo.activeFrom}</small>
          </article>

          <article className="pk-password-info">
            <div className="pk-kpi-head">
              <FiClock /> Ganti Password
            </div>
            <strong>Jam {String(activeInfo.rotationHour).padStart(2, "0")}.00</strong>
            <small>Berikutnya: {activeInfo.nextRotation}</small>
          </article>
        </section>
      </div>
    </div>
  );
};

export default PackingPasswordPage;
