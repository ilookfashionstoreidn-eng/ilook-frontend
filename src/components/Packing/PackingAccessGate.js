import React, { useEffect, useState } from "react";
import { FiLock, FiShield, FiUnlock } from "react-icons/fi";
import {
  getPackingPasswordInfo,
  normalizePackingPassword,
} from "../../utils/packingPassword";
import "./Packing.css";

const PackingAccessGate = ({ children, menuKey, featureName = "Packing" }) => {
  const [now, setNow] = useState(() => new Date());
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const passwordInfo = getPackingPasswordInfo(menuKey, now);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setPassword("");
    setErrorMessage("");
    setIsUnlocked(false);
  }, [menuKey, passwordInfo.cycleId]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (normalizePackingPassword(password) !== passwordInfo.password) {
      setErrorMessage("Password salah.");
      setPassword("");
      return;
    }

    setErrorMessage("");
    setIsUnlocked(true);
  };

  if (isUnlocked) {
    return children;
  }

  return (
    <div className="pk-page pk-access-page">
      <div className="pk-access-shell">
        <section className="pk-access-panel">
          <div className="pk-access-icon">
            <FiShield />
          </div>
          <div className="pk-access-copy">
            <span className="pk-access-eyebrow">Akses Terbatas</span>
            <h1>{featureName}</h1>
           
          </div>

          <form className="pk-access-form" onSubmit={handleSubmit}>
            <label htmlFor="packing-access-password">Password Hari Ini</label>
            <div className="pk-access-input-row">
              <FiLock />
              <input
                id="packing-access-password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Masukkan password..."
                autoFocus
              />
            </div>

            {errorMessage && (
              <div className="pk-access-error">{errorMessage}</div>
            )}

            <button type="submit" className="btn-search-modern">
              <FiUnlock /> Masuk
            </button>
          </form>

          <div className="pk-access-meta">
            <span>Periode aktif</span>
            <strong>{passwordInfo.activeFrom}</strong>
            <small>Reset berikutnya: {passwordInfo.nextRotation}</small>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PackingAccessGate;
