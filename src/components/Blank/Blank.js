import React from "react";
import "./Blank.css";

const Blank = () => {
  return (
    <div className="blank-page">
      <div className="blank-shell">
        <aside className="blank-sidebar">
          <div className="brand">
            <div className="brand-dot" />
            <div>
              <h3>Drivergo</h3>
              <p>Logistics</p>
            </div>
          </div>

          <div className="menu-label">Main Menu</div>
          <button className="menu-item">Overview</button>
          <button className="menu-item active">Shipment</button>
          <button className="menu-item">Orders</button>
          <button className="menu-item">Message</button>
          <button className="menu-item">Activity</button>

          <div className="menu-label">General</div>
          <button className="menu-item">Report</button>
          <button className="menu-item">Support</button>
          <button className="menu-item">Account</button>

          <div className="sidebar-push" />

          <div className="menu-label">Others</div>
          <button className="menu-item">Settings</button>
          <button className="menu-item">Log out</button>
        </aside>

        <section className="blank-content">
          <header className="blank-topbar">
            <div className="blank-title-group">
              <h1>Shipment Track</h1>
              <button type="button">Status</button>
            </div>
            <div className="blank-actions">
              <button type="button">Search</button>
              <button type="button">Alert</button>
              <div className="blank-avatar" />
            </div>
          </header>

          <main className="blank-grid">
            <section className="blank-card">
              <h4>This month order</h4>
              <div className="dummy-bars" />
            </section>
            <section className="blank-card">
              <h4>Shipment success</h4>
              <div className="dummy-score">65%</div>
            </section>
            <section className="blank-card">
              <h4>Capacity</h4>
              <div className="dummy-bars small" />
            </section>

            <section className="blank-card">
              <h4>Caller</h4>
              <p>Darrell Steward</p>
            </section>
            <section className="blank-card">
              <h4>Tracking History</h4>
              <p>#12939-123-1330b</p>
            </section>
            <section className="blank-card tall">
              <h4>White Bengala Box</h4>
              <div className="truck-box">3D Truck Placeholder</div>
            </section>

            <section className="blank-card large">
              <h4>Route Map</h4>
              <div className="map-box">Map Placeholder</div>
            </section>
            <section className="blank-card">
              <h4>Package Details</h4>
              <div className="dummy-score">41.180</div>
            </section>
          </main>
        </section>
      </div>
    </div>
  );
};

export default Blank;
