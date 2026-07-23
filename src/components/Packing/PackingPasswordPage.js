import React, { useEffect, useMemo, useState } from "react";
import { FaRegCopy, FaKey, FaClock, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { getAllPackingPasswords } from "../../utils/packingPassword";
import "../Cutting/SpkCutting/DashboardCutting.css"; // Reuse dashboard cutting CSS for layout
import "./Packing.css"; // Keep specific packing styles if any

const formatLongDate = (date) =>
  date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const PackingPasswordPage = () => {
  const [now, setNow] = useState(() => new Date());
  const [copyStatus, setCopyStatus] = useState("");
  const [statusType, setStatusType] = useState("success"); // 'success' or 'error'

  const passwordList = useMemo(() => getAllPackingPasswords(now), [now]);
  const allPasswordText = useMemo(
    () =>
      passwordList
        .map((passwordInfo) => `${passwordInfo.label} : ${passwordInfo.password}`)
        .join("\n"),
    [passwordList]
  );
  
  const activeInfo = passwordList[0];

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const showStatus = (message, type = "success") => {
    setCopyStatus(message);
    setStatusType(type);
    setTimeout(() => setCopyStatus("2000"), 2000);
  };

  const handleCopyPassword = async (password, label) => {
    try {
      await navigator.clipboard.writeText(password);
      showStatus(`Password ${label} berhasil disalin!`);
    } catch (error) {
      showStatus("Gagal menyalin otomatis", "error");
    }
  };

  const handleCopyAllPasswords = async () => {
    try {
      await navigator.clipboard.writeText(allPasswordText);
      showStatus("Semua password berhasil disalin!");
    } catch (error) {
      showStatus("Gagal menyalin otomatis", "error");
    }
  };

  return (
    <div className="ks-page dc-page">
      {/* Header matching DashboardCutting */}
      <header className="ks-header">
        <div className="ks-header-id">
          <div className="dc-title">
            <FaKey style={{ color: "var(--dc-purple)" }} />
            <h1>Password Packing Hari Ini</h1>
          </div>
          <span className="ks-header-sub">{formatLongDate(now)} — Akses operasional packing</span>
        </div>
        <div className="ks-header-actions">
          <button className="ks-btn is-primary" onClick={handleCopyAllPasswords}>
            <FaRegCopy />
            <span>Copy Semua Password</span>
          </button>
        </div>
      </header>

      <main className="dc-main">
        {/* Status Toast */}
        {copyStatus && (
          <div className="dc-error" style={{ marginBottom: "16px", backgroundColor: statusType === "success" ? "rgba(22, 163, 74, 0.08)" : "rgba(229, 72, 77, 0.08)", borderColor: statusType === "success" ? "rgba(22, 163, 74, 0.4)" : "rgba(229, 72, 77, 0.4)", color: statusType === "success" ? "#15803d" : "#b91c1c" }}>
            {statusType === "success" ? <FaCheckCircle /> : <FaExclamationTriangle />}
            <span>{copyStatus}</span>
          </div>
        )}

        {/* KPI Cards Row (Information) */}
        <section className="dc-kpi-row" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-blue"><FaClock /></span>
              <span className="dc-kpi-label">Periode Aktif</span>
            </div>
            <div className="dc-kpi-value">{activeInfo.activeDate}</div>
            <div className="dc-kpi-foot" style={{ marginTop: "8px" }}>
              Mulai: <strong>{activeInfo.activeFrom}</strong>
            </div>
          </div>

          <div className="dc-card dc-kpi">
            <div className="dc-kpi-head">
              <span className="dc-kpi-icon dc-i-orange"><FaClock /></span>
              <span className="dc-kpi-label">Jadwal Rotasi Berikutnya</span>
            </div>
            <div className="dc-kpi-value">Jam {String(activeInfo.rotationHour).padStart(2, "0")}.00</div>
            <div className="dc-kpi-foot" style={{ marginTop: "8px" }}>
              Perkiraan ganti: <strong>{activeInfo.nextRotation}</strong>
            </div>
          </div>
        </section>

        {/* Password List Grid */}
        <section className="dc-card" style={{ flex: 1 }}>
          <div className="dc-card-head" style={{ marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--ks-line)" }}>
            <span className="dc-card-title" style={{ fontSize: "14px" }}>Daftar Akses Menu Packing</span>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {passwordList.map((passwordInfo) => (
              <div 
                key={passwordInfo.key} 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  padding: "16px", 
                  borderRadius: "10px", 
                  border: "1px solid var(--ks-line)",
                  backgroundColor: "#fafafa"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--ks-text-soft)" }}>{passwordInfo.label}</span>
                  <strong style={{ fontSize: "20px", color: "var(--ks-text)", letterSpacing: "1px", fontFamily: "monospace" }}>
                    {passwordInfo.password}
                  </strong>
                  <span style={{ fontSize: "11px", color: "var(--ks-muted)" }}>Path: {passwordInfo.path}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyPassword(passwordInfo.password, passwordInfo.label)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    border: "1px solid var(--ks-line)",
                    backgroundColor: "#fff",
                    color: "var(--ks-text)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "var(--dc-blue)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--dc-blue)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.color = "var(--ks-text)"; e.currentTarget.style.borderColor = "var(--ks-line)"; }}
                  title="Copy Password"
                >
                  <FaRegCopy size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default PackingPasswordPage;
