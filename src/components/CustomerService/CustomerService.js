import React from "react";
import { Headphones } from "lucide-react";

const CustomerService = () => {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "70vh",
      gap: "16px",
      color: "#64748b",
    }}>
      <Headphones size={56} color="#155eef" strokeWidth={1.5} />
      <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#1e293b" }}>
        Customer Service
      </h2>
      <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8" }}>
        Halaman ini sedang dalam pengembangan.
      </p>
    </div>
  );
};

export default CustomerService;
